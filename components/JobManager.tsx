import React, { useState, useRef } from 'react';
import { Job, Status, User } from '../types';
import { Plus, Upload, X, Search, FileDown, Pencil, CheckSquare, Calendar, Clock, User as UserIcon, Tag, MapPin, FileText } from 'lucide-react';

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

  const [formData, setFormData] = useState<Partial<Job>>({
    status: 'Pending',
    dateInput: new Date().toISOString().split('T')[0],
    keterangan: '',
    isCabangConfirmed: false,
    isDisposition: false,
    isApproved: false
  });

  const isProductionMaster = category === "Produksi Master Data";
  const isPenyesuaian = category === "Penyesuaian";

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setFormData({
      dateInput: job.dateInput,
      branchDept: job.branchDept,
      jobType: job.jobType,
      status: job.status,
      deadline: job.deadline,
      activationDate: job.activationDate,
      keterangan: job.keterangan || '',
      isCabangConfirmed: job.isCabangConfirmed || false,
      isDisposition: job.isDisposition || false,
      isApproved: job.isApproved || false
    });
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
    setFormData({
      status: 'Pending',
      dateInput: new Date().toISOString().split('T')[0],
      branchDept: '',
      jobType: '',
      deadline: '',
      keterangan: '',
      isCabangConfirmed: false,
      isDisposition: false,
      isApproved: false
    });
  };

  const handleCheckboxChange = (field: 'isCabangConfirmed' | 'isDisposition' | 'isApproved', checked: boolean) => {
    setFormData(prev => {
        const newData = { ...prev, [field]: checked };
        
        // Logika Auto Completed saat Approve dicentang
        if (field === 'isApproved' && checked) {
            newData.status = 'Completed';
        }
        
        return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        // Update existing
        onUpdateJob(editingId, {
            dateInput: formData.dateInput,
            branchDept: formData.branchDept,
            jobType: formData.jobType,
            status: formData.status as Status,
            deadline: formData.deadline,
            activationDate: isProductionMaster ? formData.activationDate : undefined,
            keterangan: formData.keterangan,
            isCabangConfirmed: formData.isCabangConfirmed,
            isDisposition: formData.isDisposition,
            isApproved: formData.isApproved
        });
    } else {
        // Create new
        const newJob: Job = {
            id: crypto.randomUUID(),
            category,
            subCategory,
            dateInput: formData.dateInput || new Date().toISOString().split('T')[0],
            branchDept: formData.branchDept || '',
            jobType: formData.jobType || '',
            status: (formData.status as Status) || 'Pending',
            deadline: formData.deadline || '',
            activationDate: isProductionMaster ? formData.activationDate : undefined,
            keterangan: formData.keterangan || '',
            createdBy: currentUser.email,
            isCabangConfirmed: formData.isCabangConfirmed,
            isDisposition: formData.isDisposition,
            isApproved: formData.isApproved
        };
        onAddJob(newJob);
    }
    
    handleCancel(); // Reset and go back to list
  };

  const handleDownloadTemplate = () => {
    const headers = isProductionMaster
      ? "Tanggal Input (YYYY-MM-DD),Cabang/Dept,Nama Pekerjaan,Status,Deadline (YYYY-MM-DD),Keterangan,Tanggal Aktifasi (YYYY-MM-DD)"
      : "Tanggal Input (YYYY-MM-DD),Cabang/Dept,Nama Pekerjaan,Status,Deadline (YYYY-MM-DD),Keterangan";

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const exampleRow = isProductionMaster
      ? `${today},Jakarta,Input Master Vendor,Pending,${nextWeek},Notes optional,${today}`
      : `${today},Bandung,Update Routing,In Progress,${nextWeek},Notes optional`;

    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleRow;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_${category}_${subCategory}.csv`);
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
        
        if (cols.length >= 5 && cols[0]) {
            const rawStatus = cols[3]?.trim();
            let validStatus: Status = 'Pending';
            const allowedStatuses = ['In Progress', 'Completed', 'Overdue', 'Hold', 'Cancel'];
            if (allowedStatuses.includes(rawStatus)) {
                validStatus = rawStatus as Status;
            }

            // CSV Columns mapping based on template
            // 0: Date, 1: Branch, 2: Type, 3: Status, 4: Deadline, 5: Keterangan, 6: Activation (if master)
            
            newJobs.push({
                id: crypto.randomUUID(),
                category,
                subCategory,
                dateInput: cols[0]?.trim() || new Date().toISOString().split('T')[0],
                branchDept: cols[1]?.trim() || 'Unknown',
                jobType: cols[2]?.trim() || 'Imported Job',
                status: validStatus,
                deadline: cols[4]?.trim() || new Date().toISOString().split('T')[0],
                keterangan: cols[5]?.trim() || '',
                activationDate: isProductionMaster ? cols[6]?.trim() : undefined,
                createdBy: currentUser.email
            });
        }
      }
      
      if (newJobs.length > 0) {
          onBulkAddJobs(newJobs);
          alert(`Berhasil mengimport ${newJobs.length} data pekerjaan!`);
      } else {
          alert("Gagal membaca file atau format tidak sesuai. Pastikan menggunakan Template yang disediakan dan tidak ada baris kosong.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const filteredJobs = jobs.filter(j => {
    // 1. Filter Kategori Menu
    if (j.category !== category || j.subCategory !== subCategory) return false;

    // 2. Filter Hak Akses (Hanya bisa dilihat oleh masing-masing akun saja)
    if (j.createdBy !== currentUser.email) return false;

    // 3. Filter Pencarian
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

  // Helper untuk mengecek apakah user boleh mengedit
  const canEditJob = (job: Job) => {
      // Admin bisa edit semua
      if (currentUser.role === 'Admin') return true;
      // User hanya bisa edit jika mereka yang membuat (createdBy match email)
      return job.createdBy === currentUser.email;
  };

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
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.txt" 
                onChange={handleFileUpload}
              />
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                title="Download Template Excel/CSV"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Template
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel/CSV
              </button>
              <button 
                onClick={() => setView('form')}
                className="flex items-center justify-center px-4 py-2 bg-[#EE2E24] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Manual
              </button>
            </>
          ) : (
             <button 
                onClick={handleCancel}
                className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Kembali ke List
              </button>
          )}
        </div>
      </div>

      <div className="p-6 flex-1">
        {view === 'form' ? (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-6">{editingId ? 'Edit Data Pekerjaan' : 'Input Data Pekerjaan Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Input</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.dateInput}
                    onChange={e => setFormData({...formData, dateInput: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cabang / Dept</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Jakarta / Ops"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.branchDept}
                    onChange={e => setFormData({...formData, branchDept: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pekerjaan</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Deskripsi pekerjaan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.jobType}
                    onChange={e => setFormData({...formData, jobType: e.target.value})}
                  />
                </div>

                 <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (Optional)</label>
                  <textarea 
                    placeholder="Tambahkan catatan atau keterangan tambahan..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                    value={formData.keterangan || ''}
                    onChange={e => setFormData({...formData, keterangan: e.target.value})}
                  />
                </div>

                {isPenyesuaian && (
                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                            <CheckSquare className="w-4 h-4 mr-2 text-blue-600"/> 
                            Validasi & Persetujuan
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    checked={formData.isCabangConfirmed}
                                    onChange={(e) => handleCheckboxChange('isCabangConfirmed', e.target.checked)}
                                />
                                <span className="text-sm text-gray-700 font-medium">Konfirmasi Cabang</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    checked={formData.isDisposition}
                                    onChange={(e) => handleCheckboxChange('isDisposition', e.target.checked)}
                                />
                                <span className="text-sm text-gray-700 font-medium">Disposisi</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                    checked={formData.isApproved}
                                    onChange={(e) => handleCheckboxChange('isApproved', e.target.checked)}
                                />
                                <span className="text-sm text-gray-700 font-bold">Approve</span>
                            </label>
                        </div>
                        {formData.isApproved && (
                             <p className="text-xs text-green-600 mt-2 ml-1 italic">* Status otomatis menjadi Completed saat Approve dicentang.</p>
                        )}
                    </div>
                )}

                {isProductionMaster && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Aktifasi</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.activationDate || ''}
                      onChange={e => setFormData({...formData, activationDate: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                 <button 
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-[#002F6C] text-white rounded-lg hover:bg-blue-900 transition-colors font-medium shadow-sm"
                >
                  {editingId ? 'Update Data' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari Cabang, Nama Pekerjaan, atau Keterangan..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Tanggal</th>
                    <th className="p-4 whitespace-nowrap">Cabang / Dept</th>
                    <th className="p-4">Nama Pekerjaan</th>
                    <th className="p-4">Keterangan</th>
                    {isProductionMaster && <th className="p-4 whitespace-nowrap">Aktifasi</th>}
                    <th className="p-4 whitespace-nowrap">Status</th>
                    <th className="p-4 whitespace-nowrap">Deadline</th>
                    <th className="p-4 whitespace-nowrap">Oleh</th>
                    <th className="p-4 text-center">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={isProductionMaster ? 9 : 8} className="p-8 text-center text-gray-400">
                        {currentUser.role === 'Admin' 
                            ? 'Belum ada data pekerjaan Anda. Gunakan tombol "Import Excel/CSV" atau "Tambah Manual".'
                            : 'Anda belum memiliki data pekerjaan di kategori ini.'}
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => {
                      const userCanEdit = canEditJob(job);
                      
                      return (
                      <tr 
                        key={job.id} 
                        onClick={() => setSelectedJob(job)}
                        className="hover:bg-gray-50 group transition-colors cursor-pointer"
                      >
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
                            disabled={!userCanEdit} // Disable jika tidak punya akses
                            onClick={(e) => e.stopPropagation()} // Prevent modal popup
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
                        <td className="p-4 text-center">
                          {userCanEdit && (
                              <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(job);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                              </div>
                          )}
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

                    {/* Checkboxes for Penyesuaian */}
                    {selectedJob.category === 'Penyesuaian' && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center gap-2 ${selectedJob.isCabangConfirmed ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedJob.isCabangConfirmed ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                    {selectedJob.isCabangConfirmed && <CheckSquare className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-xs font-semibold">Konfirmasi Cabang</span>
                            </div>
                            <div className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center gap-2 ${selectedJob.isDisposition ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedJob.isDisposition ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                                    {selectedJob.isDisposition && <CheckSquare className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-xs font-semibold">Disposisi</span>
                            </div>
                            <div className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center gap-2 ${selectedJob.isApproved ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedJob.isApproved ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                                    {selectedJob.isApproved && <CheckSquare className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-xs font-semibold">Approved</span>
                            </div>
                        </div>
                    )}

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
                         {selectedJob.activationDate && (
                            <div className="col-span-2 mt-2">
                                <span className="block text-gray-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal Aktifasi</span>
                                <span className="font-medium text-gray-700">
                                    {new Date(selectedJob.activationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    {canEditJob(selectedJob) ? (
                         <button 
                            onClick={() => {
                                handleEdit(selectedJob);
                                setSelectedJob(null);
                            }}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Pencil className="w-4 h-4" /> Edit Pekerjaan Ini
                        </button>
                    ) : (
                        <p className="text-xs text-gray-400 italic">Anda hanya dapat melihat data ini (Edit terbatas pada pembuat/admin)</p>
                    )}
                </div>
            </div>
        </div>
       )}
    </div>
  );
};
