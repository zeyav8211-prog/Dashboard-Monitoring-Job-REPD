
import React, { useState, useRef } from 'react';
import { Job, Status, User } from '../types';
import { Plus, Upload, X, Search, FileDown, Pencil, CheckSquare, Calendar, Clock, User as UserIcon, Tag, MapPin, FileText, Link as LinkIcon, Users } from 'lucide-react';

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
    // Reset specific fields
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

  const isProductionMaster = category === "Produksi Master Data";
  const isPenyesuaian = category === "Penyesuaian";
  const isReportSurat = category === "Report Surat";
  
  const isEmailMasuk = isReportSurat && subCategory === "Email Masuk";
  const isDisposisi = isReportSurat && subCategory === "Disposisi";
  const isInternalMemo = isReportSurat && subCategory === "Internal Memo";

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setFormData({
      ...initialFormState,
      ...job, // Load all job data
      // Ensure date strings are valid for input date
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
        
        // Logika Auto Completed saat Approve Penyesuaian dicentang
        if (field === 'isApproved' && isPenyesuaian && checked) {
            newData.status = 'Completed';
        }
        
        return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up formData before saving
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
            jobType: formData.jobType || '', // Maps to Subject Email or Deskripsi
            status: (formData.status as Status) || 'Pending',
            deadline: formData.deadline || new Date().toISOString().split('T')[0], // Default deadline
            createdBy: currentUser.email,
            ...cleanData
        } as Job;
        onAddJob(newJob);
    }
    
    handleCancel();
  };

  // ... (Template Download logic omitted for brevity in this specific update unless requested, keeping generic)
  const handleDownloadTemplate = () => {
      // Placeholder for template download logic
      alert("Template download belum dikonfigurasi untuk kategori ini.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic implementation reuse
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
        if (cols.length >= 5 && cols[0]) {
             // Simplified CSV parser for demo
             newJobs.push({
                id: crypto.randomUUID(),
                category,
                subCategory,
                dateInput: cols[0]?.trim() || new Date().toISOString().split('T')[0],
                branchDept: cols[1]?.trim() || 'Unknown',
                jobType: cols[2]?.trim() || 'Imported Job',
                status: 'Pending',
                deadline: new Date().toISOString().split('T')[0],
                keterangan: cols[5]?.trim() || '',
                createdBy: currentUser.email
            });
        }
      }
      if (newJobs.length > 0) onBulkAddJobs(newJobs);
    };
    reader.readAsText(file);
  };

  const filteredJobs = jobs.filter(j => {
    if (j.category !== category || j.subCategory !== subCategory) return false;
    if (j.createdBy !== currentUser.email) return false;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        return (
            j.branchDept.toLowerCase().includes(lowerTerm) || 
            j.jobType.toLowerCase().includes(lowerTerm) ||
            (j.keterangan && j.keterangan.toLowerCase().includes(lowerTerm))
        );
    }
    return true;
  });

  const getStatusColor = (status: Status, deadline: string) => {
    if (status === 'Hold') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (status === 'Cancel') return 'bg-gray-200 text-gray-800 border-gray-300';

    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(deadline);
    d.setHours(0,0,0,0);

    // Overdue
    if (d < today && status !== 'Completed') return 'bg-red-100 text-red-800 border-red-200';
    
    // Warning H-1
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
    if (text.length > 40) return '...' + text.slice(-40);
    return text;
  };

  const canEditJob = (job: Job) => {
      if (currentUser.role === 'Admin') return true;
      return job.createdBy === currentUser.email;
  };

  // --- RENDER HELPERS FOR REPORT SURAT ---

  const renderTableHeader = () => {
    if (isEmailMasuk) {
        return (
            <tr>
                <th className="p-4 whitespace-nowrap">TGL EMAIL MASUK</th>
                <th className="p-4 whitespace-nowrap">PIC USER</th>
                <th className="p-4 whitespace-nowrap">CABANG/DEPT</th>
                <th className="p-4 whitespace-nowrap">SUBJECT EMAIL</th>
                <th className="p-4 whitespace-nowrap">JENIS PENGAJUAN</th>
                <th className="p-4 whitespace-nowrap">Tanggal Update</th>
                <th className="p-4 whitespace-nowrap">PIC REPD</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 text-center">Edit</th>
            </tr>
        );
    }
    if (isDisposisi) {
        return (
            <tr>
                <th className="p-4 whitespace-nowrap">TANGGAL</th>
                <th className="p-4 whitespace-nowrap">NO DISPOSISI</th>
                <th className="p-4 whitespace-nowrap">CABANG / DEPT</th>
                <th className="p-4 whitespace-nowrap">KLASIFIKASI</th>
                <th className="p-4 whitespace-nowrap">DESKRIPSI</th>
                <th className="p-4 whitespace-nowrap">STATUS</th>
                <th className="p-4 whitespace-nowrap">KETERANGAN</th>
                <th className="p-4 text-center">Edit</th>
            </tr>
        );
    }
    if (isInternalMemo) {
         return (
            <tr>
                <th className="p-4 whitespace-nowrap">TANGGAL</th>
                <th className="p-4 whitespace-nowrap">NO INTERNAL MEMO</th>
                <th className="p-4 whitespace-nowrap">CABANG / DEPT</th>
                <th className="p-4 whitespace-nowrap">DESKRIPSI</th>
                <th className="p-4 whitespace-nowrap">Tanggal Aktifasi</th>
                <th className="p-4 whitespace-nowrap">KETERANGAN</th>
                <th className="p-4 whitespace-nowrap">STATUS</th>
                <th className="p-4 text-center">Edit</th>
            </tr>
        );
    }

    // Default Header
    return (
        <tr>
            <th className="p-4 whitespace-nowrap">Tanggal Input</th>
            <th className="p-4 whitespace-nowrap">Cabang / Dept</th>
            <th className="p-4">Nama Pekerjaan</th>
            <th className="p-4">Keterangan</th>
            {isProductionMaster && <th className="p-4 whitespace-nowrap">Aktifasi</th>}
            <th className="p-4 whitespace-nowrap">Status</th>
            <th className="p-4 whitespace-nowrap">Deadline</th>
            <th className="p-4 whitespace-nowrap">Oleh</th>
            <th className="p-4 text-center">Edit</th>
        </tr>
    );
  };

  const renderTableRow = (job: Job) => {
    const userCanEdit = canEditJob(job);
    const commonEditButton = userCanEdit && (
        <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(job); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
        >
            <Pencil className="w-4 h-4" />
        </button>
    );

    if (isEmailMasuk) {
        return (
            <>
                <td className="p-4">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                <td className="p-4">{job.picUser || '-'}</td>
                <td className="p-4 font-medium">{job.branchDept}</td>
                <td className="p-4">{job.jobType}</td>
                <td className="p-4">{job.jenisPengajuan || '-'}</td>
                <td className="p-4">{job.tanggalUpdate ? new Date(job.tanggalUpdate).toLocaleDateString('id-ID') : '-'}</td>
                <td className="p-4">{job.picRepd || '-'}</td>
                <td className="p-4">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(job.status, job.deadline)}`}>
                        {job.status}
                     </span>
                </td>
                <td className="p-4 text-center">{commonEditButton}</td>
            </>
        );
    }

    if (isDisposisi) {
        return (
            <>
                 <td className="p-4">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                 <td className="p-4">{job.noDisposisi || '-'}</td>
                 <td className="p-4 font-medium">{job.branchDept}</td>
                 <td className="p-4">{job.klasifikasi || '-'}</td>
                 <td className="p-4">{job.jobType}</td>
                 <td className="p-4">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(job.status, job.deadline)}`}>
                        {job.status}
                     </span>
                 </td>
                 <td className="p-4 max-w-xs text-xs text-gray-500 truncate">{job.keterangan || '-'}</td>
                 <td className="p-4 text-center">{commonEditButton}</td>
            </>
        );
    }

    if (isInternalMemo) {
        return (
            <>
                 <td className="p-4">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                 <td className="p-4">{job.noInternalMemo || '-'}</td>
                 <td className="p-4 font-medium">{job.branchDept}</td>
                 <td className="p-4">{job.jobType}</td>
                 <td className="p-4">{job.activationDate ? new Date(job.activationDate).toLocaleDateString('id-ID') : '-'}</td>
                 <td className="p-4 max-w-xs text-xs text-gray-500 truncate">{job.keterangan || '-'}</td>
                 <td className="p-4">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(job.status, job.deadline)}`}>
                        {job.status}
                     </span>
                 </td>
                 <td className="p-4 text-center">{commonEditButton}</td>
            </>
        );
    }

    // Default Row
    return (
        <>
            <td className="p-4">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
            <td className="p-4 font-medium text-gray-800">{job.branchDept}</td>
            <td className="p-4 max-w-xs">{job.jobType}</td>
            <td className="p-4 max-w-xs text-gray-500 italic" title={job.keterangan}>
                {formatKeterangan(job.keterangan)}
                {isPenyesuaian && (job.isCabangConfirmed || job.isDisposition || job.isApproved) && (
                    <div className="flex gap-1 mt-1">
                        {job.isCabangConfirmed && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200">K. Cabang</span>}
                        {job.isDisposition && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded border border-indigo-200">Disposisi</span>}
                        {job.isApproved && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200 font-bold">Approved</span>}
                    </div>
                )}
            </td>
            {isProductionMaster && (
                <td className="p-4">{job.activationDate ? new Date(job.activationDate).toLocaleDateString('id-ID') : '-'}</td>
            )}
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
            <td className="p-4 text-xs text-gray-400">{job.createdBy || '-'}</td>
            <td className="p-4 text-center">{commonEditButton}</td>
        </>
    );
  };

  // --- FORM RENDER HELPERS ---

  const renderSpecificFormFields = () => {
      if (isEmailMasuk) {
          return (
            <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIC User</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.picUser || ''} onChange={e => setFormData({...formData, picUser: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Email</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.jobType || ''} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Pengajuan</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.jenisPengajuan || ''} onChange={e => setFormData({...formData, jenisPengajuan: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIC REPD</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.picRepd || ''} onChange={e => setFormData({...formData, picRepd: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Update</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.tanggalUpdate || ''} onChange={e => setFormData({...formData, tanggalUpdate: e.target.value})} />
                </div>
            </>
          );
      }

      if (isDisposisi) {
          return (
            <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No Disposisi</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.noDisposisi || ''} onChange={e => setFormData({...formData, noDisposisi: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Klasifikasi</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.klasifikasi || ''} onChange={e => setFormData({...formData, klasifikasi: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.jobType || ''} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                </div>
                
                {/* CHECKBOXES FOR DISPOSISI */}
                <div className="md:col-span-2 space-y-4 border-t pt-4 mt-2">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Approval</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                             {['approveHeadDept', 'approveHeadDiv', 'approveRegional', 'approveVP', 'approveBOD'].map((key) => (
                                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={!!formData[key as keyof Job]} onChange={(e) => handleCheckboxChange(key as keyof Job, e.target.checked)} />
                                    <span className="text-sm text-gray-700">{key.replace('approve', '')}</span>
                                </label>
                             ))}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kelengkapan Dokumen</label>
                        <div className="flex gap-6">
                             {['docSoftCopy', 'docLampiran', 'docHardCopy'].map((key) => (
                                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={!!formData[key as keyof Job]} onChange={(e) => handleCheckboxChange(key as keyof Job, e.target.checked)} />
                                    <span className="text-sm text-gray-700">{key.replace('doc', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                                </label>
                             ))}
                        </div>
                    </div>
                </div>
            </>
          );
      }

      if (isInternalMemo) {
          return (
            <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No Internal Memo</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.noInternalMemo || ''} onChange={e => setFormData({...formData, noInternalMemo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.jobType || ''} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Aktifasi</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.activationDate || ''} onChange={e => setFormData({...formData, activationDate: e.target.value})} />
                </div>

                {/* CHECKBOXES FOR INTERNAL MEMO */}
                <div className="md:col-span-2 space-y-4 border-t pt-4 mt-2">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kelengkapan Dokumen</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex gap-4">
                                {['docSoftCopy', 'docHardCopy'].map((key) => (
                                    <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={!!formData[key as keyof Job]} onChange={(e) => handleCheckboxChange(key as keyof Job, e.target.checked)} />
                                        <span className="text-sm text-gray-700">{key.replace('doc', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={!!formData.hasLinkAktifasi} onChange={(e) => handleCheckboxChange('hasLinkAktifasi', e.target.checked)} />
                                    <span className="text-sm text-gray-700">Link Aktifasi</span>
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="https://..." 
                                    disabled={!formData.hasLinkAktifasi}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100"
                                    value={formData.linkAktifasi || ''}
                                    onChange={e => setFormData({...formData, linkAktifasi: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sosialisasi</label>
                         <div className="flex gap-6">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={!!formData.sosialisasiCabang} onChange={(e) => handleCheckboxChange('sosialisasiCabang', e.target.checked)} />
                                <span className="text-sm text-gray-700">Cabang / Dept</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={!!formData.sosialisasiIT} onChange={(e) => handleCheckboxChange('sosialisasiIT', e.target.checked)} />
                                <span className="text-sm text-gray-700">IT</span>
                            </label>
                        </div>
                    </div>
                </div>
            </>
          );
      }

      // Default Fields
      return (
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pekerjaan</label>
            <input type="text" required placeholder="Deskripsi pekerjaan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.jobType || ''} onChange={e => setFormData({...formData, jobType: e.target.value})} />
        </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <span>{category}</span>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900">{subCategory}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Daftar Pekerjaan (Saya)</h2>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          {view === 'list' ? (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                <Upload className="w-4 h-4 mr-2" /> Import Excel/CSV
              </button>
              <button onClick={() => setView('form')} className="flex items-center justify-center px-4 py-2 bg-[#EE2E24] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4 mr-2" /> Tambah Manual
              </button>
            </>
          ) : (
             <button onClick={handleCancel} className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                <X className="w-4 h-4 mr-2" /> Kembali ke List
              </button>
          )}
        </div>
      </div>

      <div className="p-6 flex-1">
        {view === 'form' ? (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold mb-6">{editingId ? 'Edit Data' : 'Input Data Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isEmailMasuk ? 'Tgl Email Masuk' : 'Tanggal'}
                  </label>
                  <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cabang / Dept</label>
                  <input type="text" required placeholder="Contoh: Jakarta / Ops" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                </div>

                {/* DYNAMIC FORM FIELDS */}
                {renderSpecificFormFields()}

                 <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (Optional)</label>
                  <textarea placeholder="Tambahkan catatan atau keterangan tambahan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[80px]" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
                </div>

                {isPenyesuaian && (
                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center"><CheckSquare className="w-4 h-4 mr-2 text-blue-600"/> Validasi & Persetujuan</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.isCabangConfirmed} onChange={(e) => handleCheckboxChange('isCabangConfirmed', e.target.checked)} />
                                <span className="text-sm text-gray-700 font-medium">Konfirmasi Cabang</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.isDisposition} onChange={(e) => handleCheckboxChange('isDisposition', e.target.checked)} />
                                <span className="text-sm text-gray-700 font-medium">Disposisi</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={formData.isApproved} onChange={(e) => handleCheckboxChange('isApproved', e.target.checked)} />
                                <span className="text-sm text-gray-700 font-bold">Approve</span>
                            </label>
                        </div>
                    </div>
                )}

                {(isProductionMaster && !isInternalMemo) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Aktifasi</label>
                    <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.activationDate || ''} onChange={e => setFormData({...formData, activationDate: e.target.value})} />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Hold">Hold</option>
                    <option value="Cancel">Cancel</option>
                  </select>
                </div>

                {!isReportSurat && (
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                    </div>
                )}
              </div>

              <div className="flex justify-end pt-4 gap-2">
                 <button type="button" onClick={handleCancel} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Batal</button>
                <button type="submit" className="px-6 py-2 bg-[#002F6C] text-white rounded-lg hover:bg-blue-900 transition-colors font-medium">{editingId ? 'Update Data' : 'Simpan Data'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  {renderTableHeader()}
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400">
                          {currentUser.role === 'Admin' ? 'Belum ada data. Gunakan tombol "Import" atau "Tambah Manual".' : 'Anda belum memiliki data di kategori ini.'}
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} onClick={() => setSelectedJob(job)} className="hover:bg-gray-50 group transition-colors cursor-pointer">
                        {renderTableRow(job)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

       {/* Job Detail Modal - Generic for now, can be specialized if needed */}
       {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="bg-[#002F6C] p-6 text-white flex justify-between items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4"><Tag className="w-32 h-32" /></div>
                    <div className="relative z-10">
                         <div className="flex items-center gap-2 text-blue-200 text-sm mb-1"><span className="font-semibold uppercase tracking-wider">{selectedJob.category}</span><span>•</span><span>{selectedJob.subCategory}</span></div>
                        <h2 className="text-2xl font-bold leading-tight">{selectedJob.jobType}</h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-blue-100"><MapPin className="w-4 h-4" /><span>{selectedJob.branchDept}</span></div>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-20"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="flex flex-wrap gap-4 justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(selectedJob.status, selectedJob.deadline)}`}>{selectedJob.status}</div>
                    </div>
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2"><FileText className="w-4 h-4 text-gray-400" />Keterangan Lengkap</h4>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selectedJob.keterangan || "Tidak ada keterangan."}</div>
                    </div>
                    
                    {/* Disposisi Specific Details */}
                    {isDisposisi && (
                        <div className="border-t pt-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Checklist Disposisi</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {['Head Dept', 'Head Div', 'Regional', 'VP', 'BOD'].map(role => {
                                    const key = `approve${role.replace(' ', '')}` as keyof Job;
                                    return <div key={role} className={`flex items-center gap-2 ${selectedJob[key] ? 'text-blue-600 font-medium' : 'text-gray-400'}`}><CheckSquare className="w-3 h-3"/> {role}</div>
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
                        <div><span className="block text-gray-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal Input</span><span className="font-medium text-gray-700">{new Date(selectedJob.dateInput).toLocaleDateString('id-ID')}</span></div>
                        <div><span className="block text-gray-400 mb-1 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Dibuat Oleh</span><span className="font-medium text-gray-700">{selectedJob.createdBy || 'Unknown'}</span></div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    {canEditJob(selectedJob) ? (
                         <button onClick={() => { handleEdit(selectedJob); setSelectedJob(null); }} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"><Pencil className="w-4 h-4" /> Edit Pekerjaan Ini</button>
                    ) : <p className="text-xs text-gray-400 italic">Anda hanya dapat melihat data ini.</p>}
                </div>
            </div>
        </div>
       )}
    </div>
  );
};
