
import React, { useState, useRef } from 'react';
import { Job, Status, User } from '../types';
import { Plus, Upload, Trash2, X, Search, FileDown, Pencil } from 'lucide-react';

interface JobManagerProps {
  category: string;
  subCategory: string;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  onBulkAddJobs: (jobs: Job[]) => void;
  currentUser: User;
  isDarkMode?: boolean;
}

export const JobManager: React.FC<JobManagerProps> = ({
  category,
  subCategory,
  jobs,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onBulkAddJobs,
  currentUser,
  isDarkMode = false
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Job>>({
    status: 'Pending',
    dateInput: new Date().toISOString().split('T')[0],
    keterangan: ''
  });

  // Theme Helpers
  const cardClass = isDarkMode ? "bg-gray-800 border-gray-700 shadow-lg" : "bg-white border-gray-100 shadow-sm";
  const textTitle = isDarkMode ? "text-white" : "text-gray-800";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const textLabel = isDarkMode ? "text-gray-300" : "text-gray-700";
  const inputClass = isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400" : "border-gray-300 focus:ring-blue-500";
  const tableHeaderClass = isDarkMode ? "bg-gray-900 text-gray-300 border-gray-700" : "bg-gray-50 text-gray-600 border-gray-200";
  const tableRowClass = isDarkMode ? "hover:bg-gray-700 border-gray-700" : "hover:bg-gray-50 border-gray-100";
  const tableText = isDarkMode ? "text-gray-200" : "text-gray-800";
  const buttonSecondary = isDarkMode ? "bg-gray-700 text-white hover:bg-gray-600 border-gray-600" : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300";

  const isProductionMaster = category === "Produksi Master Data";

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setFormData({
      dateInput: job.dateInput,
      branchDept: job.branchDept,
      jobType: job.jobType,
      status: job.status,
      deadline: job.deadline,
      activationDate: job.activationDate,
      keterangan: job.keterangan || ''
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
      keterangan: ''
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
            keterangan: formData.keterangan
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
            createdBy: currentUser.email
        };
        onAddJob(newJob);
    }
    
    handleCancel(); // Reset and go back to list
  };

  const handleDownloadTemplate = () => {
    const headers = isProductionMaster
      ? "Tanggal Input (YYYY-MM-DD),Cabang/Dept,Jenis Pekerjaan,Status,Dateline (YYYY-MM-DD),Keterangan,Tanggal Aktifasi (YYYY-MM-DD)"
      : "Tanggal Input (YYYY-MM-DD),Cabang/Dept,Jenis Pekerjaan,Status,Dateline (YYYY-MM-DD),Keterangan";

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
            if (rawStatus === 'In Progress' || rawStatus === 'Completed' || rawStatus === 'Overdue') {
                validStatus = rawStatus;
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

  const filteredJobs = jobs.filter(j => 
    j.category === category && 
    j.subCategory === subCategory &&
    (j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || 
     j.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (j.keterangan && j.keterangan.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const getStatusColor = (status: Status, deadline: string) => {
    const isOverdue = new Date() > new Date(deadline) && status !== 'Completed';
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-200';
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-100';
    }
  };

  return (
    <div className={`${cardClass} rounded-xl border min-h-[600px] flex flex-col`}>
      <div className={`p-6 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <div>
          <div className={`flex items-center text-sm mb-1 ${textSub}`}>
            <span>{category}</span>
            <span className="mx-2">/</span>
            <span className={`font-medium ${textTitle}`}>{subCategory}</span>
          </div>
          <h2 className={`text-xl font-bold ${textTitle}`}>Daftar Pekerjaan</h2>
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
                className={`flex items-center justify-center px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${buttonSecondary}`}
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
                className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
            <h3 className={`text-lg font-semibold mb-6 ${textTitle}`}>{editingId ? 'Edit Data Pekerjaan' : 'Input Data Pekerjaan Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Tanggal Input</label>
                  <input 
                    type="date" 
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass}`}
                    value={formData.dateInput}
                    onChange={e => setFormData({...formData, dateInput: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Cabang / Dept</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Jakarta / Ops"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass}`}
                    value={formData.branchDept}
                    onChange={e => setFormData({...formData, branchDept: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Jenis Pekerjaan</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Deskripsi pekerjaan..."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass}`}
                    value={formData.jobType}
                    onChange={e => setFormData({...formData, jobType: e.target.value})}
                  />
                </div>

                 <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Keterangan (Optional)</label>
                  <textarea 
                    placeholder="Tambahkan catatan atau keterangan tambahan..."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 min-h-[80px] ${inputClass}`}
                    value={formData.keterangan || ''}
                    onChange={e => setFormData({...formData, keterangan: e.target.value})}
                  />
                </div>

                {isProductionMaster && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Tanggal Aktifasi</label>
                    <input 
                      type="date" 
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass}`}
                      value={formData.activationDate || ''}
                      onChange={e => setFormData({...formData, activationDate: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Status</label>
                  <select 
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass}`}
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as Status})}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textLabel}`}>Dateline (Batas Waktu)</label>
                  <input 
                    type="date" 
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${inputClass}`}
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                 <button 
                  type="button"
                  onClick={handleCancel}
                  className={`px-6 py-2 border rounded-lg transition-colors font-medium shadow-sm ${buttonSecondary}`}
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
                placeholder="Cari Cabang, Jenis Pekerjaan, atau Keterangan..." 
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 ${inputClass}`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className="w-full text-sm text-left">
                <thead className={`${tableHeaderClass} border-b font-semibold`}>
                  <tr>
                    <th className="p-4 whitespace-nowrap">Tanggal</th>
                    <th className="p-4 whitespace-nowrap">Cabang / Dept</th>
                    <th className="p-4">Jenis Pekerjaan</th>
                    <th className="p-4">Keterangan</th>
                    {isProductionMaster && <th className="p-4 whitespace-nowrap">Aktifasi</th>}
                    <th className="p-4 whitespace-nowrap">Status</th>
                    <th className="p-4 whitespace-nowrap">Dateline</th>
                    <th className="p-4 whitespace-nowrap">Oleh</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={isProductionMaster ? 9 : 8} className="p-8 text-center text-gray-400">
                        Belum ada data pekerjaan. Gunakan tombol "Import Excel/CSV" atau "Tambah Manual".
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} className={`${tableRowClass} transition-colors`}>
                        <td className={`p-4 ${tableText}`}>{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                        <td className={`p-4 font-medium ${tableText}`}>{job.branchDept}</td>
                        <td className={`p-4 max-w-xs ${tableText}`}>{job.jobType}</td>
                        <td className="p-4 max-w-xs text-gray-500 italic">{job.keterangan || '-'}</td>
                        {isProductionMaster && (
                          <td className={`p-4 ${tableText}`}>{job.activationDate ? new Date(job.activationDate).toLocaleDateString('id-ID') : '-'}</td>
                        )}
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
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEdit(job)}
                                className={`p-1.5 rounded-md transition-all ${isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => onDeleteJob(job.id)}
                                className={`p-1.5 rounded-md transition-all ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
