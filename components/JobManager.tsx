
import React, { useState, useRef, useMemo } from 'react';
import { Job, Status, User } from '../types';
import { Plus, Upload, Trash2, X, Search, FileDown, Pencil, Download, Eraser } from 'lucide-react';

interface JobManagerProps {
  category: string;
  subCategory: string;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  onDeleteCancelled: () => void;
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
  onDeleteCancelled,
  onBulkAddJobs,
  currentUser
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

  const handleCancelForm = () => {
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
    
    handleCancelForm();
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

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => 
        j.category === category && 
        j.subCategory === subCategory &&
        (j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || 
        j.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.keterangan && j.keterangan.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [jobs, category, subCategory, searchTerm]);

  const hasCancelledJobs = useMemo(() => {
    return filteredJobs.some(j => j.status === 'Cancel' || j.status === 'Drop');
  }, [filteredJobs]);

  const downloadData = () => {
    const headers = [
      "Kategori", "Sub Kategori", "Tanggal Input", "Cabang/Dept", 
      "Jenis Pekerjaan", "Status", "Deadline", "Keterangan", "Oleh"
    ];
    
    if (isProductionMaster) {
        headers.push("Tanggal Aktifasi");
    }

    const csvRows = [headers.join(",")];
    
    filteredJobs.forEach(job => {
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
        
        if (isProductionMaster) {
            row.push(`"${job.activationDate || ''}"`);
        }
        
        csvRows.push(row.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Data_${category}_${subCategory}_${new Date().toISOString().split('T')[0]}.csv`);
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
            const validStatuses = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Hold', 'Cancel', 'Drop', 'On Proses', 'DONE'];
            let validStatus: Status = validStatuses.includes(rawStatus) ? rawStatus as Status : 'Pending';

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

  const getStatusColor = (status: Status, deadline: string) => {
    const isOverdue = new Date() > new Date(deadline) && status !== 'Completed' && status !== 'DONE' && status !== 'Drop' && status !== 'Cancel';
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-200';
    switch (status) {
      case 'Completed':
      case 'DONE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': 
      case 'On Proses':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Hold':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancel':
      case 'Drop':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default: return 'bg-sky-50 text-sky-800 border-sky-100';
    }
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
          <h2 className="text-xl font-bold text-gray-800">Daftar Pekerjaan</h2>
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
                onClick={downloadData}
                className="flex items-center justify-center px-4 py-2 bg-[#002F6C] text-white rounded-lg hover:bg-blue-900 transition-colors text-sm font-medium"
                title="Download Data Saat Ini"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
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
                Import
              </button>
              
              {hasCancelledJobs && (
                <button 
                  onClick={onDeleteCancelled}
                  className="flex items-center justify-center px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  title="Hapus Semua Data Berstatus Cancel/Drop"
                >
                  <Eraser className="w-4 h-4 mr-2" />
                  Bersihkan Cancel
                </button>
              )}

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
                onClick={handleCancelForm}
                className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Kembali
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Pekerjaan</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dateline (Batas Waktu)</label>
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
                  onClick={handleCancelForm}
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
                placeholder="Cari Cabang, Jenis Pekerjaan, atau Keterangan..." 
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
                    <th className="p-4">Jenis Pekerjaan</th>
                    <th className="p-4">Keterangan</th>
                    {isProductionMaster && <th className="p-4 whitespace-nowrap">Aktifasi</th>}
                    <th className="p-4 whitespace-nowrap">Status</th>
                    <th className="p-4 whitespace-nowrap">Dateline</th>
                    <th className="p-4 whitespace-nowrap">Oleh</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={isProductionMaster ? 9 : 8} className="p-8 text-center text-gray-400">
                        Belum ada data pekerjaan. Gunakan tombol "Import Excel/CSV" atau "Tambah Manual".
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="p-4">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                        <td className="p-4 font-medium text-gray-800">{job.branchDept}</td>
                        <td className="p-4 max-w-xs">{job.jobType}</td>
                        <td className="p-4 max-w-xs text-gray-500 italic">{job.keterangan || '-'}</td>
                        {isProductionMaster && (
                          <td className="p-4">{job.activationDate ? new Date(job.activationDate).toLocaleDateString('id-ID') : '-'}</td>
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
                             <option value="Hold">Hold</option>
                             <option value="Cancel">Cancel</option>
                          </select>
                        </td>
                        <td className="p-4">
                           <input 
                              type="date"
                              className={`text-sm border-b border-dashed border-gray-300 bg-transparent focus:outline-none focus:border-blue-500 font-medium ${new Date() > new Date(job.deadline) && job.status !== 'Completed' && job.status !== 'DONE' && job.status !== 'Drop' && job.status !== 'Cancel' ? 'text-red-600' : 'text-gray-600'}`}
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
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => onDeleteJob(job.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
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
