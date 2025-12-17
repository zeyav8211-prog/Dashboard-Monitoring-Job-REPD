
import React, { useState, useRef, useMemo } from 'react';
import { Job, Status, User } from '../types';
import { 
  Plus, Upload, X, Search, FileDown, Pencil, CheckSquare, 
  Calendar, Clock, User as UserIcon, Tag, MapPin, FileText, 
  Link as LinkIcon, Users, Filter, MoreHorizontal, ArrowUpRight,
  CheckCircle2, AlertCircle, Loader2, PauseCircle, XCircle
} from 'lucide-react';

interface JobManagerProps {
  category: string;
  subCategory: string;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  onBulkAddJobs: (jobs: Job[]) => void;
  currentUser: User;
}

export const JobManager: React.FC<JobManagerProps> = ({
  category,
  subCategory,
  jobs,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onBulkAddJobs,
  currentUser
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState: Partial<Job> = {
    status: 'Pending',
    dateInput: new Date().toISOString().split('T')[0],
    keterangan: '',
    isCabangConfirmed: false,
    isDisposition: false,
    isApproved: false,
    picUser: '',
    jenisPengajuan: '',
    tanggalUpdate: '',
    picRepd: '',
    noDisposisi: '',
    klasifikasi: '',
    noInternalMemo: '',
    linkAktifasi: '',
    approveHeadDept: false,
    approveHeadDiv: false,
    approveRegional: false,
    approveVP: false,
    approveBOD: false,
    docSoftCopy: false,
    docLampiran: false,
    docHardCopy: false,
    sosialisasiCabang: false,
    sosialisasiIT: false
  };

  const [formData, setFormData] = useState<Partial<Job>>(initialFormState);

  // Category Flags
  const isProductionMaster = category === "Produksi Master Data";
  const isPenyesuaian = category === "Penyesuaian";
  const isReportSurat = category === "Report Surat";
  const isEmailMasuk = isReportSurat && subCategory === "Email Masuk";
  const isDisposisi = isReportSurat && subCategory === "Disposisi";
  const isInternalMemo = isReportSurat && subCategory === "Internal Memo";

  // --- Logic Helpers ---

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setFormData({
      ...initialFormState,
      ...job,
      dateInput: job.dateInput || new Date().toISOString().split('T')[0],
      deadline: job.deadline,
    });
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleCheckboxChange = (field: keyof Job, checked: boolean) => {
    setFormData(prev => {
        const newData = { ...prev, [field]: checked };
        if (field === 'isApproved' && isPenyesuaian && checked) {
            newData.status = 'Completed';
        }
        return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData: Partial<Job> = { ...formData };
    
    if (editingId) {
        onUpdateJob(editingId, cleanData);
    } else {
        const newJob: Job = {
            id: crypto.randomUUID(),
            category,
            subCategory,
            dateInput: formData.dateInput || new Date().toISOString().split('T')[0],
            branchDept: formData.branchDept || '',
            jobType: formData.jobType || '',
            status: (formData.status as Status) || 'Pending',
            deadline: formData.deadline || new Date().toISOString().split('T')[0],
            createdBy: currentUser.email,
            ...cleanData
        } as Job;
        onAddJob(newJob);
    }
    handleCancel();
  };

  const filteredJobs = useMemo(() => {
      return jobs.filter(j => {
        if (j.category !== category || j.subCategory !== subCategory) return false;
        if (j.createdBy !== currentUser.email) return false;
        
        const matchesSearch = searchTerm === '' || (
            j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || 
            j.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (j.keterangan && j.keterangan.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const matchesStatus = statusFilter === 'All' || j.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
  }, [jobs, category, subCategory, currentUser, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const relevantJobs = jobs.filter(j => j.category === category && j.subCategory === subCategory && j.createdBy === currentUser.email);
    return {
        total: relevantJobs.length,
        pending: relevantJobs.filter(j => j.status === 'Pending').length,
        inProgress: relevantJobs.filter(j => j.status === 'In Progress').length,
        completed: relevantJobs.filter(j => j.status === 'Completed').length,
    };
  }, [jobs, category, subCategory, currentUser]);

  // --- Styling Helpers ---

  const getStatusBadge = (status: Status, deadline: string) => {
    let baseClasses = "px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit";
    
    if (status === 'Hold') return <span className={`${baseClasses} bg-purple-100 text-purple-700 border-purple-200`}><PauseCircle className="w-3 h-3"/> Hold</span>;
    if (status === 'Cancel') return <span className={`${baseClasses} bg-gray-100 text-gray-600 border-gray-200`}><XCircle className="w-3 h-3"/> Cancel</span>;

    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(deadline);
    d.setHours(0,0,0,0);

    // Overdue
    if (d < today && status !== 'Completed') {
        return <span className={`${baseClasses} bg-red-100 text-red-700 border-red-200`}><AlertCircle className="w-3 h-3"/> Overdue</span>;
    }
    
    // Warning H-1
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 1 && status !== 'Completed') {
        return <span className={`${baseClasses} bg-orange-100 text-orange-700 border-orange-200`}><Clock className="w-3 h-3"/> Warning</span>;
    }
    
    switch (status) {
      case 'Completed': return <span className={`${baseClasses} bg-green-100 text-green-700 border-green-200`}><CheckCircle2 className="w-3 h-3"/> Selesai</span>;
      case 'In Progress': return <span className={`${baseClasses} bg-blue-100 text-blue-700 border-blue-200`}><Loader2 className="w-3 h-3 animate-spin"/> Proses</span>;
      default: return <span className={`${baseClasses} bg-slate-100 text-slate-600 border-slate-200`}><Clock className="w-3 h-3"/> Pending</span>;
    }
  };

  const canEditJob = (job: Job) => currentUser.role === 'Admin' || job.createdBy === currentUser.email;

  // --- File Handlers ---
  const handleDownloadTemplate = () => {
    let headers = "";
    let exampleRow = "";
    let filename = `Template_${category}_${subCategory}.csv`;

    if (isEmailMasuk) {
        headers = "TGL EMAIL MASUK (YYYY-MM-DD),CABANG/DEPT,PIC USER,SUBJECT EMAIL,JENIS PENGAJUAN,PIC REPD,TANGGAL UPDATE (YYYY-MM-DD),STATUS,KETERANGAN";
        exampleRow = "2024-03-20,Jakarta,Budi,Permintaan Data,Permintaan Baru,Andi,2024-03-21,Pending,Catatan tambahan";
    } else if (isDisposisi) {
        headers = "TANGGAL (YYYY-MM-DD),NO DISPOSISI,CABANG/DEPT,KLASIFIKASI,DESKRIPSI,STATUS,KETERANGAN";
        exampleRow = "2024-03-20,DIS/001/III/2024,Bandung,Urgent,Pengajuan Anggaran,Pending,Catatan";
    } else if (isInternalMemo) {
        headers = "TANGGAL (YYYY-MM-DD),NO INTERNAL MEMO,CABANG/DEPT,DESKRIPSI,TANGGAL AKTIFASI (YYYY-MM-DD),STATUS,KETERANGAN";
        exampleRow = "2024-03-20,IM/001/IT/2024,IT Dept,Update Sistem,2024-03-25,Pending,Catatan";
    } else {
        headers = "TANGGAL INPUT (YYYY-MM-DD),CABANG/DEPT,NAMA PEKERJAAN,STATUS,DEADLINE (YYYY-MM-DD),KETERANGAN";
        exampleRow = "2024-03-20,Jakarta,Pekerjaan Rutin,Pending,2024-03-25,Catatan";
    }

    const csvContent = headers + "\n" + exampleRow;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
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
        const cols = lines[i].split(/,|;/).map(c => c.trim()); 
        if (!cols[0]) continue;

        let job: Partial<Job> = {
            id: crypto.randomUUID(),
            category,
            subCategory,
            status: 'Pending',
            createdBy: currentUser.email,
            deadline: new Date().toISOString().split('T')[0]
        };

        if (isEmailMasuk) {
            job.dateInput = cols[0]; job.branchDept = cols[1]; job.picUser = cols[2]; job.jobType = cols[3];
            job.jenisPengajuan = cols[4]; job.picRepd = cols[5]; job.tanggalUpdate = cols[6];
            job.status = (cols[7] as Status) || 'Pending'; job.keterangan = cols[8];
        } else if (isDisposisi) {
            job.dateInput = cols[0]; job.noDisposisi = cols[1]; job.branchDept = cols[2]; job.klasifikasi = cols[3];
            job.jobType = cols[4]; job.status = (cols[5] as Status) || 'Pending'; job.keterangan = cols[6];
        } else if (isInternalMemo) {
            job.dateInput = cols[0]; job.noInternalMemo = cols[1]; job.branchDept = cols[2]; job.jobType = cols[3];
            job.activationDate = cols[4]; job.status = (cols[5] as Status) || 'Pending'; job.keterangan = cols[6];
        } else {
            job.dateInput = cols[0]; job.branchDept = cols[1]; job.jobType = cols[2];
            job.status = (cols[3] as Status) || 'Pending'; job.deadline = cols[4] || new Date().toISOString().split('T')[0]; job.keterangan = cols[5];
        }

        const validStatuses: Status[] = ['Pending', 'In Progress', 'Completed', 'Hold', 'Cancel'];
        if (job.status && !validStatuses.includes(job.status)) job.status = 'Pending';
        newJobs.push(job as Job);
      }
      if (newJobs.length > 0) {
          onBulkAddJobs(newJobs);
          alert(`Berhasil import ${newJobs.length} data!`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Render Components ---

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
      <div className={`bg-white p-4 rounded-xl border border-${color}-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow`}>
          <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          </div>
          <div className={`p-3 bg-${color}-50 rounded-full text-${color}-600`}>
              <Icon className="w-5 h-5" />
          </div>
      </div>
  );

  const renderTableHeader = () => {
      const Th = ({ children, className = "" }: any) => (
          <th className={`px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider ${className}`}>{children}</th>
      );

      return (
          <tr className="bg-gray-50 border-b border-gray-200">
              {isEmailMasuk ? (
                <>
                    <Th>Tgl Email</Th><Th>PIC User</Th><Th>Cabang/Dept</Th><Th>Subject</Th><Th>Status</Th><Th className="text-center">Aksi</Th>
                </>
              ) : isDisposisi ? (
                <>
                    <Th>Tgl</Th><Th>No Disposisi</Th><Th>Cabang/Dept</Th><Th>Deskripsi</Th><Th>Status</Th><Th className="text-center">Aksi</Th>
                </>
              ) : isInternalMemo ? (
                <>
                    <Th>Tgl</Th><Th>No Memo</Th><Th>Cabang/Dept</Th><Th>Deskripsi</Th><Th>Status</Th><Th className="text-center">Aksi</Th>
                </>
              ) : (
                <>
                     <Th>Tanggal</Th><Th>Cabang/Dept</Th><Th className="w-1/3">Pekerjaan</Th>
                     {isProductionMaster && <Th>Aktifasi</Th>}
                     <Th>Status</Th><Th>Deadline</Th><Th className="text-center">Aksi</Th>
                </>
              )}
          </tr>
      );
  };

  const renderTableRow = (job: Job) => {
    const commonClasses = "px-4 py-3 text-sm text-gray-700 border-b border-gray-100 group-hover:bg-blue-50/50 transition-colors";
    
    // Status Select for Quick Action
    const StatusSelect = () => (
        <div onClick={(e) => e.stopPropagation()}>
            <select 
                value={job.status}
                onChange={(e) => onUpdateJob(job.id, { status: e.target.value as Status })}
                disabled={!canEditJob(job)}
                className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 bg-transparent cursor-pointer ${
                    job.status === 'Completed' ? 'text-green-700' : 
                    job.status === 'In Progress' ? 'text-blue-700' : 'text-gray-600'
                }`}
            >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Hold">Hold</option>
                <option value="Cancel">Cancel</option>
            </select>
        </div>
    );

    const EditButton = () => (
        <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(job); }}
            disabled={!canEditJob(job)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-30"
        >
            <Pencil className="w-4 h-4" />
        </button>
    );

    if (isEmailMasuk) {
        return (
            <tr key={job.id} onClick={() => setSelectedJob(job)} className="cursor-pointer group">
                <td className={commonClasses}>{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                <td className={commonClasses}>{job.picUser}</td>
                <td className={`${commonClasses} font-medium`}>{job.branchDept}</td>
                <td className={commonClasses}>{job.jobType}</td>
                <td className={commonClasses}>{getStatusBadge(job.status, job.deadline)}</td>
                <td className={`${commonClasses} text-center`}><EditButton /></td>
            </tr>
        );
    }
    
    // ... Simplified logic for other categories reusing common structure ...
    const displayId = isDisposisi ? job.noDisposisi : isInternalMemo ? job.noInternalMemo : null;

    return (
        <tr key={job.id} onClick={() => setSelectedJob(job)} className="cursor-pointer group">
            <td className={commonClasses}>{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
            {displayId && <td className={`${commonClasses} font-mono text-xs text-blue-600`}>{displayId}</td>}
            <td className={`${commonClasses} font-medium`}>{job.branchDept}</td>
            <td className={commonClasses}>
                <div className="font-medium text-gray-900">{job.jobType}</div>
                {(job.klasifikasi || job.keterangan) && (
                    <div className="text-xs text-gray-400 truncate max-w-[200px]">
                        {job.klasifikasi ? `[${job.klasifikasi}] ` : ''}
                        {job.keterangan}
                    </div>
                )}
            </td>
             {isProductionMaster && !isInternalMemo && <td className={commonClasses}>{job.activationDate || '-'}</td>}
            <td className={commonClasses}>
                <div className="flex flex-col gap-1">
                    {getStatusBadge(job.status, job.deadline)}
                    <StatusSelect />
                </div>
            </td>
            {!isReportSurat && <td className={`${commonClasses} text-xs text-gray-500`}>
                 <div className={`flex items-center gap-1 ${new Date() > new Date(job.deadline) && job.status !== 'Completed' ? 'text-red-600 font-bold' : ''}`}>
                    {new Date(job.deadline).toLocaleDateString('id-ID')}
                 </div>
            </td>}
            <td className={`${commonClasses} text-center`}><EditButton /></td>
        </tr>
    );
  };

  const renderFormInput = (label: string, value: any, onChange: (val: string) => void, type = "text", placeholder = "", required = false) => (
      <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">{label}</label>
          <input 
            type={type} 
            required={required}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm"
            placeholder={placeholder}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-50 pointer-events-none w-32 h-32"></div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{category}</span>
                <span className="text-gray-300">/</span>
                <span className="text-blue-600 font-bold">{subCategory}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Pekerjaan</h1>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10">
             {view === 'list' ? (
                <>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                    <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm">
                        <FileDown className="w-4 h-4" /> Template
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm">
                        <Upload className="w-4 h-4" /> Import
                    </button>
                    <button onClick={() => setView('form')} className="btn-primary flex items-center gap-2 px-4 py-2 bg-[#002F6C] text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition shadow-md hover:shadow-lg">
                        <Plus className="w-4 h-4" /> Tambah Baru
                    </button>
                </>
             ) : (
                <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                    <X className="w-4 h-4" /> Batal & Kembali
                </button>
             )}
        </div>
      </div>

      {view === 'list' && (
        <>
            {/* MINI DASHBOARD STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Data" value={stats.total} icon={FileText} color="blue" />
                <StatCard label="Pending" value={stats.pending} icon={Clock} color="slate" />
                <StatCard label="In Progress" value={stats.inProgress} icon={Loader2} color="orange" />
                <StatCard label="Selesai" value={stats.completed} icon={CheckCircle2} color="green" />
            </div>

            {/* SEARCH & FILTER */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari berdasarkan No, Deskripsi, atau Cabang..." 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition outline-none text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative min-w-[180px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition outline-none text-sm appearance-none cursor-pointer"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="All">Semua Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Hold">Hold</option>
                        <option value="Cancel">Cancel</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            {renderTableHeader()}
                        </thead>
                        <tbody>
                            {filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Search className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="font-medium">Tidak ada data ditemukan</p>
                                            <p className="text-sm opacity-70">Coba ubah kata kunci atau filter status</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map(renderTableRow)
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
                    <span>Menampilkan {filteredJobs.length} data</span>
                    <span className="italic">Klik baris untuk detail lengkap</span>
                </div>
            </div>
        </>
      )}

      {view === 'form' && (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: UTAMA */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                        Informasi Utama
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderFormInput(isEmailMasuk ? 'Tgl Email Masuk' : 'Tanggal Input', formData.dateInput, (v) => setFormData({...formData, dateInput: v}), 'date', '', true)}
                        {renderFormInput('Cabang / Dept', formData.branchDept, (v) => setFormData({...formData, branchDept: v}), 'text', 'Contoh: Jakarta / Ops', true)}
                        
                        {/* Dynamic Fields */}
                        {isEmailMasuk && (
                             <>
                                {renderFormInput('PIC User', formData.picUser, v => setFormData({...formData, picUser: v}))}
                                {renderFormInput('Subject Email', formData.jobType, v => setFormData({...formData, jobType: v}))}
                                {renderFormInput('Jenis Pengajuan', formData.jenisPengajuan, v => setFormData({...formData, jenisPengajuan: v}))}
                                {renderFormInput('PIC REPD', formData.picRepd, v => setFormData({...formData, picRepd: v}))}
                                {renderFormInput('Tgl Update', formData.tanggalUpdate, v => setFormData({...formData, tanggalUpdate: v}), 'date')}
                             </>
                        )}
                        {isDisposisi && (
                            <>
                                {renderFormInput('No Disposisi', formData.noDisposisi, v => setFormData({...formData, noDisposisi: v}))}
                                {renderFormInput('Klasifikasi', formData.klasifikasi, v => setFormData({...formData, klasifikasi: v}))}
                                <div className="md:col-span-2">
                                    {renderFormInput('Deskripsi', formData.jobType, v => setFormData({...formData, jobType: v}))}
                                </div>
                            </>
                        )}
                        {isInternalMemo && (
                             <>
                                {renderFormInput('No Internal Memo', formData.noInternalMemo, v => setFormData({...formData, noInternalMemo: v}))}
                                {renderFormInput('Deskripsi', formData.jobType, v => setFormData({...formData, jobType: v}))}
                                {renderFormInput('Tgl Aktifasi', formData.activationDate, v => setFormData({...formData, activationDate: v}), 'date')}
                             </>
                        )}
                        {!isReportSurat && (
                             <div className="md:col-span-2">
                                 {renderFormInput('Nama Pekerjaan', formData.jobType, v => setFormData({...formData, jobType: v}), 'text', 'Deskripsi pekerjaan...', true)}
                             </div>
                        )}
                        {!isReportSurat && !isInternalMemo && (
                             <>
                                {renderFormInput('Deadline', formData.deadline, v => setFormData({...formData, deadline: v}), 'date', '', true)}
                                {isProductionMaster && renderFormInput('Tgl Aktifasi', formData.activationDate, v => setFormData({...formData, activationDate: v}), 'date', '', true)}
                             </>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Status Pekerjaan</label>
                            <select 
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm bg-white"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as Status})}
                            >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Hold">Hold</option>
                                <option value="Cancel">Cancel</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: DETAIL & CHECKLIST */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                        Detail & Checklist
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Keterangan Tambahan</label>
                            <textarea 
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm"
                                placeholder="Tambahkan catatan detail..."
                                value={formData.keterangan || ''}
                                onChange={e => setFormData({...formData, keterangan: e.target.value})}
                            />
                        </div>

                        {/* DISPOSISI CHECKLIST */}
                        {isDisposisi && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Persetujuan (Approval)</label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                     {['approveHeadDept', 'approveHeadDiv', 'approveRegional', 'approveVP', 'approveBOD'].map((key) => (
                                        <label key={key} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-white transition">
                                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={!!formData[key as keyof Job]} onChange={(e) => handleCheckboxChange(key as keyof Job, e.target.checked)} />
                                            <span className="text-sm font-medium text-gray-700">{key.replace('approve', '')}</span>
                                        </label>
                                     ))}
                                </div>
                                <div className="border-t border-gray-200 my-4"></div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Dokumen</label>
                                <div className="flex gap-4">
                                     {['docSoftCopy', 'docLampiran', 'docHardCopy'].map((key) => (
                                        <label key={key} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-white transition">
                                            <input type="checkbox" className="w-4 h-4 text-green-600 rounded focus:ring-green-500" checked={!!formData[key as keyof Job]} onChange={(e) => handleCheckboxChange(key as keyof Job, e.target.checked)} />
                                            <span className="text-sm font-medium text-gray-700">{key.replace('doc', '')}</span>
                                        </label>
                                     ))}
                                </div>
                            </div>
                        )}

                        {/* INTERNAL MEMO CHECKLIST */}
                        {isInternalMemo && (
                             <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Dokumen</label>
                                        <div className="flex gap-4">
                                            {['docSoftCopy', 'docHardCopy'].map((key) => (
                                                <label key={key} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-white transition">
                                                    <input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={!!formData[key as keyof Job]} onChange={(e) => handleCheckboxChange(key as keyof Job, e.target.checked)} />
                                                    <span className="text-sm font-medium text-gray-700">{key.replace('doc', '')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Link Aktifasi</label>
                                        <div className="flex gap-2">
                                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded mt-2" checked={!!formData.hasLinkAktifasi} onChange={(e) => handleCheckboxChange('hasLinkAktifasi', e.target.checked)} />
                                            <input 
                                                type="text" 
                                                placeholder="Paste link disini..."
                                                disabled={!formData.hasLinkAktifasi}
                                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded disabled:bg-gray-100"
                                                value={formData.linkAktifasi || ''}
                                                onChange={e => setFormData({...formData, linkAktifasi: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PENYESUAIAN CHECKLIST */}
                        {isPenyesuaian && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-3">Validasi</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.isCabangConfirmed} onChange={(e) => handleCheckboxChange('isCabangConfirmed', e.target.checked)} /><span className="text-sm font-medium">Konfirmasi Cabang</span></label>
                                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.isDisposition} onChange={(e) => handleCheckboxChange('isDisposition', e.target.checked)} /><span className="text-sm font-medium">Disposisi</span></label>
                                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={formData.isApproved} onChange={(e) => handleCheckboxChange('isApproved', e.target.checked)} /><span className="text-sm font-bold text-red-700">Approve & Complete</span></label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex justify-end pt-4 gap-3 sticky bottom-4">
                    <button type="button" onClick={handleCancel} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm">
                        Batal
                    </button>
                    <button type="submit" className="px-8 py-3 bg-[#002F6C] text-white rounded-xl font-bold hover:bg-blue-900 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                        {editingId ? 'Update Data' : 'Simpan Data'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* JOB DETAIL MODAL */}
       {selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="bg-[#002F6C] p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Tag className="w-32 h-32" /></div>
                    <div className="relative z-10">
                         <div className="flex items-center gap-2 text-blue-200 text-xs font-bold tracking-wider uppercase mb-2">
                             {selectedJob.category} &bull; {selectedJob.subCategory}
                         </div>
                        <h2 className="text-2xl font-bold leading-tight mb-2">{selectedJob.jobType}</h2>
                        <div className="flex items-center gap-2 text-sm text-blue-100 opacity-90">
                            <MapPin className="w-4 h-4" /> {selectedJob.branchDept}
                        </div>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="flex justify-between items-center">
                        {getStatusBadge(selectedJob.status, selectedJob.deadline)}
                        <span className="text-xs text-gray-500 font-mono">ID: {selectedJob.id.slice(0,8)}</span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Keterangan</h4>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedJob.keterangan || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="block text-xs text-gray-400 mb-1">Tanggal Input</span><span className="font-semibold text-gray-700">{new Date(selectedJob.dateInput).toLocaleDateString()}</span></div>
                        <div><span className="block text-xs text-gray-400 mb-1">Deadline</span><span className="font-semibold text-gray-700">{new Date(selectedJob.deadline).toLocaleDateString()}</span></div>
                        <div><span className="block text-xs text-gray-400 mb-1">PIC / User</span><span className="font-semibold text-gray-700">{selectedJob.createdBy}</span></div>
                        {selectedJob.activationDate && <div><span className="block text-xs text-gray-400 mb-1">Tgl Aktifasi</span><span className="font-semibold text-gray-700">{new Date(selectedJob.activationDate).toLocaleDateString()}</span></div>}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    {canEditJob(selectedJob) && (
                         <button onClick={() => { handleEdit(selectedJob); setSelectedJob(null); }} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2">
                             <Pencil className="w-4 h-4" /> Edit Data Lengkap
                         </button>
                    )}
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

