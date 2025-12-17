
import React, { useMemo, useState, useRef } from 'react';
import { Job, Status, User } from '../types';
import { MENU_STRUCTURE } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  AlertCircle, CheckCircle2, Clock, CalendarDays, Upload, FileDown, 
  ArrowLeft, Search, RefreshCw, Cloud, WifiOff, PauseCircle, XCircle, 
  Tag, MapPin, X, FileText, User as UserIcon, AlertTriangle, TrendingUp,
  Activity, Briefcase
} from 'lucide-react';

interface DashboardSummaryProps {
  jobs: Job[];
  onBulkAddJobs: (jobs: Job[]) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  isLoading?: boolean;
  isSaving?: boolean;
  connectionError?: boolean;
  lastUpdated?: Date | null;
  currentUser: User;
  customTitle?: string;
}

const COLORS = ['#0088FE', '#FFBB28', '#00C49F', '#EE2E24', '#8884d8', '#9CA3AF'];

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ 
    jobs, 
    onBulkAddJobs,
    onUpdateJob,
    isLoading = false,
    isSaving = false,
    connectionError = false,
    lastUpdated = null,
    currentUser,
    customTitle
}) => {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'Completed').length;
    const pending = jobs.filter(j => j.status === 'Pending').length;
    const inProgress = jobs.filter(j => j.status === 'In Progress').length;
    const hold = jobs.filter(j => j.status === 'Hold').length;
    const cancel = jobs.filter(j => j.status === 'Cancel').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueJobs = jobs.filter(j => {
      const deadline = new Date(j.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today && j.status !== 'Completed' && j.status !== 'Cancel' && j.status !== 'Hold';
    });

    const warningJobs = jobs.filter(j => {
        if (j.status === 'Completed' || j.status === 'Cancel' || j.status === 'Hold') return false;
        const deadline = new Date(j.deadline);
        deadline.setHours(0, 0, 0, 0);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 1;
    });

    // Calculate Completion Rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { 
        total, completed, pending, inProgress, hold, cancel, 
        overdue: overdueJobs.length, overdueList: overdueJobs,
        warning: warningJobs.length, warningList: warningJobs,
        completionRate
    };
  }, [jobs]);

  const pieData = [
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Completed', value: stats.completed },
    { name: 'Hold', value: stats.hold },
    { name: 'Cancel', value: stats.cancel },
  ].filter(item => item.value > 0);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(MENU_STRUCTURE).forEach(cat => counts[cat] = 0);
    
    jobs.forEach(job => {
      if (counts[job.category] !== undefined) {
        counts[job.category] = (counts[job.category] || 0) + 1;
      } else {
        counts[job.category] = (counts[job.category] || 0) + 1;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key]
    }));
  }, [jobs]);

  // Handle File Upload & Template Download (Same as before but cleaner code if needed)
  const handleDownloadTemplate = () => {
    const headers = "Kategori,Sub Kategori,Tanggal Input (YYYY-MM-DD),Cabang/Dept,Nama Pekerjaan,Status,Deadline (YYYY-MM-DD),Keterangan";
    const exampleRow = "Penyesuaian,Publish Rate,2024-03-20,Jakarta,Update Tarif,Pending,2024-03-25,Catatan Tambahan";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleRow;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_Global_Upload.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r\n|\n/);
      const newJobs: Job[] = [];
      
      for(let i=1; i<lines.length; i++) {
        if(!lines[i] || !lines[i].trim()) continue;
        const cols = lines[i].split(/,|;/); 
        if (cols.length >= 7 && cols[0] && cols[1]) {
            const rawStatus = cols[5]?.trim();
            let validStatus: Status = 'Pending';
            const allowedStatuses = ['In Progress', 'Completed', 'Overdue', 'Hold', 'Cancel'];
            if (allowedStatuses.includes(rawStatus)) validStatus = rawStatus as Status;

            newJobs.push({
                id: crypto.randomUUID(),
                category: cols[0]?.trim(),
                subCategory: cols[1]?.trim(),
                dateInput: cols[2]?.trim() || new Date().toISOString().split('T')[0],
                branchDept: cols[3]?.trim() || 'Unknown',
                jobType: cols[4]?.trim() || 'Imported Job',
                status: validStatus,
                deadline: cols[6]?.trim() || new Date().toISOString().split('T')[0],
                keterangan: cols[7]?.trim() || '',
                createdBy: currentUser.email 
            });
        }
      }
      if (newJobs.length > 0) {
          onBulkAddJobs(newJobs);
          alert(`Berhasil mengimport ${newJobs.length} data pekerjaan secara global!`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const filteredList = useMemo(() => {
    if (!filterStatus) return [];
    let result = jobs;
    const today = new Date();
    today.setHours(0,0,0,0);

    if (filterStatus === 'Overdue') {
        result = jobs.filter(j => {
            const d = new Date(j.deadline);
            d.setHours(0,0,0,0);
            return d < today && j.status !== 'Completed' && j.status !== 'Cancel' && j.status !== 'Hold';
        });
    } else if (filterStatus === 'Warning') {
        result = jobs.filter(j => {
             if (j.status === 'Completed' || j.status === 'Cancel' || j.status === 'Hold') return false;
             const deadline = new Date(j.deadline);
             deadline.setHours(0,0,0,0);
             const diffTime = deadline.getTime() - today.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             return diffDays >= 0 && diffDays <= 1;
        });
    } else if (filterStatus === 'In Progress') {
        result = jobs.filter(j => j.status === 'In Progress' || j.status === 'Pending');
    } else if (Object.keys(MENU_STRUCTURE).includes(filterStatus)) {
        result = jobs.filter(j => j.category === filterStatus);
    } else if (filterStatus !== 'Total') {
        result = jobs.filter(j => j.status === filterStatus);
    }

    if (searchTerm) {
        result = result.filter(j => 
            j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || 
            j.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    return result;
  }, [jobs, filterStatus, searchTerm]);

  const canEditJob = (job: Job) => currentUser.role === 'Admin' || job.createdBy === currentUser.email;

  const getStatusColor = (status: Status, deadline: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(deadline);
    d.setHours(0,0,0,0);

    if (status === 'Hold') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (status === 'Cancel') return 'bg-gray-100 text-gray-600 border-gray-200';
    if (d < today && status !== 'Completed') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'Completed') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'In Progress') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Modern Stat Card Component
  const ModernStatCard = ({ title, value, subtext, icon: Icon, colorClass, bgClass, onClick }: any) => (
    <div 
        onClick={onClick}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 rounded-bl-3xl ${bgClass} w-24 h-24 -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
            {subtext && <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{subtext}</span>}
        </div>
        
        <div className="relative z-10">
            <h3 className="text-3xl font-bold text-gray-800 mb-1">{value}</h3>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
        </div>
    </div>
  );

  // --- VIEW: DETAIL FILTER ---
  if (filterStatus) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setFilterStatus(null)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Detail: <span className="text-[#002F6C]">{filterStatus === 'Total' ? 'Semua Pekerjaan' : filterStatus}</span>
                        </h2>
                        <p className="text-sm text-gray-500">Menampilkan {filteredList.length} data pekerjaan</p>
                    </div>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari data..." 
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-600 border-b border-gray-200 font-medium">
                            <tr>
                                <th className="p-4">Kategori</th>
                                <th className="p-4">Tanggal Input</th>
                                <th className="p-4">Cabang</th>
                                <th className="p-4">Nama Pekerjaan</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Deadline</th>
                                <th className="p-4">Owner</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredList.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-gray-400">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                filteredList.map(job => (
                                    <tr 
                                        key={job.id} 
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedJob(job)}
                                    >
                                        <td className="p-4">
                                            <div className="font-bold text-gray-700">{job.category}</div>
                                            <div className="text-xs text-gray-500">{job.subCategory}</div>
                                        </td>
                                        <td className="p-4 text-gray-600">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                                        <td className="p-4 font-medium text-gray-800">{job.branchDept}</td>
                                        <td className="p-4 text-gray-700">{job.jobType}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(job.status, job.deadline)}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-medium ${new Date() > new Date(job.deadline) && job.status !== 'Completed' ? 'text-red-600' : 'text-gray-600'}`}>
                                                {new Date(job.deadline).toLocaleDateString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">{job.createdBy?.split('@')[0]}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Reusing Job Detail Modal from previous component logic if needed, simplified here */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#002F6C] p-6 text-white relative">
                             <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
                             <h2 className="text-xl font-bold pr-8">{selectedJob.jobType}</h2>
                             <p className="text-blue-200 text-sm mt-1">{selectedJob.branchDept}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><label className="text-xs text-gray-500">Kategori</label><p className="font-medium">{selectedJob.category}</p></div>
                                <div><label className="text-xs text-gray-500">Status</label>
                                    <div className="mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(selectedJob.status, selectedJob.deadline)}`}>{selectedJob.status}</span>
                                    </div>
                                </div>
                                <div><label className="text-xs text-gray-500">Deadline</label><p className="font-medium">{new Date(selectedJob.deadline).toLocaleDateString()}</p></div>
                                <div><label className="text-xs text-gray-500">Owner</label><p className="font-medium truncate">{selectedJob.createdBy}</p></div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                <label className="text-xs text-gray-500 block mb-1">Keterangan</label>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.keterangan || '-'}</p>
                            </div>
                            {canEditJob(selectedJob) && (
                                <div className="pt-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Quick Update Status</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {['Pending', 'In Progress', 'Completed'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => { onUpdateJob(selectedJob.id, {status: s as Status}); setSelectedJob(null); }}
                                                className={`px-3 py-1 rounded-full text-xs border transition ${selectedJob.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  // --- VIEW: MAIN DASHBOARD ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. HEADER SECTION */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-[#002F6C] to-[#00509E]"></div>
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="relative z-10 p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="text-white space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-5 h-5 text-blue-300" />
                      <span className="text-blue-200 text-sm font-medium tracking-wide">WORKSPACE</span>
                  </div>
                  <h1 className="text-3xl font-bold">{customTitle || "Dashboard Monitoring Pekerjaan"}</h1>
                  <p className="text-blue-100 opacity-90 max-w-xl">
                      Selamat datang kembali, <strong>{currentUser.name}</strong>. Berikut adalah ringkasan performa dan status pekerjaan tim Anda hari ini.
                  </p>
                  
                  <div className="flex items-center gap-3 pt-2">
                      <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${connectionError ? 'bg-orange-500/20 border-orange-400 text-orange-100' : 'bg-green-500/20 border-green-400 text-green-100'}`}>
                          {connectionError ? (
                              <>
                                  <WifiOff className="w-3 h-3 mr-1.5" />
                                  Local Mode (Offline)
                              </>
                          ) : (
                              <>
                                  <Cloud className="w-3 h-3 mr-1.5" />
                                  Cloud Connected
                              </>
                          )}
                      </div>
                      {lastUpdated && <span className="text-xs text-blue-200/80">Last Sync: {lastUpdated.toLocaleTimeString()}</span>}
                  </div>
              </div>

              <div className="flex gap-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                  <button onClick={handleDownloadTemplate} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition backdrop-blur-md flex items-center gap-2">
                      <FileDown className="w-4 h-4" /> Template
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-white text-[#002F6C] hover:bg-blue-50 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Upload Global
                  </button>
              </div>
          </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <ModernStatCard 
              title="Total Pekerjaan" 
              value={stats.total} 
              icon={Briefcase} 
              colorClass="text-blue-600" 
              bgClass="bg-blue-100" 
              onClick={() => setFilterStatus('Total')}
          />
           <ModernStatCard 
              title="Selesai" 
              value={stats.completed} 
              subtext={`${stats.completionRate}% Rate`}
              icon={CheckCircle2} 
              colorClass="text-green-600" 
              bgClass="bg-green-100" 
              onClick={() => setFilterStatus('Completed')}
          />
           <ModernStatCard 
              title="Dalam Proses" 
              value={stats.pending + stats.inProgress} 
              icon={Clock} 
              colorClass="text-yellow-600" 
              bgClass="bg-yellow-100" 
              onClick={() => setFilterStatus('In Progress')}
          />
           <ModernStatCard 
              title="Overdue" 
              value={stats.overdue} 
              icon={AlertCircle} 
              colorClass="text-red-600" 
              bgClass="bg-red-100" 
              onClick={() => setFilterStatus('Overdue')}
          />
      </div>

      {/* 3. ALERTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.overdue > 0 && (
            <div onClick={() => setFilterStatus('Overdue')} className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start gap-4 cursor-pointer hover:bg-red-100 transition shadow-sm group">
                <div className="bg-red-200 p-3 rounded-xl text-red-600 group-hover:scale-110 transition">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-red-800 text-lg">Perhatian Diperlukan</h4>
                    <p className="text-red-600/80 text-sm mt-1">Terdapat <strong>{stats.overdue} pekerjaan</strong> yang telah melewati batas waktu (Deadline). Klik untuk penanganan segera.</p>
                </div>
            </div>
        )}
        
        {stats.warning > 0 && (
             <div onClick={() => setFilterStatus('Warning')} className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex items-start gap-4 cursor-pointer hover:bg-orange-100 transition shadow-sm group">
                <div className="bg-orange-200 p-3 rounded-xl text-orange-600 group-hover:scale-110 transition">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-orange-800 text-lg">Mendekati Deadline</h4>
                    <p className="text-orange-600/80 text-sm mt-1">Ada <strong>{stats.warning} pekerjaan</strong> yang harus diselesaikan hari ini atau besok. Prioritaskan segera.</p>
                </div>
            </div>
        )}
      </div>

      {/* 4. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" /> Distribusi Kategori
                  </h3>
                  <div className="flex gap-2 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#002F6C]"></span> Pekerjaan</span>
                  </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} onClick={(data) => data?.activeLabel && setFilterStatus(String(data.activeLabel))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} interval={0} height={40} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="count" fill="#002F6C" radius={[6, 6, 0, 0]} barSize={40} cursor="pointer" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" /> Status Overall
               </h3>
               <div className="h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
                        <span className="block text-3xl font-bold text-gray-800">{stats.total}</span>
                        <span className="text-xs text-gray-400">Total Data</span>
                    </div>
               </div>
          </div>
      </div>
    </div>
  );
};

