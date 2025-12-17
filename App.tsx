
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
import { Database, Settings, CloudOff, Cloud, CheckCircle, Save, Wifi, WifiOff, RefreshCw, UploadCloud, FileJson } from 'lucide-react';

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
  const [storageMode, setStorageMode] = useState<string>(() => localStorage.getItem(STORAGE_MODE_KEY) || 'GAS');
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [customScriptUrl, setCustomScriptUrl] = useState(() => localStorage.getItem('jne_custom_script_url') || '');
  const [isMigrating, setIsMigrating] = useState(false);

  // --- DATA LOADING LOGIC ---
  const loadData = useCallback(async (isManualRetry = false) => {
    if (isSaving) return;
    
    // Offline Check
    if (!navigator.onLine) {
        setIsLoading(false);
        setConnectionError(true);
        return;
    }

    if (isManualRetry) setIsLoading(true);

    // 1. Always load from LocalStorage first for instant UX (Persistence)
    const localData = localStorage.getItem(DATA_KEY);
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            // Update local state immediately if empty, or if we are in local mode
            if (jobs.length === 0 || storageMode === 'LOCAL') {
                setJobs(parsed.jobs || []);
                setUsers(parsed.users || AUTHORIZED_USERS);
                setValidationLogs(parsed.validationLogs || []);
                if (storageMode === 'LOCAL') setLastUpdated(new Date());
            }
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
        
        // Merge Strategy: Cloud is authority
        if (data.jobs && Array.isArray(data.jobs)) setJobs(data.jobs);
        if (data.validationLogs && Array.isArray(data.validationLogs)) setValidationLogs(data.validationLogs);
        
        if (data.users && Array.isArray(data.users)) {
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
      // Quietly handle error, update UI indicator
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSaving, storageMode, jobs.length]); 

  useEffect(() => {
    loadData();
    const intervalId = setInterval(() => loadData(), 30000); 
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
      loadData(true); // Force reload with new mode
  };

  // Fungsi untuk memuat data contoh (Demo Data) jika kosong
  const handleLoadSampleData = () => {
    const dummyJobs: Job[] = [
        { id: crypto.randomUUID(), category: 'Penyesuaian', subCategory: 'Publish Rate', dateInput: new Date().toISOString().split('T')[0], branchDept: 'KANTOR PUSAT', jobType: 'Update Tarif Reguler 2024', status: 'In Progress', deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], createdBy: currentUser?.email, keterangan: 'Menunggu validasi IT' },
        { id: crypto.randomUUID(), category: 'Report Surat', subCategory: 'Email Masuk', dateInput: new Date().toISOString().split('T')[0], branchDept: 'JNE MEDAN', jobType: 'Komplain Kiriman Corporate', status: 'Pending', deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], createdBy: currentUser?.email, keterangan: 'Email dari PT Maju Jaya', picUser: 'Budi', jenisPengajuan: 'Komplain', picRepd: 'Ani' },
        { id: crypto.randomUUID(), category: 'Request Data', subCategory: 'Nasional', dateInput: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], branchDept: 'SALES', jobType: 'Data Penjualan Q1', status: 'Completed', deadline: new Date().toISOString().split('T')[0], createdBy: currentUser?.email, keterangan: 'Sudah dikirim via email' },
        { id: crypto.randomUUID(), category: 'Problem', subCategory: 'SLA', dateInput: new Date().toISOString().split('T')[0], branchDept: 'OPS', jobType: 'Keterlambatan Rute SUB-CGK', status: 'Overdue', deadline: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], createdBy: currentUser?.email, keterangan: 'Perlu investigasi mendalam' },
    ];
    setJobs(dummyJobs);
    
    // Update local immediately
    localStorage.setItem(DATA_KEY, JSON.stringify({ jobs: dummyJobs, users, validationLogs }));
    alert("Data Contoh berhasil dimuat! Klik tombol 'Simpan Data Layar ke Google Sheet' untuk menyimpannya secara permanen ke database.");
  };

  // Fungsi Migrasi: Upload data state saat ini (local/demo) ke GAS
  const handleMigrateToGAS = async () => {
    if (!customScriptUrl && !GOOGLE_SCRIPT_URL) {
        alert("Masukkan URL Google Script terlebih dahulu!");
        return;
    }
    
    // Simpan URL sementara agar driveApi menggunakan URL yang baru diketik
    localStorage.setItem('jne_custom_script_url', customScriptUrl);
    
    setIsMigrating(true);
    try {
        // Kita kirim data yang ada di MEMORY (jobs, users, logs) ke Script
        const success = await driveApi.saveData({ jobs, users, validationLogs });
        if (success) {
            alert("SUKSES! Semua data yang ada di layar berhasil disalin ke Google Sheet.");
            // Otomatis pindah mode
            setStorageMode('GAS');
            localStorage.setItem(STORAGE_MODE_KEY, 'GAS');
            setLastUpdated(new Date());
            setConnectionError(false);
            setShowStorageModal(false);
        } else {
            alert("Gagal upload. Pastikan URL benar, deployment 'Web App' sudah 'Anyone', dan script tidak error.");
        }
    } catch (e) {
        alert("Error saat migrasi: " + e);
    } finally {
        setIsMigrating(false);
    }
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
                connectionError={connectionError}
                lastUpdated={lastUpdated}
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

  // Status Badge Logic - Enhanced for better UX
  let statusBadge;
  if (connectionError) {
      if (storageMode === 'LOCAL') {
          statusBadge = (
              <span className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 text-xs font-medium">
                <Database className="w-3 h-3 mr-1.5" />
                Offline Mode (Local)
              </span>
          );
      } else if (jobs.length > 0 || users.length > 0) {
          // FRIENDLIER UI: If we have data, don't show scary red error. Show warning/offline mode.
          statusBadge = (
              <span className="flex items-center text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 text-xs font-medium animate-in fade-in" title="Koneksi cloud terganggu, namun data tersimpan aman di browser (Lokal).">
                <WifiOff className="w-3 h-3 mr-1.5" />
                Mode Offline (Data Lokal Aktif)
              </span>
          );
      } else {
          // Critical Error (No Data & No Connection)
          statusBadge = (
              <span className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 text-xs font-medium animate-pulse">
                <Wifi className="w-3 h-3 mr-1.5" />
                Gagal Terhubung
              </span>
          );
      }
  } else {
       statusBadge = (
          <span className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 text-xs font-medium">
             <Cloud className="w-3 h-3 mr-1.5" />
             {isSaving ? 'Menyimpan...' : 'Terhubung ke Cloud'}
          </span>
       );
  }

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
        <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-3">
               {statusBadge}
               
               {/* Last Updated Info */}
               {lastUpdated && (
                   <span className={`text-xs ${connectionError ? 'text-amber-600/70' : 'text-gray-400'} hidden md:inline-block`}>
                       Update Terakhir: {lastUpdated.toLocaleTimeString()}
                   </span>
               )}

               {/* Manual Reconnect Button - Only show if error */}
               {connectionError && (
                   <button 
                    onClick={() => loadData(true)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100 transition-colors"
                   >
                       <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                       Reconnect
                   </button>
               )}
           </div>
           
           <button 
                onClick={() => setShowStorageModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
           >
               <Settings className="w-3 h-3 text-gray-400" />
               {storageMode === 'GAS' ? 'Google Script' : storageMode === 'LOCAL' ? 'Local Only' : 'Demo Server'}
           </button>
        </div>

      {renderContent()}

      {/* STORAGE CONFIG MODAL */}
      {showStorageModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <div className="bg-[#002F6C] p-4 flex justify-between items-center text-white">
                      <h3 className="font-bold flex items-center gap-2">
                          <Database className="w-5 h-5" /> Konfigurasi Penyimpanan
                      </h3>
                      <button onClick={() => setShowStorageModal(false)} className="hover:text-gray-300">Close</button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          Pilih tempat penyimpanan data aplikasi Anda.
                      </p>

                      <div className="space-y-4">
                          {/* Option 2: Google Script */}
                          <div 
                              onClick={() => setStorageMode('GAS')}
                              className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${storageMode === 'GAS' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-300'}`}
                          >
                               <div className={`mt-1 p-1 rounded-full ${storageMode === 'GAS' ? 'bg-green-600' : 'bg-gray-200'}`}>
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-gray-800">Google Apps Script (Recommended)</h4>
                                  <p className="text-xs text-gray-500 mt-1">Simpan data di Google Sheet pribadi Anda. Gratis & Aman.</p>
                                  
                                  {storageMode === 'GAS' && (
                                      <div className="mt-3 animate-in fade-in space-y-3">
                                          <div>
                                              <label className="block text-xs font-bold text-gray-700 mb-1">URL Web App Google Script:</label>
                                              <input 
                                                type="text" 
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:border-green-500 focus:outline-none"
                                                placeholder="https://script.google.com/macros/s/.../exec"
                                                value={customScriptUrl || GOOGLE_SCRIPT_URL}
                                                onChange={(e) => setCustomScriptUrl(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                          </div>
                                          
                                          {/* MIGRATION BUTTON */}
                                          <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex flex-col gap-2">
                                             <p className="text-[10px] text-orange-800 font-medium">
                                                {jobs.length > 0 
                                                    ? "Ada data di layar saat ini. Klik tombol di bawah untuk menyalinnya ke Google Sheet baru Anda."
                                                    : "Data masih kosong. Muat data contoh (dummy) dahulu jika ingin tes upload."
                                                }
                                             </p>
                                             
                                             <div className="flex gap-2">
                                                {jobs.length === 0 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleLoadSampleData(); }}
                                                        className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200 transition flex items-center justify-center gap-1"
                                                    >
                                                        <FileJson className="w-3 h-3" />
                                                        Muat Data Contoh
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMigrateToGAS(); }}
                                                    disabled={isMigrating || jobs.length === 0}
                                                    className="flex-1 py-2 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {isMigrating ? <RefreshCw className="w-3 h-3 animate-spin"/> : <UploadCloud className="w-3 h-3"/>}
                                                    Simpan Data Layar ke Google Sheet
                                                </button>
                                             </div>
                                          </div>
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
                                  <p className="text-xs text-gray-500 mt-1">Hanya di browser ini. Tidak butuh internet.</p>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                            onClick={() => handleStorageChange(storageMode)}
                            className="px-6 py-2 bg-[#002F6C] text-white rounded-lg font-bold hover:bg-blue-900 transition flex items-center gap-2"
                          >
                              <Save className="w-4 h-4" /> Simpan Konfigurasi
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

