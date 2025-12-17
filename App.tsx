
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { DashboardSummary } from './components/DashboardSummary';
import { JobManager } from './components/JobManager';
import { Login } from './components/Login';
import { TarifValidator } from './components/TarifValidator';
import { CompetitorAnalysis } from './components/CompetitorAnalysis';
import { ValidationHistory } from './components/ValidationHistory';
import { Job, User, ValidationLog } from './types';
import { AUTHORIZED_USERS, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, GOOGLE_SCRIPT_URL } from './constants';
import { api } from './services/api';
import { driveApi } from './services/driveApi';
import emailjs from '@emailjs/browser';
import { Database, Settings, CloudOff, Cloud, CheckCircle, Save } from 'lucide-react';

// Storage Key Constants
const STORAGE_MODE_KEY = 'jne_storage_mode'; // 'JSONBIN' | 'GAS' | 'LOCAL'
const DATA_KEY = 'jne_app_data_backup';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
        const saved = localStorage.getItem('jne_current_user');
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>(AUTHORIZED_USERS);
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Storage Configuration State
  // Default to GAS if no preference is saved, as we now have a valid link
  const [storageMode, setStorageMode] = useState<string>(() => localStorage.getItem(STORAGE_MODE_KEY) || 'GAS');
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [customScriptUrl, setCustomScriptUrl] = useState(() => localStorage.getItem('jne_custom_script_url') || '');

  // --- DATA LOADING LOGIC ---
  const loadData = useCallback(async () => {
    if (isSaving) return;
    
    // Offline Check
    if (!navigator.onLine) {
        setIsLoading(false);
        setConnectionError(true);
        return;
    }

    setIsLoading(true);

    // 1. Always load from LocalStorage first for instant UX
    const localData = localStorage.getItem(DATA_KEY);
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            setJobs(parsed.jobs || []);
            setUsers(parsed.users || AUTHORIZED_USERS);
            setValidationLogs(parsed.validationLogs || []);
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Local data corrupted", e);
        }
    }

    // 2. If Local Only mode, stop here
    if (storageMode === 'LOCAL') {
        setIsLoading(false);
        setConnectionError(false);
        return;
    }

    // 3. Try Fetching from Cloud to Sync
    try {
      let data = null;
      if (storageMode === 'GAS') {
          data = await driveApi.getData();
      } else {
          data = await api.getData();
      }

      if (data) {
        setConnectionError(false);
        
        // Merge Strategy: Simple overwrite from server implies server is truth
        // In a real app, you might want more complex merging logic
        if (data.jobs && Array.isArray(data.jobs)) setJobs(data.jobs);
        if (data.validationLogs && Array.isArray(data.validationLogs)) setValidationLogs(data.validationLogs);
        
        if (data.users && Array.isArray(data.users)) {
             // Preserve currently logged in session password if needed, but here we trust server
            const mergedUsers = AUTHORIZED_USERS.map(defaultUser => {
                const cloudUser = data.users.find((u: User) => u.email === defaultUser.email);
                return { ...defaultUser, password: cloudUser ? cloudUser.password : defaultUser.password };
            });
            setUsers(mergedUsers);
        }
        
        // Update Local Backup immediately after successful fetch
        localStorage.setItem(DATA_KEY, JSON.stringify({
            jobs: data.jobs || [],
            users: data.users || [],
            validationLogs: data.validationLogs || []
        }));

        setLastUpdated(new Date());
      }
    } catch (error) {
      // Quietly handle error, update UI indicator but don't spam console.error
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSaving, storageMode]);

  useEffect(() => {
    loadData();
    const intervalId = setInterval(loadData, 30000); // Sync every 30s instead of 5s to save quota
    return () => clearInterval(intervalId);
  }, [loadData]);

  // --- DATA SAVING LOGIC ---
  const saveToCloud = async (newJobs: Job[], newUsers: User[], newLogs: ValidationLog[]) => {
    setIsSaving(true);
    
    // 1. Optimistic Update (UI)
    setJobs(newJobs);
    setUsers(newUsers);
    setValidationLogs(newLogs);

    // 2. Save to Local Storage (Safety Net)
    const payload = { jobs: newJobs, users: newUsers, validationLogs: newLogs };
    localStorage.setItem(DATA_KEY, JSON.stringify(payload));

    // 3. If Local Only, we are done
    if (storageMode === 'LOCAL') {
        setLastUpdated(new Date());
        setIsSaving(false);
        return;
    }

    // 4. Save to Cloud
    try {
        let success = false;
        if (storageMode === 'GAS') {
            success = await driveApi.saveData(payload);
        } else {
            success = await api.saveData(payload);
        }
        
        if (success) {
            setLastUpdated(new Date());
            setConnectionError(false);
        } else {
            throw new Error("Save returned false");
        }
    } catch (error) {
        console.warn("Save failed (will retry next sync):", error);
        setConnectionError(true);
        // Do NOT alert user aggressively. The UI indicator is enough.
        // Data is safe in LocalStorage.
    } finally {
        setIsSaving(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('jne_current_user', JSON.stringify(currentUser));
      const freshUser = users.find(u => u.email === currentUser.email);
      if (freshUser && freshUser.password !== currentUser.password) {
        setCurrentUser(freshUser);
      }
    } else {
      localStorage.removeItem('jne_current_user');
    }
  }, [currentUser, users]);

  const createLog = (action: ValidationLog['action'], description: string, category?: string): ValidationLog => {
      return {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'Unknown',
          action,
          description,
          category
      };
  };

  const handleLogin = (user: User) => {
    const freshUserData = users.find(u => u.email === user.email) || user;
    setCurrentUser(freshUserData);
  };

  const handleResetPassword = async (email: string) => {
    const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (targetUser) {
        const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const updatedUser = { ...targetUser, password: resetToken };
        const updatedUserList = users.map(u => u.email === targetUser.email ? updatedUser : u);
        
        const newLog: ValidationLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: 'System',
            action: 'RESET_PASSWORD',
            description: `Reset password for user ${targetUser.email}`
        };
        const updatedLogs = [newLog, ...validationLogs];

        await saveToCloud(jobs, updatedUserList, updatedLogs);

        if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
            try {
                await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_TEMPLATE_ID,
                    {
                        to_name: targetUser.name,
                        to_email: targetUser.email, 
                        reset_token: resetToken,
                        password: resetToken,
                        otp: resetToken,
                        message: `Permintaan reset password diterima. Password baru Anda adalah: ${resetToken}.`
                    },
                    EMAILJS_PUBLIC_KEY
                );
                return { success: true, isMock: false };
            } catch (error: any) {
                console.error("Gagal mengirim email:", error);
                return { success: true, token: resetToken, isMock: true, errorMessage: error.text || "Email Error" };
            }
        } else {
            return { success: true, token: resetToken, isMock: true };
        }
    }
    return { success: false };
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveCategory(null);
    setActiveSubCategory(null);
  };

  const handleChangePassword = (oldPass: string, newPass: string) => {
    if (!currentUser) return false;
    const actualUser = users.find(u => u.email === currentUser.email) || currentUser;
    if (actualUser.password !== oldPass) return false;

    const updatedUser = { ...actualUser, password: newPass };
    const updatedUserList = users.map(u => u.email === actualUser.email ? updatedUser : u);
    
    saveToCloud(jobs, updatedUserList, validationLogs);
    setCurrentUser(updatedUser);
    return true;
  };

  const handleNavigate = (cat: string | null, sub: string | null) => {
    setActiveCategory(cat);
    setActiveSubCategory(sub);
  };

  const handleAddJob = (job: Job) => {
    const newJobs = [job, ...jobs];
    const newLog = createLog('CREATE', `Menambahkan pekerjaan baru: ${job.jobType} di ${job.branchDept}`, job.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    const oldJob = jobs.find(j => j.id === id);
    const newJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    
    let desc = `Update data pekerjaan`;
    if (oldJob) {
        if (updates.status && updates.status !== oldJob.status) {
            desc = `Mengubah status: ${oldJob.jobType} (${oldJob.branchDept}) dari ${oldJob.status} menjadi ${updates.status}`;
        } else if (updates.deadline && updates.deadline !== oldJob.deadline) {
            desc = `Mengubah dateline: ${oldJob.jobType} (${oldJob.branchDept}) menjadi ${updates.deadline}`;
        } else {
             desc = `Mengedit detail pekerjaan: ${oldJob.jobType} (${oldJob.branchDept})`;
        }
    }

    const newLog = createLog('UPDATE', desc, oldJob?.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus data ini?")) {
      const jobToDelete = jobs.find(j => j.id === id);
      const newJobs = jobs.filter(j => j.id !== id);
      
      const newLog = createLog('DELETE', `Menghapus pekerjaan: ${jobToDelete?.jobType} (${jobToDelete?.branchDept})`, jobToDelete?.category);
      saveToCloud(newJobs, users, [newLog, ...validationLogs]);
    }
  };

  const handleBulkAdd = (addedJobs: Job[]) => {
    const newJobs = [...addedJobs, ...jobs];
    const newLog = createLog('BULK_IMPORT', `Import masal ${addedJobs.length} data pekerjaan`, addedJobs[0]?.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleStorageChange = (mode: string) => {
      setStorageMode(mode);
      localStorage.setItem(STORAGE_MODE_KEY, mode);
      if (mode === 'GAS') {
          localStorage.setItem('jne_custom_script_url', customScriptUrl);
      }
      setShowStorageModal(false);
      loadData(); // Reload with new mode
  };

  const visibleJobs = useMemo(() => {
    return jobs;
  }, [jobs]);

  if (!currentUser) {
    return (
        <Login 
            onLogin={handleLogin} 
            users={users} 
            onResetPassword={handleResetPassword}
        />
    );
  }

  const renderContent = () => {
      if (activeCategory === 'Validasi') {
          if (activeSubCategory === 'Biaya Validasi') return <TarifValidator category="BIAYA" />;
          return <TarifValidator category="TARIF" />;
      }
      if (activeCategory === 'Kompetitor' && activeSubCategory) {
          return <CompetitorAnalysis subCategory={activeSubCategory} />;
      }
      if (!activeCategory || (activeCategory === 'Report Surat' && activeSubCategory === 'Summary')) {
          const isReportSuratSummary = activeCategory === 'Report Surat';
          const filteredJobs = isReportSuratSummary ? visibleJobs.filter(j => j.category === 'Report Surat') : visibleJobs;
          return (
            <DashboardSummary 
                jobs={filteredJobs} 
                onBulkAddJobs={handleBulkAdd}
                onUpdateJob={handleUpdateJob}
                isLoading={isLoading}
                isSaving={isSaving}
                lastUpdated={lastUpdated}
                connectionError={connectionError}
                currentUser={currentUser}
                customTitle={isReportSuratSummary ? "Summary Report Surat" : undefined}
            />
          );
      }
      if (activeSubCategory) {
          return (
            <JobManager 
                category={activeCategory}
                subCategory={activeSubCategory}
                jobs={visibleJobs}
                onAddJob={handleAddJob}
                onUpdateJob={handleUpdateJob}
                onDeleteJob={handleDeleteJob}
                onBulkAddJobs={handleBulkAdd}
                currentUser={currentUser}
            />
          );
      }
      return null;
  };

  return (
    <Layout 
      activeCategory={activeCategory} 
      activeSubCategory={activeSubCategory} 
      onNavigate={handleNavigate}
      user={currentUser}
      onLogout={handleLogout}
      onChangePassword={handleChangePassword}
    >
        {/* Header Status Bar */}
        <div className="flex justify-between items-center mb-4 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
           <div className="flex items-center text-sm text-gray-600 px-2">
               <span className="font-semibold mr-2">Status Penyimpanan:</span>
               {connectionError ? (
                   <span className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                       <CloudOff className="w-3 h-3 mr-1" />
                       {storageMode === 'LOCAL' ? 'Offline Mode (Aman)' : 'Gagal Sync Cloud (Data Tersimpan Lokal)'}
                   </span>
               ) : (
                    <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                       <CheckCircle className="w-3 h-3 mr-1" />
                       {isSaving ? 'Menyimpan...' : 'Tersimpan & Terhubung'}
                   </span>
               )}
           </div>
           
           <button 
                onClick={() => setShowStorageModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
           >
               <Database className="w-3 h-3" />
               {storageMode === 'GAS' ? 'Google Script' : storageMode === 'LOCAL' ? 'Local Only' : 'Demo Server'}
               <Settings className="w-3 h-3 ml-1 text-gray-400" />
           </button>
        </div>

      {renderContent()}

      {/* STORAGE CONFIG MODAL */}
      {showStorageModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="bg-[#002F6C] p-4 flex justify-between items-center text-white">
                      <h3 className="font-bold flex items-center gap-2">
                          <Database className="w-5 h-5" /> Konfigurasi Penyimpanan
                      </h3>
                      <button onClick={() => setShowStorageModal(false)} className="hover:text-gray-300">Close</button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          Pilih metode penyimpanan data Anda. Untuk penggunaan jangka panjang, disarankan menggunakan <strong>Google Apps Script</strong>.
                      </p>

                      <div className="space-y-4">
                          {/* Option 1: Demo Server */}
                          <div 
                              onClick={() => setStorageMode('JSONBIN')}
                              className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${storageMode === 'JSONBIN' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                          >
                              <div className={`mt-1 p-1 rounded-full ${storageMode === 'JSONBIN' ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">Demo Server (JSONBin)</h4>
                                  <p className="text-xs text-gray-500 mt-1">Server publik gratis dengan limitasi. Data bisa dihapus sewaktu-waktu. Gunakan hanya untuk testing.</p>
                              </div>
                          </div>

                          {/* Option 2: Google Script */}
                          <div 
                              onClick={() => setStorageMode('GAS')}
                              className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${storageMode === 'GAS' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-300'}`}
                          >
                               <div className={`mt-1 p-1 rounded-full ${storageMode === 'GAS' ? 'bg-green-600' : 'bg-gray-200'}`}>
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-gray-800">Google Apps Script (Pribadi)</h4>
                                  <p className="text-xs text-gray-500 mt-1">Simpan data di Google Drive/Sheet Anda sendiri. Aman, Gratis, Tanpa Limit.</p>
                                  
                                  {storageMode === 'GAS' && (
                                      <div className="mt-3 animate-in fade-in">
                                          <label className="block text-xs font-bold text-gray-700 mb-1">Masukkan URL Web App Google Script Anda:</label>
                                          <input 
                                            type="text" 
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:border-green-500 focus:outline-none"
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                            value={customScriptUrl || GOOGLE_SCRIPT_URL}
                                            onChange={(e) => setCustomScriptUrl(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <p className="text-[10px] text-gray-400 mt-1 italic">Pastikan script dideploy sebagai 'Web App' dengan akses 'Anyone'.</p>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Option 3: Local Only */}
                          <div 
                              onClick={() => setStorageMode('LOCAL')}
                              className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${storageMode === 'LOCAL' ? 'border-gray-500 bg-gray-50 ring-1 ring-gray-500' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                               <div className={`mt-1 p-1 rounded-full ${storageMode === 'LOCAL' ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">Local Only (Offline)</h4>
                                  <p className="text-xs text-gray-500 mt-1">Data hanya disimpan di browser komputer ini. Tidak perlu internet, tapi data tidak bisa diakses dari komputer lain.</p>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                            onClick={() => handleStorageChange(storageMode)}
                            className="px-6 py-2 bg-[#002F6C] text-white rounded-lg font-bold hover:bg-blue-900 transition flex items-center gap-2"
                          >
                              <Save className="w-4 h-4" /> Simpan Pengaturan
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </Layout>
  );
}

export default App;

