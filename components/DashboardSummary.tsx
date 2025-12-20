
import React, { useMemo, useState, useRef } from 'react';
import { Job, Status } from '../types';
import { MENU_STRUCTURE } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';
import { 
  CheckCircle2, Clock, LayoutDashboard, RefreshCcw, X, Briefcase, TrendingUp, Target, Trash2, Eye, Calendar, User as UserIcon, FileText, MapPin, Info, Download, Upload, FileType, AlertTriangle, Bell, PauseCircle, XCircle, HardDrive, ShieldCheck
} from 'lucide-react';

interface DashboardSummaryProps {
  jobs: Job[]; 
  allJobs?: Job[]; 
  onDeleteJob: (id: string) => void;
  onBulkAddJobs?: (jobs: Job[]) => void;
  isLoading?: boolean;
  isSaving?: boolean;
  storageProvider?: 'GAS' | 'JSONBIN' | 'BOTH';
  onProviderChange?: (provider: 'GAS' | 'JSONBIN' | 'BOTH') => void;
  onForceSync?: () => void;
  localSyncActive?: boolean;
  onConnectLocal?: () => void;
}

const COLORS = ['#EE2E24', '#002F6C', '#10B981', '#F59E0B', '#6366F1', '#94a3b8'];

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ 
    jobs, 
    allJobs = [],
    isLoading = false,
    storageProvider = 'GAS',
    onProviderChange,
    onForceSync,
    onBulkAddJobs,
    onDeleteJob,
    localSyncActive = false,
    onConnectLocal
}) => {
  const [drillDownFilter, setDrillDownFilter] = useState<{label: string, filter: (j: Job) => boolean} | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<Job | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const source = allJobs.length > 0 ? allJobs : jobs;
    
    const h0Jobs = source.filter(j => {
        if (['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status)) return false;
        const dl = new Date(j.deadline); dl.setHours(0,0,0,0);
        return dl.getTime() === today.getTime();
    });

    const h1Jobs = source.filter(j => {
        if (['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status)) return false;
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const dl = new Date(j.deadline); dl.setHours(0,0,0,0);
        return dl.getTime() === tomorrow.getTime();
    });

    return {
        total: source.length,
        completed: source.filter(j => ['Completed', 'DONE'].includes(j.status)).length,
        inProgress: source.filter(j => ['In Progress', 'On Proses'].includes(j.status)).length,
        hold: source.filter(j => j.status === 'Hold').length,
        cancel: source.filter(j => ['Cancel', 'Drop'].includes(j.status)).length,
        overdue: source.filter(j => {
            const dl = new Date(j.deadline); dl.setHours(0,0,0,0);
            return dl.getTime() < today.getTime() && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status);
        }).length,
        h0Count: h0Jobs.length,
        h1Count: h1Jobs.length
    };
  }, [allJobs, jobs]);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(MENU_STRUCTURE).forEach(cat => counts[cat] = 0);
    (allJobs.length > 0 ? allJobs : jobs).forEach(job => {
      if (counts[job.category] !== undefined) counts[job.category]++;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [allJobs, jobs]);

  const successRate = useMemo(() => {
    return stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  }, [stats]);

  const filteredDrillDownJobs = useMemo(() => {
    if (!drillDownFilter) return [];
    return (allJobs.length > 0 ? allJobs : jobs).filter(drillDownFilter.filter);
  }, [drillDownFilter, allJobs, jobs]);

  const handleStatClick = (label: string, filterFn: (j: Job) => boolean) => {
    setDrillDownFilter({ label, filter: filterFn });
  };

  const getStatusStyle = (status: Status) => {
    switch (status) {
      case 'Completed':
      case 'DONE': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': 
      case 'On Proses': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Hold': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Cancel':
      case 'Drop': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const downloadCSV = () => {
    const source = allJobs.length > 0 ? allJobs : jobs;
    const headers = ["ID", "Category", "SubCategory", "DateInput", "BranchDept", "JobType", "Status", "Deadline", "CreatedBy"];
    const csvContent = [
      headers.join(","),
      ...source.map(j => [
        j.id, j.category, j.subCategory, j.dateInput, j.branchDept, `"${j.jobType}"`, j.status, j.deadline, j.createdBy || 'System'
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Pekerjaan_Full_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r\n|\n/);
      const newJobs: Job[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 5) continue;
        newJobs.push({
          id: crypto.randomUUID(),
          category: cols[0],
          subCategory: cols[1],
          dateInput: cols[2],
          branchDept: cols[3],
          jobType: cols[4],
          status: (cols[5] as Status) || 'Pending',
          deadline: cols[6] || cols[2],
          createdBy: 'Import'
        } as Job);
      }
      if (newJobs.length > 0) onBulkAddJobs?.(newJobs);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert(`Berhasil mengimpor ${newJobs.length} data.`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* NOTIFICATION BAR */}
      {(stats.h0Count > 0 || stats.h1Count > 0) && (
        <div className="flex flex-col gap-3">
            {stats.h0Count > 0 && (
                <div 
                    onClick={() => handleStatClick('Deadline Hari Ini (H-0)', (j) => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const dl = new Date(j.deadline); dl.setHours(0,0,0,0);
                        return dl.getTime() === today.getTime() && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status);
                    })}
                    className="animate-blink-red p-4 rounded-[2rem] flex items-center justify-between cursor-pointer shadow-2xl border-2 border-red-500 hover:scale-[1.01] transition-transform"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 rounded-full"><AlertTriangle size={24} className="text-white" /></div>
                        <div>
                            <p className="text-white font-black uppercase text-[10px] tracking-widest">Peringatan Kritikal (H-0)</p>
                            <p className="text-white font-bold text-sm">Terdapat <span className="underline">{stats.h0Count} pekerjaan</span> yang harus selesai hari ini!</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-6 bg-[#EE2E24] rounded-[2rem] text-white shadow-2xl shadow-red-200">
            <LayoutDashboard size={42} />
          </div>
          <div>
            <h1 className="text-5xl font-black text-[#002F6C] tracking-tighter uppercase italic leading-none">
              Control <span className="text-[#EE2E24]">Center</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] mt-3">
              JNE Monitoring System - Master Dashboard
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex items-center gap-2 bg-white p-3 rounded-[2rem] shadow-xl border border-gray-100 transition-all hover:shadow-2xl">
                <div className={`p-2 rounded-full ${localSyncActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {localSyncActive ? <ShieldCheck size={20} /> : <HardDrive size={20} />}
                </div>
                <div className="mr-4">
                    <p className="text-[8px] font-black uppercase text-gray-400 leading-none">Local Server Backup</p>
                    <p className={`text-[10px] font-black uppercase ${localSyncActive ? 'text-green-600' : 'text-gray-400'}`}>
                        {localSyncActive ? 'Drive X: Connected' : 'Disconnected'}
                    </p>
                </div>
                {!localSyncActive && (
                    <button 
                        onClick={onConnectLocal}
                        className="px-4 py-2 bg-[#002F6C] text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-900 transition-all"
                    >
                        Connect X: Drive
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-[2rem] shadow-xl border border-gray-100">
                <button onClick={() => fileInputRef.current?.click()} title="Import Data CSV" className="p-3 text-orange-600 hover:bg-orange-50 rounded-full transition-all">
                    <Upload size={18} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImport} />
                <button onClick={downloadCSV} title="Export Semua Data" className="p-3 text-green-600 hover:bg-green-50 rounded-full transition-all">
                    <Download size={18} />
                </button>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-[2rem] shadow-xl border border-gray-100">
                <div className="flex gap-1 p-1 bg-gray-50 rounded-[1.5rem]">
                    {(['GAS', 'JSONBIN', 'BOTH'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => onProviderChange?.(p)}
                        className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${
                        storageProvider === p ? 'bg-[#002F6C] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {p}
                    </button>
                    ))}
                </div>
                <button onClick={onForceSync} className={`p-3 bg-gray-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all`}>
                    <RefreshCcw size={18} />
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Task', value: stats.total, icon: Briefcase, color: 'blue', filter: () => true },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'green', filter: (j: Job) => ['Completed', 'DONE'].includes(j.status) },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'amber', filter: (j: Job) => ['In Progress', 'On Proses'].includes(j.status) },
          { label: 'Overdue / Late', value: stats.overdue, icon: Target, color: 'red', filter: (j: Job) => {
              const today = new Date(); today.setHours(0,0,0,0);
              const dl = new Date(j.deadline); dl.setHours(0,0,0,0);
              return dl.getTime() < today.getTime() && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status);
          }},
          { label: 'Hold', value: stats.hold, icon: PauseCircle, color: 'indigo', filter: (j: Job) => j.status === 'Hold' },
          { label: 'Cancel', value: stats.cancel, icon: XCircle, color: 'gray', filter: (j: Job) => ['Cancel', 'Drop'].includes(j.status) }
        ].map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => handleStatClick(item.label, item.filter)}
            className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center transition-all group-hover:scale-110 ${
              item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              item.color === 'green' ? 'bg-green-50 text-green-600' :
              item.color === 'amber' ? 'bg-amber-50 text-amber-600' : 
              item.color === 'red' ? 'bg-red-50 text-red-600' :
              item.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'
            }`}>
              <item.icon size={24} />
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1">{item.label}</p>
            <p className="text-3xl font-black text-gray-800 tracking-tighter leading-none">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100">
          <div className="mb-12">
            <h3 className="text-2xl font-black uppercase italic flex items-center gap-3">
              <TrendingUp size={28} className="text-[#EE2E24]" />
              Workload <span className="text-[#EE2E24]">Distribution</span>
            </h3>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barData} 
                onClick={(data) => {
                   if (data && data.activeLabel) {
                     handleStatClick(String(data.activeLabel), (j) => j.category === String(data.activeLabel));
                   }
                }}
              >
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} tick={{fontWeight: '900', fill: '#94a3b8'}} interval={0} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc', radius: 20}} />
                <Bar dataKey="count" radius={[20, 20, 10, 10]} barSize={45} className="cursor-pointer">
                  {barData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#002F6C] p-12 rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col justify-between cursor-pointer group" onClick={() => handleStatClick('Success Rate', (j) => ['Completed', 'DONE'].includes(j.status))}>
          <div className="relative z-10 text-white">
            <h3 className="text-3xl font-black uppercase italic mb-10 leading-none">Efficiency <span className="text-[#EE2E24]">Score</span></h3>
            <div className="p-10 bg-white/10 backdrop-blur-xl rounded-[3rem] border border-white/20 shadow-2xl group-hover:bg-white/20 transition-all">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Success Rate</p>
                <div className="flex items-end gap-3">
                  <p className="text-8xl font-black leading-none tracking-tighter">{successRate}%</p>
                  <TrendingUp size={36} className="text-green-400 mb-2 animate-bounce" />
                </div>
                <div className="w-full bg-white/10 h-3 rounded-full mt-8 overflow-hidden">
                    <div className="bg-green-400 h-full transition-all duration-1000" style={{ width: `${successRate}%` }}></div>
                </div>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 opacity-10"><LayoutDashboard size={250} className="text-white" /></div>
        </div>
      </div>

      {/* DRILL DOWN MODAL */}
      {drillDownFilter && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden border-4 border-white/20">
                <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h4 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Listing: <span className="text-[#EE2E24]">{drillDownFilter.label}</span></h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Menampilkan {filteredDrillDownJobs.length} data pekerjaan</p>
                    </div>
                    <button onClick={() => setDrillDownFilter(null)} className="p-4 bg-white text-gray-400 hover:text-red-600 rounded-2xl shadow-xl hover:shadow-red-50 transition-all active:scale-95"><X size={28}/></button>
                </div>
                <div className="flex-1 overflow-auto p-10 scrollbar-hide">
                    <table className="w-full text-xs text-left border-separate border-spacing-y-4">
                        <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md rounded-2xl font-black uppercase text-gray-400 tracking-widest">
                            <tr>
                                <th className="p-6">Pekerjaan</th>
                                <th className="p-6">Kategori</th>
                                <th className="p-6">Unit</th>
                                <th className="p-6">Deadline</th>
                                <th className="p-6 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrillDownJobs.map((job) => (
                                <tr 
                                  key={job.id} 
                                  onClick={() => setSelectedJobDetail(job)}
                                  className="hover:bg-gray-50 transition-all group bg-white shadow-sm cursor-pointer"
                                >
                                    <td className="p-6 rounded-l-[2rem] border-y border-l border-gray-100">
                                        <div className="font-black text-gray-800 uppercase italic text-sm">{job.jobType}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{job.subCategory}</div>
                                    </td>
                                    <td className="p-6 border-y border-gray-100 font-bold text-gray-500 uppercase">{job.category}</td>
                                    <td className="p-6 border-y border-gray-100 font-black text-gray-800">{job.branchDept}</td>
                                    <td className="p-6 border-y border-gray-100 font-bold text-gray-500 italic">{new Date(job.deadline).toLocaleDateString()}</td>
                                    <td className="p-6 rounded-r-[2rem] border-y border-r border-gray-100 text-center">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${getStatusStyle(job.status)}`}>{job.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* JOB DETAIL MODAL */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-4 border-white/20">
              <div className="p-10 bg-[#002F6C] text-white flex justify-between items-start">
                  <div>
                    <span className="px-4 py-1.5 bg-[#EE2E24] rounded-full text-[10px] font-black uppercase tracking-widest">Detail Pekerjaan</span>
                    <h4 className="text-3xl font-black uppercase italic mt-4 leading-tight">{selectedJobDetail.jobType}</h4>
                    <p className="text-white/60 font-bold uppercase text-[10px] mt-2 tracking-widest">{selectedJobDetail.category} / {selectedJobDetail.subCategory}</p>
                  </div>
                  <button onClick={() => setSelectedJobDetail(null)} className="p-4 bg-white/10 hover:bg-[#EE2E24] text-white rounded-2xl transition-all shadow-xl"><X size={24}/></button>
              </div>
              <div className="p-12 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Cabang / Dept</p>
                        <p className="font-black text-gray-800 text-lg uppercase italic">{selectedJobDetail.branchDept}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserIcon size={14}/> Dibuat Oleh</p>
                        <p className="font-bold text-gray-600 truncate">{selectedJobDetail.createdBy || 'System'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Deadline</p>
                        <p className="font-black text-red-600 text-lg">{new Date(selectedJobDetail.deadline).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Status</p>
                        <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${getStatusStyle(selectedJobDetail.status)}`}>{selectedJobDetail.status}</span>
                      </div>
                  </div>
                  <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Info size={14}/> Deskripsi & Catatan</p>
                    <p className="text-gray-600 font-medium leading-relaxed">{selectedJobDetail.keterangan || 'Tidak ada keterangan tambahan.'}</p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => setSelectedJobDetail(null)} className="px-12 py-4 bg-[#002F6C] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-900 transition-all">Tutup Detail</button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
