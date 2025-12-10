
import React, { useMemo, useState, useRef } from 'react';
import { Job, Status, User } from '../types';
import { MENU_STRUCTURE } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock, CalendarDays, Upload, FileDown, ArrowLeft, Search, RefreshCw, Cloud, WifiOff, PauseCircle, XCircle, Tag, MapPin, X, CheckSquare, FileText, Calendar, User as UserIcon, AlertTriangle } from 'lucide-react';

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

// Updated Colors: Added Purple for Hold and Gray for Cancel
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
    
    // Cancelled and Hold jobs are usually not considered "Overdue" in the traditional sense
    const overdueJobs = jobs.filter(j => {
      const deadline = new Date(j.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today && j.status !== 'Completed' && j.status !== 'Cancel' && j.status !== 'Hold';
    });

    // Warning Jobs: Deadline is Today (H-0) or Tomorrow (H-1)
    const warningJobs = jobs.filter(j => {
        if (j.status === 'Completed' || j.status === 'Cancel' || j.status === 'Hold') return false;
        
        const deadline = new Date(j.deadline);
        deadline.setHours(0, 0, 0, 0);
        
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Return true if diffDays is 0 (Today) or 1 (Tomorrow/H-1)
        return diffDays >= 0 && diffDays <= 1;
    });

    return { 
        total, completed, pending, inProgress, hold, cancel, 
        overdue: overdueJobs.length, overdueList: overdueJobs,
        warning: warningJobs.length, warningList: warningJobs
    };
  }, [jobs]);

  const pieData = [
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Completed', value: stats.completed },
    { name: 'Overdue', value: stats.overdue },
    { name: 'Hold', value: stats.hold },
    { name: 'Cancel', value: stats.cancel },
  ].filter(item => item.value > 0);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize with 0 for all known categories to ensure they appear on chart even if empty
    Object.keys(MENU_STRUCTURE).forEach(cat => counts[cat] = 0);
    
    jobs.forEach(job => {
      if (counts[job.category] !== undefined) {
        counts[job.category] = (counts[job.category] || 0) + 1;
      } else {
        // Handle categories that might not be in MENU_STRUCTURE anymore
        counts[job.category] = (counts[job.category] || 0) + 1;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key]
    }));
  }, [jobs]);

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
            if (allowedStatuses.includes(rawStatus)) {
                validStatus = rawStatus as Status;
            }

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
                activationDate: undefined,
                createdBy: currentUser.email // Set owner to current user
            });
        }
      }
      
      if (newJobs.length > 0) {
          onBulkAddJobs(newJobs);
          alert(`Berhasil mengimport ${newJobs.length} data pekerjaan secara global!`);
      } else {
          alert("Gagal membaca file. Pastikan menggunakan Template Global yang sesuai.");
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

    if (filterStatus === 'Total') {
        result = jobs;
    } else if (filterStatus === 'Overdue') {
        result = jobs.filter(j => {
            const d = new Date(j.deadline);
            d.setHours(0,0,0,0);
            return d < today && j.status !== 'Completed' && j.status !== 'Cancel' && j.status !== 'Hold';
        });
    } else if (filterStatus === 'Warning') {
        // H-1 Logic Filter
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
        // Handle Category Filtering logic
        result = jobs.filter(j => j.category === filterStatus);
    } else {
        // Handle Status Filtering logic
        result = jobs.filter(j => j.status === filterStatus);
    }

    if (searchTerm) {
        result = result.filter(j => 
            j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || 
            j.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (j.keterangan && j.keterangan.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    return result;
  }, [jobs, filterStatus, searchTerm]);

  const getStatusColor = (status: Status, deadline: string) => {
    if (status === 'Hold') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (status === 'Cancel') return 'bg-gray-200 text-gray-800 border-gray-300';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(deadline);
    d.setHours(0,0,0,0);

    // Overdue
    if (d < today && status !== 'Completed') return 'bg-red-100 text-red-800 border-red-200';
    
    // Warning H-1 (Today or Tomorrow)
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 1 && status !== 'Completed') {
        return 'bg-orange-100 text-orange-800 border-orange-200 font-bold';
    }
    
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-100';
    }
  };

  const formatKeterangan = (text: string | undefined) => {
    if (!text) return '-';
    // Menampilkan 40 karakter terakhir
    if (text.length > 40) {
        return '...' + text.slice(-40);
    }
    return text;
  };

  const getFilterTitle = () => {
      if (filterStatus === 'In Progress') return 'Dalam Proses & Pending';
      if (filterStatus === 'Warning') return 'Mendekati Deadline (H-1)';
      if (Object.keys(MENU_STRUCTURE).includes(filterStatus || '')) return `Kategori: ${filterStatus}`;
      return filterStatus;
  }

  // Permission Checker
  const canEditJob = (job: Job) => {
      // Admin can edit everything
      if (currentUser.role === 'Admin') return true;
      // User can only edit if they created the job
      return job.createdBy === currentUser.email;
  };

  if (filterStatus) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <button 
                        onClick={() => setFilterStatus(null)}
                        className="flex items-center text-gray-500 hover:text-[#EE2E24] mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Detail Pekerjaan: <span className="text-[#002F6C]">{getFilterTitle()}</span>
                    </h2>
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="p-4">Kategori / Sub</th>
                                <th className="p-4">Tanggal Input</th>
                                <th className="p-4">Cabang</th>
                                <th className="p-4">Nama Pekerjaan</th>
                                <th className="p-4">Keterangan</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Deadline</th>
                                <th className="p-4">Oleh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredList.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                filteredList.map(job => {
                                    const userCanEdit = canEditJob(job);
                                    
                                    return (
                                    <tr 
                                        key={job.id} 
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setSelectedJob(job)}
                                    >
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800">{job.category}</div>
                                            <div className="text-xs text-gray-500">{job.subCategory}</div>
                                        </td>
                                        <td className="p-4">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                                        <td className="p-4">{job.branchDept}</td>
                                        <td className="p-4">{job.jobType}</td>
                                        <td className="p-4 italic text-gray-500" title={job.keterangan}>
                                            {formatKeterangan(job.keterangan)}
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                value={job.status}
                                                onChange={(e) => onUpdateJob(job.id, { status: e.target.value as Status })}
                                                disabled={!userCanEdit}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold border appearance-none focus:outline-none ${getStatusColor(job.status, job.deadline)} ${userCanEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Hold">Hold</option>
                                                <option value="Cancel">Cancel</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            {userCanEdit ? (
                                                <input 
                                                    type="date"
                                                    className={`text-sm border-b border-dashed border-gray-300 bg-transparent focus:outline-none focus:border-blue-500 font-medium ${new Date() > new Date(job.deadline) && job.status !== 'Completed' && job.status !== 'Cancel' && job.status !== 'Hold' ? 'text-red-600' : 'text-gray-600'}`}
                                                    value={job.deadline}
                                                    onChange={(e) => onUpdateJob(job.id, { deadline: e.target.value })}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className={`text-sm ${new Date() > new Date(job.deadline) && job.status !== 'Completed' ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {new Date(job.deadline).toLocaleDateString('id-ID')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs text-gray-400">
                                            {job.createdBy || '-'}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Job Detail Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#002F6C] p-6 text-white flex justify-between items-start relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
                                <Tag className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                                    <span className="font-semibold uppercase tracking-wider">{selectedJob.category}</span>
                                    <span>•</span>
                                    <span>{selectedJob.subCategory}</span>
                                </div>
                                <h2 className="text-2xl font-bold leading-tight">{selectedJob.jobType}</h2>
                                <div className="flex items-center gap-2 mt-2 text-sm text-blue-100">
                                    <MapPin className="w-4 h-4" />
                                    <span>{selectedJob.branchDept}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedJob(null)}
                                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Status & Dates */}
                            <div className="flex flex-wrap gap-4 justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(selectedJob.status, selectedJob.deadline)}`}>
                                    {selectedJob.status}
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-0.5 justify-end">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Deadline</span>
                                    </div>
                                    <span className={`font-semibold ${new Date() > new Date(selectedJob.deadline) && selectedJob.status !== 'Completed' ? 'text-red-600' : 'text-gray-800'}`}>
                                        {new Date(selectedJob.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    Keterangan Lengkap
                                </h4>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedJob.keterangan || "Tidak ada keterangan."}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
                                <div>
                                    <span className="block text-gray-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal Input</span>
                                    <span className="font-medium text-gray-700">
                                        {new Date(selectedJob.dateInput).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 mb-1 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Dibuat Oleh</span>
                                    <span className="font-medium text-gray-700">{selectedJob.createdBy || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
        <div>
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-800">{customTitle || "Dashboard Monitoring Pekerjaan"}</h1>
                <div className={`flex items-center px-2 py-1 rounded text-xs border ${connectionError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {connectionError ? (
                        <>
                            <WifiOff className="w-3 h-3 mr-1" />
                            <span>Offline / Error</span>
                        </>
                    ) : isSaving ? (
                        <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin text-blue-600" />
                            <span>Menyimpan...</span>
                        </>
                    ) : isLoading ? (
                        <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            <span>Syncing...</span>
                        </>
                    ) : (
                        <>
                            <Cloud className="w-3 h-3 mr-1 text-green-600" />
                            <span>Terhubung</span>
                        </>
                    )}
                </div>
            </div>
            <p className="text-gray-500 mt-1">
                Summary performa dan status pekerjaan terkini. 
                {lastUpdated && <span className="text-xs ml-2">Updated: {lastUpdated.toLocaleTimeString()}</span>}
            </p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.txt" 
                onChange={handleFileUpload}
            />
            <button 
                onClick={handleDownloadTemplate}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
                <FileDown className="w-4 h-4 mr-2" /> Template Global
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-[#002F6C] text-white rounded-lg hover:bg-blue-900 transition-colors text-sm font-medium shadow-sm"
            >
                <Upload className="w-4 h-4 mr-2" /> Upload Data Keseluruhan
            </button>
        </div>
      </div>

      {/* Notifications Area */}
      <div className="space-y-3">
        {stats.overdue > 0 && (
            <div 
                onClick={() => setFilterStatus('Overdue')}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start animate-pulse shadow-sm cursor-pointer hover:bg-red-100 transition-colors"
            >
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
                <h4 className="text-red-800 font-bold text-lg">PERHATIAN: {stats.overdue} Pekerjaan Melewati Deadline!</h4>
                <p className="text-red-700 mt-1">
                Mohon segera selesaikan pekerjaan yang tertunda. Klik disini untuk melihat detail.
                </p>
            </div>
            </div>
        )}

        {stats.warning > 0 && (
             <div 
                onClick={() => setFilterStatus('Warning')}
                className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md flex items-start shadow-sm cursor-pointer hover:bg-orange-100 transition-colors"
            >
            <AlertTriangle className="w-6 h-6 text-orange-500 mr-3 mt-0.5" />
            <div className="flex-1">
                <h4 className="text-orange-800 font-bold text-lg">WARNING: {stats.warning} Pekerjaan Deadline H-1 (Segera Habis)</h4>
                <p className="text-orange-700 mt-1">
                Pekerjaan ini akan habis waktu deadlinenya hari ini atau besok. Klik untuk melihat detail.
                </p>
            </div>
            </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div 
            onClick={() => setFilterStatus('Total')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 mb-2 group-hover:bg-blue-100 transition-colors">
            <CalendarDays className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-gray-500 text-xs">Total Pekerjaan</p>
        </div>

        <div 
            onClick={() => setFilterStatus('Completed')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-full bg-green-50 text-green-600 mb-2 group-hover:bg-green-100 transition-colors">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
          <p className="text-gray-500 text-xs">Selesai</p>
        </div>

        <div 
            onClick={() => setFilterStatus('In Progress')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-full bg-yellow-50 text-yellow-600 mb-2 group-hover:bg-yellow-100 transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.pending + stats.inProgress}</p>
          <p className="text-gray-500 text-xs">Dalam Proses</p>
        </div>

        <div 
            onClick={() => setFilterStatus('Overdue')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-full bg-red-50 text-red-600 mb-2 group-hover:bg-red-100 transition-colors">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          <p className="text-gray-500 text-xs">Melewati Deadline</p>
        </div>

        <div 
            onClick={() => setFilterStatus('Hold')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-full bg-purple-50 text-purple-600 mb-2 group-hover:bg-purple-100 transition-colors">
            <PauseCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-purple-800">{stats.hold}</p>
          <p className="text-gray-500 text-xs">Hold</p>
        </div>

        <div 
            onClick={() => setFilterStatus('Cancel')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-full bg-gray-100 text-gray-600 mb-2 group-hover:bg-gray-200 transition-colors">
            <XCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.cancel}</p>
          <p className="text-gray-500 text-xs">Cancel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Status Distribusi</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Pekerjaan per Kategori (Klik untuk detail)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barData} 
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    setFilterStatus(String(data.activeLabel));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} interval={0} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar 
                    dataKey="count" 
                    fill="#002F6C" 
                    radius={[4, 4, 0, 0]} 
                    cursor="pointer"
                    onClick={(data, index) => {
                        // Fallback click handler directly on the Bar
                        if (data && data.name) {
                             setFilterStatus(data.name as string);
                        }
                    }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
