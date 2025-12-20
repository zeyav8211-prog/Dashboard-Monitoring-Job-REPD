
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { DashboardSummary } from './components/DashboardSummary';
import { JobManager } from './components/JobManager';
import { Login } from './components/Login';
import { TarifValidator } from './components/TarifValidator';
import { ReportSuratManager } from './components/ReportSuratManager';
import { ProduksiMasterManager } from './components/ProduksiMasterManager';
import { CompetitorManager } from './components/CompetitorManager';
import { Job, User, ValidationLog } from './types';
import { AUTHORIZED_USERS } from './constants';
import { driveApi } from './services/driveApi';
import { api as jsonBinApi } from './services/api';
import { WifiOff, Loader2 } from 'lucide-react';

type StorageProvider = 'GAS' | 'JSONBIN' | 'BOTH';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jne_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [storageProvider, setStorageProvider] = useState<StorageProvider>(() => {
    return (localStorage.getItem('jne_storage_provider') as StorageProvider) || 'GAS';
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const api = storageProvider === 'GAS' ? driveApi : jsonBinApi;
      const data = await api.getData();
      if (data) {
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setValidationLogs(Array.isArray(data.validationLogs) ? data.validationLogs : []);
        setConnectionError(false);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      // Fallback to local storage if available for basic jobs
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  }, [storageProvider]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 180000); // 3 menit sync
    return () => clearInterval(interval);
  }, [fetchData]);

  const saveToCloud = async (newJobs: Job[], newLogs: ValidationLog[]) => {
    setIsSaving(true);
    const payload = { jobs: newJobs, users: AUTHORIZED_USERS, validationLogs: newLogs };
    try {
        const api = storageProvider === 'GAS' ? driveApi : jsonBinApi;
        await api.saveData(payload);
    } catch (error) {
        console.error("Save error:", error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddJob = (job: Job) => {
    const newJobs = [job, ...jobs];
    const newLogs = [{ 
        id: crypto.randomUUID(), 
        timestamp: new Date().toISOString(), 
        user: currentUser?.name || 'User', 
        action: 'CREATE' as const, 
        description: `Tambah: ${job.jobType}`, 
        category: job.category 
    }, ...validationLogs];
    setJobs(newJobs);
    setValidationLogs(newLogs);
    saveToCloud(newJobs, newLogs);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    const newJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    setJobs(newJobs);
    saveToCloud(newJobs, validationLogs);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("Hapus data ini secara permanen?")) {
      const newJobs = jobs.filter(j => j.id !== id);
      setJobs(newJobs);
      saveToCloud(newJobs, validationLogs);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('jne_current_user', JSON.stringify(user));
  };

  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return jobs;
    return jobs.filter(j => j.createdBy === currentUser.email);
  }, [jobs, currentUser]);

  if (!currentUser) return <Login onLogin={handleLogin} users={AUTHORIZED_USERS} onResetPassword={async () => false} />;

  if (isLoading && jobs.length === 0) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-white/50 backdrop-blur-md">
            <Loader2 className="w-16 h-16 text-[#002F6C] animate-spin mb-6" />
            <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-[10px]">Inisialisasi Sistem JNE Dashboard...</p>
        </div>
    );
  }

  return (
    <Layout 
      activeCategory={activeCategory} 
      activeSubCategory={activeSubCategory} 
      onNavigate={(cat, sub) => { setActiveCategory(cat); setActiveSubCategory(sub); }}
      user={currentUser}
      onLogout={() => { setCurrentUser(null); localStorage.removeItem('jne_current_user'); }}
      onChangePassword={() => false}
    >
      {connectionError && (
        <div className="mb-8 bg-red-100/80 backdrop-blur-md border-2 border-red-200 text-red-700 px-8 py-4 rounded-[2rem] flex items-center gap-4 animate-pulse shadow-xl shadow-red-50">
          <WifiOff size={24} /> 
          <div>
            <p className="font-black uppercase text-xs tracking-widest leading-none">Offline Mode</p>
            <p className="text-[10px] font-bold opacity-70 mt-1 uppercase">Gagal terhubung ke Cloud Storage - Data mungkin tidak sinkron.</p>
          </div>
        </div>
      )}
      
      {activeCategory === 'Validasi' ? <TarifValidator category={activeSubCategory === 'Biaya Validasi' ? 'BIAYA' : 'TARIF'} /> :
       activeCategory === 'Kompetitor' ? <CompetitorManager subCategory={activeSubCategory || ''} currentUser={currentUser} /> :
       activeCategory === 'Report Surat' ? <ReportSuratManager subCategory={activeSubCategory || 'Summary'} jobs={visibleJobs} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} onDeleteJob={handleDeleteJob} onDeleteCancelled={()=>{}} onBulkAddJobs={(js) => { const n = [...js, ...jobs]; setJobs(n); saveToCloud(n, validationLogs); }} currentUser={currentUser} /> :
       activeCategory === 'Produksi Master Data' ? <ProduksiMasterManager category={activeCategory} subCategory={activeSubCategory || ''} jobs={visibleJobs} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} onDeleteJob={handleDeleteJob} currentUser={currentUser} onBulkAddJobs={(js) => { const n = [...js, ...jobs]; setJobs(n); saveToCloud(n, validationLogs); }} /> :
       activeCategory ? <JobManager category={activeCategory} subCategory={activeSubCategory || ''} jobs={visibleJobs} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} onDeleteJob={handleDeleteJob} onDeleteCancelled={()=>{}} onBulkAddJobs={(js) => { const n = [...js, ...jobs]; setJobs(n); saveToCloud(n, validationLogs); }} currentUser={currentUser} /> :
       <DashboardSummary 
          jobs={visibleJobs} 
          allJobs={jobs} 
          onDeleteJob={handleDeleteJob} 
          onBulkAddJobs={(js) => { const n = [...js, ...jobs]; setJobs(n); saveToCloud(n, validationLogs); }}
          isLoading={isLoading} 
          isSaving={isSaving} 
          storageProvider={storageProvider}
          onProviderChange={setStorageProvider}
          onForceSync={fetchData}
        />
      }
    </Layout>
  );
}
export default App;
