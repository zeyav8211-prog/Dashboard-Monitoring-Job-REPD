
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { DashboardSummary } from './components/DashboardSummary';
import { JobManager } from './components/JobManager';
import { Login } from './components/Login';
import { TarifValidator } from './components/TarifValidator';
import { ReportSuratManager } from './components/ReportSuratManager';
import { ProduksiMasterManager } from './components/ProduksiMasterManager';
import { CompetitorManager } from './components/CompetitorManager';
import { Job, User, ValidationLog, Status } from './types';
import { AUTHORIZED_USERS } from './constants';
import { driveApi } from './services/driveApi';
import { api as jsonBinApi } from './services/api';
import { WifiOff } from 'lucide-react';

type StorageProvider = 'GAS' | 'JSONBIN' | 'BOTH';

interface MergedData {
  jobs: Job[];
  validationLogs: ValidationLog[];
  users: User[];
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jne_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [storageProvider, setStorageProvider] = useState<StorageProvider>(() => {
    return (localStorage.getItem('jne_storage_provider') as StorageProvider) || 'GAS';
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

  const mergeDatasets = (gasData: any, binData: any): MergedData => {
    const jobMap = new Map<string, Job>();
    const gasJobs: Job[] = Array.isArray(gasData?.jobs) ? gasData.jobs : [];
    const binJobs: Job[] = Array.isArray(binData?.jobs) ? binData.jobs : [];
    [...gasJobs, ...binJobs].forEach((j: Job) => { if (j && j.id) jobMap.set(j.id, j); });

    const logMap = new Map<string, ValidationLog>();
    const gasLogs: ValidationLog[] = Array.isArray(gasData?.validationLogs) ? gasData.validationLogs : [];
    const binLogs: ValidationLog[] = Array.isArray(binData?.validationLogs) ? binData.validationLogs : [];
    [...gasLogs, ...binLogs].forEach((l: ValidationLog) => { if (l && l.id) logMap.set(l.id, l); });

    const userMap = new Map<string, User>();
    const gasUsers: User[] = Array.isArray(gasData?.users) ? gasData.users : [];
    const binUsers: User[] = Array.isArray(binData?.users) ? binData.users : [];
    [...gasUsers, ...binUsers].forEach((u: User) => { if (u && u.email) userMap.set(u.email.toLowerCase(), u); });

    return {
      jobs: Array.from(jobMap.values()),
      validationLogs: Array.from(logMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      users: Array.from(userMap.values())
    };
  };

  const fetchData = useCallback(async () => {
    if (isSaving) return;
    try {
      let finalData: MergedData | null = null;
      if (storageProvider === 'BOTH') {
        const [gasRes, binRes] = await Promise.allSettled([driveApi.getData(), jsonBinApi.getData()]);
        const gasData = gasRes.status === 'fulfilled' ? gasRes.value : null;
        const binData = binRes.status === 'fulfilled' ? binRes.value : null;
        if (!gasData && !binData) throw new Error("Connection failed");
        finalData = mergeDatasets(gasData, binData);
      } else {
        const api = storageProvider === 'GAS' ? driveApi : jsonBinApi;
        const data = await api.getData();
        if (data) {
          finalData = {
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            validationLogs: Array.isArray(data.validationLogs) ? data.validationLogs : [],
            users: Array.isArray(data.users) ? data.users : []
          };
        }
      }

      if (finalData) {
        setJobs(finalData.jobs);
        setValidationLogs(finalData.validationLogs);
        const mergedUsers = AUTHORIZED_USERS.map((defaultUser: User) => {
            const cloudUser = finalData!.users.find((u: User) => u.email.toLowerCase() === defaultUser.email.toLowerCase());
            return { ...defaultUser, password: cloudUser ? cloudUser.password : defaultUser.password };
        });
        setUsers(mergedUsers);
        setLastUpdated(new Date());
        setConnectionError(false);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSaving, storageProvider]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const saveToCloud = async (newJobs: Job[], newUsers: User[], newLogs: ValidationLog[]) => {
    setIsSaving(true);
    const payload = { jobs: newJobs, users: newUsers, validationLogs: newLogs };
    try {
        let success = false;
        if (storageProvider === 'BOTH') {
            const [gasRes, binRes] = await Promise.allSettled([driveApi.saveData(payload), jsonBinApi.saveData(payload)]);
            success = (gasRes.status === 'fulfilled' && gasRes.value) || (binRes.status === 'fulfilled' && binRes.value);
        } else {
            const api = storageProvider === 'GAS' ? driveApi : jsonBinApi;
            success = await api.saveData(payload);
        }
        if (success) {
            setLastUpdated(new Date());
            setConnectionError(false);
        } else {
            setConnectionError(true);
        }
    } catch (error) {
        setConnectionError(true);
    } finally {
        setIsSaving(false);
    }
  };

  const handleProviderChange = (newProvider: StorageProvider) => {
    setStorageProvider(newProvider);
    localStorage.setItem('jne_storage_provider', newProvider);
    setIsLoading(true);
    fetchData();
  };

  const createLog = (action: ValidationLog['action'], description: string, category?: string): ValidationLog => ({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Unknown',
      action,
      description,
      category
  });

  const handleAddJob = (job: Job) => {
    const newJobs = [job, ...jobs];
    const newLog = createLog('CREATE', `Tambah: ${job.jobType}`, job.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    const oldJob = jobs.find(j => j.id === id);
    const newJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    const newLog = createLog('UPDATE', `Update: ${oldJob?.jobType}`, oldJob?.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("Hapus data ini?")) {
      const jobToDelete = jobs.find(j => j.id === id);
      const newJobs = jobs.filter(j => j.id !== id);
      const newLog = createLog('DELETE', `Hapus: ${jobToDelete?.jobType}`, jobToDelete?.category);
      saveToCloud(newJobs, users, [newLog, ...validationLogs]);
    }
  };

  const handleBulkAdd = (addedJobs: Job[]) => {
    const newJobs = [...addedJobs, ...jobs];
    const newLog = createLog('BULK_IMPORT', `Import ${addedJobs.length} data`, addedJobs[0]?.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    const actualUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (actualUser?.role === 'Admin') return jobs;
    return jobs.filter(job => !job.createdBy || job.createdBy.toLowerCase() === currentUser.email.toLowerCase());
  }, [jobs, currentUser, users]);

  if (!currentUser) return <Login onLogin={setCurrentUser} users={users} onResetPassword={async () => false} />;

  return (
    <Layout 
      activeCategory={activeCategory} 
      activeSubCategory={activeSubCategory} 
      onNavigate={(cat, sub) => { setActiveCategory(cat); setActiveSubCategory(sub); }}
      user={currentUser}
      onLogout={() => {
        setCurrentUser(null);
        localStorage.removeItem('jne_current_user');
      }}
      onChangePassword={() => false}
    >
      {connectionError && (
        <div className="mb-6 bg-red-100 border-2 border-red-200 text-red-700 px-6 py-4 rounded-[2rem] flex items-center gap-3 animate-pulse">
          <WifiOff size={20} /> <span className="font-bold uppercase text-xs italic tracking-tighter">Koneksi Cloud Terganggu - Mode Offline Aktif</span>
        </div>
      )}
      
      {activeCategory === 'Validasi' ? <TarifValidator category={activeSubCategory === 'Biaya Validasi' ? 'BIAYA' : 'TARIF'} /> :
       activeCategory === 'Kompetitor' ? <CompetitorManager subCategory={activeSubCategory || ''} currentUser={currentUser} /> :
       activeCategory === 'Report Surat' ? (
         <ReportSuratManager 
           subCategory={activeSubCategory || 'Summary'} 
           jobs={visibleJobs} 
           onAddJob={handleAddJob} 
           onUpdateJob={handleUpdateJob} 
           onDeleteJob={handleDeleteJob} 
           onDeleteCancelled={() => {}} 
           onBulkAddJobs={handleBulkAdd}
           currentUser={currentUser} 
         />
       ) :
       activeCategory === 'Produksi Master Data' ? (
         <ProduksiMasterManager
           category={activeCategory}
           subCategory={activeSubCategory || ''}
           jobs={visibleJobs}
           onAddJob={handleAddJob}
           onUpdateJob={handleUpdateJob}
           onDeleteJob={handleDeleteJob}
           /* Fix: Add missing onBulkAddJobs prop */
           onBulkAddJobs={handleBulkAdd}
           currentUser={currentUser}
         />
       ) :
       activeCategory ? <JobManager category={activeCategory} subCategory={activeSubCategory || ''} jobs={visibleJobs} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} onDeleteJob={handleDeleteJob} onDeleteCancelled={() => {}} onBulkAddJobs={handleBulkAdd} currentUser={currentUser} /> :
       <DashboardSummary 
          jobs={visibleJobs} 
          allJobs={jobs} 
          onDeleteJob={handleDeleteJob} 
          onBulkAddJobs={handleBulkAdd}
          isLoading={isLoading} 
          isSaving={isSaving} 
          storageProvider={storageProvider}
          onProviderChange={handleProviderChange}
          onForceSync={fetchData}
        />
      }
    </Layout>
  );
}
export default App;
