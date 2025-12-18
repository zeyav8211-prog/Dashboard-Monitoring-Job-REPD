
import React, { useMemo, useState, useRef } from 'react';
import { Job, Status } from '../types';
import { MENU_STRUCTURE } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock, CalendarDays, Upload, FileDown, ArrowLeft, Search, RefreshCw, Cloud, WifiOff, Download, Bell, LayoutDashboard, Filter, Trash2, Hourglass, OctagonAlert, TriangleAlert } from 'lucide-react';

interface DashboardSummaryProps {
  jobs: Job[];
  onBulkAddJobs: (jobs: Job[]) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  isLoading?: boolean;
  isSaving?: boolean;
  connectionError?: boolean;
  lastUpdated?: Date | null;
}

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#6366 Indigo', '#64748B', '#EF4444'];

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ 
    jobs, 
    onBulkAddJobs,
    onUpdateJob,
    onDeleteJob,
    isLoading = false,
    isSaving = false,
    connectionError = false,
    lastUpdated = null
}) => {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'Completed' || j.status === 'DONE').length;
    const pending = jobs.filter(j => j.status === 'Pending').length;
    const inProgress = jobs.filter(j => j.status === 'In Progress' || j.status === 'On Proses').length;
    const onHold = jobs.filter(j => j.status === 'Hold').length;
    const cancelled = jobs.filter(j => j.status === 'Cancel' || j.status === 'Drop').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const overdueJobs = jobs.filter(j => {
      const deadline = new Date(j.deadline);
      return deadline <= today && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status);
    });

    const nearDeadlineJobs = jobs.filter(j => {
        const deadline = new Date(j.deadline);
        deadline.setHours(0,0,0,0);
        return deadline.getTime() === tomorrow.getTime() && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status);
    });

    return { 
        total, 
        completed, 
        pending, 
        inProgress, 
        onHold,
        cancelled,
        overdue: overdueJobs.length,
        nearDeadline: nearDeadlineJobs.length,
        overdueList: overdueJobs
    };
  }, [jobs]);

  const pieData = useMemo(() => [
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Completed', value: stats.completed },
    { name: 'Hold', value: stats.onHold },
    { name: 'Cancelled/Drop', value: stats.cancelled },
    { name: 'Critical (H-0/Overdue)', value: stats.overdue },
    { name: 'Warning (H-1)', value: stats.nearDeadline },
  ].filter(d => d.value > 0), [stats]);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(MENU_STRUCTURE).forEach(cat => counts[cat] = 0);
    
    jobs.forEach(job => {
      if (counts[job.category] !== undefined) {
        counts[job.category] = (counts[job.category] || 0) + 1;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key]
    }));
  }, [jobs]);

  const downloadCSV = (data: Job[], filename: string) => {
    const headers = [
      "Kategori", "Sub Kategori", "Tanggal Input", "Cabang/Dept", 
      "Jenis Pekerjaan", "Status", "Deadline", "Keterangan", "Oleh"
    ];
    const csvRows = [headers.join(",")];
    
    data.forEach(job => {
        const row = [
            `"${job.category}"`,
            `"${job.subCategory}"`,
            `"${job.dateInput}"`,
            `"${job.branchDept}"`,
            `"${job.jobType}"`,
            `"${job.status}"`,
            `"${job.deadline}"`,
            `"${(job.keterangan || '').replace(/"/g, '""')}"`,
            `"${job.createdBy || ''}"`
        ];
        csvRows.push(row.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredList = useMemo(() => {
    if (!filterStatus) return [];
    
    let result = jobs;
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (filterStatus === 'Total') {
        result = jobs;
    } else if (filterStatus === 'Overdue' || filterStatus === 'Critical (H-0/Overdue)') {
        result = jobs.filter(j => new Date(j.deadline) <= today && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status));
    } else if (filterStatus === 'Warning (H-1)') {
        result = jobs.filter(j => {
            const dl = new Date(j.deadline);
            dl.setHours(0,0,0,0);
            return dl.getTime() === tomorrow.getTime() && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(j.status);
        });
    } else if (filterStatus === 'Completed' || filterStatus === 'DONE') {
        result = jobs.filter(j => j.status === 'Completed' || j.status === 'DONE');
    } else if (filterStatus === 'In Progress' || filterStatus === 'On Proses') {
        result = jobs.filter(j => j.status === 'In Progress' || j.status === 'On Proses');
    } else if (filterStatus === 'Pending') {
        result = jobs.filter(j => j.status === 'Pending');
    } else if (filterStatus === 'Hold') {
        result = jobs.filter(j => j.status === 'Hold');
    } else if (filterStatus === 'Cancelled/Drop' || filterStatus === 'Cancel' || filterStatus === 'Drop') {
        result = jobs.filter(j => j.status === 'Cancel' || j.status === 'Drop');
    } else if (Object.keys(MENU_STRUCTURE).includes(filterStatus)) {
        result = jobs.filter(j => j.category === filterStatus);
    }

    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        result = result.filter(j => 
            j.branchDept.toLowerCase().includes(lowerSearch) || 
            j.jobType.toLowerCase().includes(lowerSearch) ||
            j.category.toLowerCase().includes(lowerSearch) ||
            j.subCategory.toLowerCase().includes(lowerSearch) ||
            (j.keterangan && j.keterangan.toLowerCase().includes(lowerSearch))
        );
    }
    return result;
  }, [jobs, filterStatus, searchTerm]);

  const getStatusColor = (status: Status, deadline: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateDeadline = new Date(deadline);
    dateDeadline.setHours(0,0,0,0);
    
    if (!['Completed', 'DONE', 'Drop', 'Cancel'].includes(status)) {
        if (dateDeadline <= today) return 'bg-red-100 text-red-800 border-red-200';
        if (dateDeadline.getTime() === tomorrow.getTime()) return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    
    switch (status) {
      case 'Completed':
      case 'DONE': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': 
      case 'On Proses':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-sky-50 text-sky-800 border-sky-100';
      case 'Hold':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Cancel':
      case 'Drop':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default: return 'bg-gray-50 text-gray-800 border-gray-100';
    }
  };

  if (filterStatus) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <button 
                        onClick={() => { setFilterStatus(null); setSearchTerm(''); }}
                        className="flex items-center text-sm font-medium text-gray-500 hover:text-red-600 mb-2 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Kembali ke Dashboard
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Filter className="w-6 h-6 text-red-600" />
                        Detail: <span className="text-[#002F6C]">{filterStatus}</span>
                    </h2>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => downloadCSV(filteredList, `JNE_Report_${filterStatus}.csv`)}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export Filtered
                    </button>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Cari dalam hasil..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-bold">Kategori / Sub</th>
                                <th className="p-4 font-bold">Tanggal</th>
                                <th className="p-4 font-bold">Cabang/Dept</th>
                                <th className="p-4 font-bold">Pekerjaan</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Dateline</th>
                                <th className="p-4 font-bold text-center">PIC</th>
                                <th className="p-4 font-bold text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredList.length === 0 ? (
                                <tr><td colSpan={8} className="p-12 text-center text-gray-400 italic">Data tidak ditemukan untuk kriteria ini.</td></tr>
                            ) : (
                                filteredList.map(job => (
                                    <tr key={job.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800 text-xs uppercase tracking-tight">{job.category}</div>
                                            <div className="text-xs text-gray-500">{job.subCategory}</div>
                                        </td>
                                        <td className="p-4 text-gray-600">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                                        <td className="p-4 font-medium text-gray-800">{job.branchDept}</td>
                                        <td className="p-4 max-w-xs truncate" title={job.jobType}>{job.jobType}</td>
                                        <td className="p-4">
                                            <span 
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(job.status, job.deadline)}`}
                                            >
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold ${new Date() >= new Date(job.deadline) && !['Completed', 'DONE', 'Drop', 'Cancel'].includes(job.status) ? 'text-red-600 underline' : 'text-gray-600'}`}>
                                                {new Date(job.deadline).toLocaleDateString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 mx-auto" title={job.createdBy}>
                                                {(job.createdBy || '??').substring(0, 2).toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                              onClick={() => onDeleteJob(job.id)}
                                              className={`p-2 rounded-lg transition-all ${['Cancel', 'Drop'].includes(job.status) ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                              title="Hapus Data"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
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
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* ALERTS SECTION (TOP POSITON) */}
      <div className="space-y-2">
          {stats.overdue > 0 && (
              <div 
                onClick={() => setFilterStatus('Warning (H-1)')}
                className="animate-blink-red p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer border-2 border-red-500"
              >
                  <div className="flex items-center gap-3 font-black uppercase tracking-tighter italic">
                      <OctagonAlert className="w-6 h-6 animate-pulse" />
                      <span>PERINGATAN KRITIS: {stats.overdue} Pekerjaan Overdue / Jatuh Tempo Hari Ini!</span>
                  </div>
                  <div className="hidden md:block font-bold underline">Klik untuk Tindak Lanjut &rarr;</div>
              </div>
          )}
          {stats.nearDeadline > 0 && (
              <div 
                onClick={() => setFilterStatus('Warning (H-1)')}
                className="animate-blink-orange p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer border-2 border-amber-600"
              >
                  <div className="flex items-center gap-3 font-black uppercase tracking-tighter italic">
                      <TriangleAlert className="w-6 h-6 animate-pulse" />
                      <span>PERINGATAN: {stats.nearDeadline} Pekerjaan Batas Waktu Besok (H-1)</span>
                  </div>
                  <div className="hidden md:block font-bold underline">Cek Detail &rarr;</div>
              </div>
          )}
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
        <div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg text-white">
                    <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Monitoring Pekerjaan</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${connectionError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {connectionError ? (
                                <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
                            ) : isSaving ? (
                                <><RefreshCw className="w-3 h-3 mr-1 animate-spin text-blue-600" /> Saving</>
                            ) : (
                                <><Cloud className="w-3 h-3 mr-1 text-green-600" /> Connected</>
                            )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                            LAST SYNC: {lastUpdated ? lastUpdated.toLocaleTimeString() : '---'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <button 
            onClick={() => downloadCSV(jobs, `JNE_Full_Report_${new Date().toISOString().split('T')[0]}.csv`)}
            className="flex items-center px-5 py-2.5 bg-[#002F6C] text-white rounded-xl hover:bg-blue-900 transition-all text-sm font-bold shadow-lg shadow-blue-100 uppercase tracking-wider"
        >
            <Download className="w-4 h-4 mr-2" /> Download Full Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: CalendarDays, color: 'blue', filter: 'Total' },
          { label: 'Selesai', value: stats.completed, icon: CheckCircle2, color: 'green', filter: 'Completed' },
          { label: 'Proses', value: stats.pending + stats.inProgress, icon: Clock, color: 'sky', filter: 'In Progress' },
          { label: 'Warning (H-1)', value: stats.nearDeadline, icon: Hourglass, color: 'amber', filter: 'Warning (H-1)' },
          { label: 'Critical (H-0)', value: stats.overdue, icon: AlertCircle, color: 'red', filter: 'Warning (H-1)' },
          { label: 'Cancelled', value: stats.cancelled, icon: Trash2, color: 'slate', filter: 'Cancelled/Drop' }
        ].map((item, idx) => (
          <div 
            key={idx}
            onClick={() => setFilterStatus(item.filter)} 
            className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group ${item.color === 'red' && stats.overdue > 0 ? 'ring-2 ring-red-500 animate-pulse' : ''} ${item.color === 'amber' && stats.nearDeadline > 0 ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
          >
            <div className={`p-3 rounded-xl bg-${item.color}-50 text-${item.color}-600 mr-3 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-tight">{item.label}</p>
              <p className="text-2xl font-black text-gray-800 leading-none mt-1">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Status Distribusi</h3>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interactive Chart</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={8}
                  dataKey="value"
                  className="cursor-pointer"
                  onClick={(data) => {
                      if (data && data.name) setFilterStatus(data.name);
                  }}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Volume per Kategori</h3>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click bar for detail</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barData} 
                onClick={(data) => {
                  if (data && data.activeLabel) setFilterStatus(String(data.activeLabel));
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fontWeight: 'bold', fill: '#94a3b8'}}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar 
                    dataKey="count" 
                    fill="#EE2E24" 
                    radius={[6, 6, 0, 0]} 
                    cursor="pointer"
                    barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Visual Indicator of Activity */}
      <div className="bg-gradient-to-r from-[#002F6C] to-[#004a8f] p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1">
                  <h4 className="text-xl font-black uppercase tracking-tighter mb-2 flex items-center gap-2">
                      <Bell className="w-6 h-6 animate-bounce text-yellow-400" /> Live Insight
                  </h4>
                  <p className="text-blue-100 text-sm max-w-lg leading-relaxed">
                      Ditemukan <span className="font-bold text-white underline">{stats.overdue} Critical (H-0/Overdue)</span> dan <span className="font-bold text-yellow-300">{stats.nearDeadline} Warning (H-1)</span>. 
                      Segera tindak lanjuti pekerjaan dengan label merah untuk menjaga kualitas SLA.
                  </p>
              </div>
              <div className="flex gap-4">
                 <div className="bg-red-600/30 backdrop-blur-sm p-4 rounded-2xl border border-red-500/50 text-center min-w-[120px]">
                    <p className="text-xs uppercase font-bold opacity-70">Critical</p>
                    <p className="text-3xl font-black">{stats.overdue}</p>
                 </div>
                 <div className="bg-amber-600/30 backdrop-blur-sm p-4 rounded-2xl border border-amber-500/50 text-center min-w-[120px]">
                    <p className="text-xs uppercase font-bold opacity-70">Warning</p>
                    <p className="text-3xl font-black">{stats.nearDeadline}</p>
                 </div>
              </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <LayoutDashboard size={200} />
          </div>
      </div>
    </div>
  );
};
