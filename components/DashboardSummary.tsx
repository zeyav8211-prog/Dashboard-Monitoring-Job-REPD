
import React, { useMemo, useState, useRef } from 'react';
import { Job, Status } from '../types';
import { MENU_STRUCTURE } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock, CalendarDays, Upload, FileDown, ArrowLeft, Search, RefreshCw, Cloud, WifiOff } from 'lucide-react';

interface DashboardSummaryProps {
  jobs: Job[];
  onBulkAddJobs: (jobs: Job[]) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  isLoading?: boolean;
  isSaving?: boolean;
  connectionError?: boolean;
  lastUpdated?: Date | null;
  isDarkMode?: boolean;
}

const COLORS = ['#0088FE', '#FFBB28', '#00C49F', '#EE2E24'];

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ 
    jobs, 
    onBulkAddJobs,
    onUpdateJob,
    isLoading = false,
    isSaving = false,
    connectionError = false,
    lastUpdated = null,
    isDarkMode = false
}) => {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme Helpers
  const cardClass = isDarkMode ? "bg-gray-800 border-gray-700 shadow-lg" : "bg-white border-gray-100 shadow-sm";
  const textTitle = isDarkMode ? "text-white" : "text-gray-800";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const inputClass = isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-200 text-gray-800";
  const tableHeaderClass = isDarkMode ? "bg-gray-900 text-gray-300 border-gray-700" : "bg-gray-50 text-gray-600 border-gray-200";
  const tableRowClass = isDarkMode ? "hover:bg-gray-700 border-gray-700" : "hover:bg-gray-50 border-gray-100";
  const tableText = isDarkMode ? "text-gray-200" : "text-gray-800";

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'Completed').length;
    const pending = jobs.filter(j => j.status === 'Pending').length;
    const inProgress = jobs.filter(j => j.status === 'In Progress').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueJobs = jobs.filter(j => {
      const deadline = new Date(j.deadline);
      return deadline < today && j.status !== 'Completed';
    });

    return { total, completed, pending, inProgress, overdue: overdueJobs.length, overdueList: overdueJobs };
  }, [jobs]);

  const pieData = [
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Completed', value: stats.completed },
    { name: 'Overdue', value: stats.overdue },
  ];

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
    const headers = "Kategori,Sub Kategori,Tanggal Input (YYYY-MM-DD),Cabang/Dept,Jenis Pekerjaan,Status,Dateline (YYYY-MM-DD),Keterangan";
    const exampleRow = "Penyesuaian,Harga Jual,2024-03-20,Jakarta,Update Tarif,Pending,2024-03-25,Catatan Tambahan";
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
            if (rawStatus === 'In Progress' || rawStatus === 'Completed' || rawStatus === 'Overdue') {
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
                activationDate: undefined 
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

    if (filterStatus === 'Total') {
        result = jobs;
    } else if (filterStatus === 'Overdue') {
        const today = new Date();
        today.setHours(0,0,0,0);
        result = jobs.filter(j => new Date(j.deadline) < today && j.status !== 'Completed');
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
    const isOverdue = new Date() > new Date(deadline) && status !== 'Completed';
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-200';
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-100';
    }
  };

  const getFilterTitle = () => {
      if (filterStatus === 'In Progress') return 'Dalam Proses & Pending';
      if (Object.keys(MENU_STRUCTURE).includes(filterStatus || '')) return `Kategori: ${filterStatus}`;
      return filterStatus;
  }

  if (filterStatus) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <button 
                        onClick={() => setFilterStatus(null)}
                        className={`flex items-center hover:text-[#EE2E24] mb-2 transition-colors ${textSub}`}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
                    </button>
                    <h2 className={`text-2xl font-bold ${textTitle}`}>
                        Detail Pekerjaan: <span className="text-[#002F6C]">{getFilterTitle()}</span>
                    </h2>
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari..." 
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 ${inputClass}`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className={`${tableHeaderClass} border-b`}>
                            <tr>
                                <th className="p-4">Kategori / Sub</th>
                                <th className="p-4">Tanggal Input</th>
                                <th className="p-4">Cabang</th>
                                <th className="p-4">Pekerjaan</th>
                                <th className="p-4">Keterangan</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Dateline</th>
                                <th className="p-4">Oleh</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {filteredList.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                filteredList.map(job => (
                                    <tr key={job.id} className={tableRowClass}>
                                        <td className="p-4">
                                            <div className={`font-medium ${tableText}`}>{job.category}</div>
                                            <div className="text-xs text-gray-500">{job.subCategory}</div>
                                        </td>
                                        <td className={`p-4 ${tableText}`}>{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                                        <td className={`p-4 ${tableText}`}>{job.branchDept}</td>
                                        <td className={`p-4 ${tableText}`}>{job.jobType}</td>
                                        <td className="p-4 italic text-gray-500">{job.keterangan || '-'}</td>
                                        <td className="p-4">
                                            <select 
                                                value={job.status}
                                                onChange={(e) => onUpdateJob(job.id, { status: e.target.value as Status })}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold border appearance-none cursor-pointer focus:outline-none ${getStatusColor(job.status, job.deadline)}`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <input 
                                                type="date"
                                                className={`text-sm border-b border-dashed border-gray-300 bg-transparent focus:outline-none focus:border-blue-500 font-medium ${new Date() > new Date(job.deadline) && job.status !== 'Completed' ? 'text-red-600' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`}
                                                value={job.deadline}
                                                onChange={(e) => onUpdateJob(job.id, { deadline: e.target.value })}
                                            />
                                        </td>
                                        <td className="p-4 text-xs text-gray-400">
                                            {job.createdBy || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
        <div>
            <div className="flex items-center gap-2">
                <h1 className={`text-2xl font-bold ${textTitle}`}>Dashboard Monitoring Pekerjaan</h1>
                <div className={`flex items-center px-2 py-1 rounded text-xs border ${connectionError ? 'bg-red-50 text-red-600 border-red-200' : (isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200')}`}>
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
            <p className={`${textSub} mt-1`}>
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
                className={`flex items-center px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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

      {stats.overdue > 0 && (
        <div 
            onClick={() => setFilterStatus('Overdue')}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start animate-pulse shadow-sm cursor-pointer hover:bg-red-100 transition-colors"
        >
          <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-red-800 font-bold text-lg">PERHATIAN: {stats.overdue} Pekerjaan Melewati Dateline!</h4>
            <p className="text-red-700 mt-1">
              Mohon segera selesaikan pekerjaan yang tertunda. Klik disini untuk melihat detail.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
            onClick={() => setFilterStatus('Total')}
            className={`${cardClass} p-6 rounded-xl flex items-center cursor-pointer hover:shadow-md transition-shadow group`}
        >
          <div className={`p-3 rounded-full mr-4 transition-colors ${isDarkMode ? 'bg-blue-900 text-blue-300 group-hover:bg-blue-800' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className={`${textSub} text-sm`}>Total Pekerjaan</p>
            <p className={`text-2xl font-bold ${textTitle}`}>{stats.total}</p>
          </div>
        </div>

        <div 
            onClick={() => setFilterStatus('Completed')}
            className={`${cardClass} p-6 rounded-xl flex items-center cursor-pointer hover:shadow-md transition-shadow group`}
        >
          <div className={`p-3 rounded-full mr-4 transition-colors ${isDarkMode ? 'bg-green-900 text-green-300 group-hover:bg-green-800' : 'bg-green-50 text-green-600 group-hover:bg-green-100'}`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className={`${textSub} text-sm`}>Selesai</p>
            <p className={`text-2xl font-bold ${textTitle}`}>{stats.completed}</p>
          </div>
        </div>

        <div 
            onClick={() => setFilterStatus('In Progress')}
            className={`${cardClass} p-6 rounded-xl flex items-center cursor-pointer hover:shadow-md transition-shadow group`}
        >
          <div className={`p-3 rounded-full mr-4 transition-colors ${isDarkMode ? 'bg-yellow-900 text-yellow-300 group-hover:bg-yellow-800' : 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100'}`}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className={`${textSub} text-sm`}>Dalam Proses</p>
            <p className={`text-2xl font-bold ${textTitle}`}>{stats.pending + stats.inProgress}</p>
          </div>
        </div>

        <div 
            onClick={() => setFilterStatus('Overdue')}
            className={`${cardClass} p-6 rounded-xl flex items-center cursor-pointer hover:shadow-md transition-shadow group`}
        >
          <div className={`p-3 rounded-full mr-4 transition-colors ${isDarkMode ? 'bg-red-900 text-red-300 group-hover:bg-red-800' : 'bg-red-50 text-red-600 group-hover:bg-red-100'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className={`${textSub} text-sm`}>Melewati Dateline</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardClass} p-6 rounded-xl`}>
          <h3 className={`text-lg font-bold mb-4 ${textTitle}`}>Status Distribusi</h3>
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
                  stroke={isDarkMode ? '#1f2937' : '#fff'}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1f2937' : '#fff', 
                        borderColor: isDarkMode ? '#374151' : '#ccc',
                        color: isDarkMode ? '#fff' : '#000'
                    }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${cardClass} p-6 rounded-xl`}>
          <h3 className={`text-lg font-bold mb-4 ${textTitle}`}>Pekerjaan per Kategori (Klik untuk detail)</h3>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#ccc'} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }} />
                <Tooltip 
                     cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}}
                     contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1f2937' : '#fff', 
                        borderColor: isDarkMode ? '#374151' : '#ccc',
                        color: isDarkMode ? '#fff' : '#000'
                    }} 
                />
                <Bar 
                    dataKey="count" 
                    fill="#002F6C" 
                    radius={[4, 4, 0, 0]} 
                    cursor="pointer"
                    onClick={(data) => {
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
