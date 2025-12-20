
import React, { useState, useMemo, useRef } from 'react';
import { Job, Status, User } from '../types';
import { Plus, X, Search, Pencil, CheckSquare, Square, Eye, Calendar, MapPin, User as UserIcon, Info, FileText, Download, Upload, FileType, Trash2, ClipboardCheck } from 'lucide-react';

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
  onBulkAddJobs,
  onDeleteJob,
  currentUser
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<Job | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Job>>({
    status: 'Pending',
    dateInput: new Date().toISOString().split('T')[0],
    keterangan: '',
    konfirmasiCabang: false,
    disposisi: false,
    approve: false
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => j.category === category && j.subCategory === subCategory && (j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || j.jobType.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [jobs, category, subCategory, searchTerm]);

  const handleEdit = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setEditingId(job.id);
    setFormData({
      dateInput: job.dateInput,
      branchDept: job.branchDept,
      jobType: job.jobType,
      status: job.status,
      deadline: job.deadline,
      keterangan: job.keterangan || '',
      konfirmasiCabang: job.konfirmasiCabang || false,
      disposisi: job.disposisi || false,
      approve: job.approve || false
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
      keterangan: '',
      konfirmasiCabang: false,
      disposisi: false,
      approve: false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const jobPayload = {
      dateInput: formData.dateInput,
      branchDept: formData.branchDept,
      jobType: formData.jobType,
      status: formData.status as Status,
      deadline: formData.deadline,
      keterangan: formData.keterangan,
      konfirmasiCabang: formData.konfirmasiCabang,
      disposisi: formData.disposisi,
      approve: formData.approve
    };
    if (editingId) onUpdateJob(editingId, jobPayload);
    else onAddJob({ id: crypto.randomUUID(), category, subCategory, ...jobPayload, createdBy: currentUser.email } as Job);
    handleCancelForm();
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

  const getDeadlineStyle = (deadline: string, status: Status) => {
    if (['Completed', 'DONE', 'Cancel', 'Drop'].includes(status)) return '';
    const today = new Date(); today.setHours(0,0,0,0);
    const dl = new Date(deadline); dl.setHours(0,0,0,0);
    const diffTime = dl.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'animate-blink-red px-2 py-1 rounded-lg text-white font-black';
    if (diffDays === 1) return 'animate-blink-orange px-2 py-1 rounded-lg text-white font-black';
    return '';
  };

  const downloadCSV = () => {
    const headers = ["DateInput", "BranchDept", "JobType", "Status", "Deadline", "Keterangan", "CreatedBy"];
    const csvContent = [
      headers.join(","),
      ...filteredJobs.map(j => [
        j.dateInput, j.branchDept, `"${j.jobType}"`, j.status, j.deadline, `"${j.keterangan || ''}"`, j.createdBy || 'System'
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Export_${category}_${subCategory}_${new Date().getTime()}.csv`);
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
      if (lines.length < 2) return;
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(delimiter).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 3) continue;
        newJobs.push({
          id: crypto.randomUUID(),
          category,
          subCategory,
          dateInput: cols[0],
          branchDept: cols[1],
          jobType: cols[2],
          status: (cols[3] as Status) || 'Pending',
          deadline: cols[4] || cols[0],
          keterangan: cols[5] || '',
          createdBy: currentUser.email
        } as Job);
      }
      if (newJobs.length > 0) {
        onBulkAddJobs(newJobs);
        alert(`Berhasil mengimport ${newJobs.length} data pekerjaan.`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 min-h-[600px] flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">Daftar <span className="text-[#EE2E24]">Pekerjaan</span></h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{category} / {subCategory}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            {view === 'list' && (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImport} />
                <button onClick={() => fileInputRef.current?.click()} title="Import Data" className="p-3 bg-white text-gray-400 border border-gray-100 rounded-xl hover:text-orange-600 transition-all">
                    <Upload size={18} />
                </button>
                <button onClick={downloadCSV} title="Export Data" className="p-3 bg-white text-gray-400 border border-gray-100 rounded-xl hover:text-green-600 transition-all">
                    <Download size={18} />
                </button>
                <button onClick={() => setView('form')} className="px-8 py-3 bg-[#EE2E24] text-white rounded-2xl hover:bg-red-700 text-xs font-black uppercase shadow-lg shadow-red-100 transition-all flex items-center gap-2 ml-2">
                    <Plus size={18} /> Input Baru
                </button>
              </>
            )}
        </div>
      </div>

      <div className="p-8 flex-1 bg-white">
        {view === 'form' ? (
          <div className="max-w-4xl mx-auto p-4 md:p-12 bg-white rounded-[3rem] animate-in zoom-in-95 duration-500">
            <h3 className="text-xl font-bold text-gray-800 mb-8">Input Data Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                  <input type="date" required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-medium" value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cabang / Dept</label>
                  <input type="text" required placeholder="Contoh: Jakarta / Ops" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pekerjaan</label>
                  <input type="text" required placeholder="Deskripsi pekerjaan..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan (Optional)</label>
                  <textarea placeholder="Tambahkan catatan atau keterangan tambahan..." className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl min-h-[120px] focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
                </div>

                {category === 'Penyesuaian' && (
                  <div className="md:col-span-2 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                      <ClipboardCheck size={18} />
                      <span>Validasi & Persetujuan</span>
                    </div>
                    <div className="flex flex-wrap gap-10">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="hidden" checked={formData.konfirmasiCabang} onChange={e => setFormData({...formData, konfirmasiCabang: e.target.checked})} />
                        {formData.konfirmasiCabang ? <CheckSquare className="text-blue-600" size={24} /> : <Square className="text-gray-300 group-hover:text-blue-400" size={24} />}
                        <span className="text-sm font-medium text-gray-600">Konfirmasi Cabang</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="hidden" checked={formData.disposisi} onChange={e => setFormData({...formData, disposisi: e.target.checked})} />
                        {formData.disposisi ? <CheckSquare className="text-blue-600" size={24} /> : <Square className="text-gray-300 group-hover:text-blue-400" size={24} />}
                        <span className="text-sm font-medium text-gray-600">Disposisi</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="hidden" checked={formData.approve} onChange={e => setFormData({...formData, approve: e.target.checked})} />
                        {formData.approve ? <CheckSquare className="text-blue-600" size={24} /> : <Square className="text-gray-300 group-hover:text-blue-400" size={24} />}
                        <span className="text-sm font-medium text-gray-600">Approve</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Hold">Hold</option>
                    <option value="Cancel">Cancel</option>
                    <option value="Drop">Drop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                  <input type="date" required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all font-medium" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={handleCancelForm} className="px-10 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all">Batal</button>
                <button type="submit" className="px-12 py-3 bg-[#002F6C] text-white rounded-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-900 transition-all">Simpan Data</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari di data saya..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm focus:ring-4 focus:ring-red-50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="overflow-x-auto rounded-[2.5rem] border border-gray-100 shadow-sm bg-white overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                  <tr>
                    <th className="p-6">Pekerjaan</th>
                    <th className="p-6">Cabang / Dept</th>
                    <th className="p-6">Status</th>
                    <th className="p-6">Deadline</th>
                    <th className="p-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredJobs.length === 0 ? (<tr><td colSpan={5} className="p-20 text-center text-gray-400 italic">Belum ada data pekerjaan.</td></tr>) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} onClick={() => setSelectedJobDetail(job)} className="hover:bg-gray-50/80 transition-all cursor-pointer group">
                        <td className="p-6">
                          <div className="font-black text-gray-800 text-[13px] uppercase italic">{job.jobType}</div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase mt-1 truncate max-w-[200px]">{job.keterangan || '-'}</div>
                          {job.category === 'Penyesuaian' && (
                            <div className="flex gap-2 mt-2">
                                {job.konfirmasiCabang && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-bold">K. Cabang</span>}
                                {job.disposisi && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-bold">Disposisi</span>}
                                {job.approve && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-bold">Approved</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-6 font-black text-gray-600">{job.branchDept}</td>
                        <td className="p-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border ${getStatusStyle(job.status)}`}>{job.status}</span></td>
                        <td className="p-6 font-black text-gray-500">
                           <span className={getDeadlineStyle(job.deadline, job.status)}>
                            {new Date(job.deadline).toLocaleDateString()}
                           </span>
                        </td>
                        <td className="p-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={(e) => handleEdit(e, job)} className="p-3 text-gray-300 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm"><Pencil size={18} /></button>
                            {['Cancel', 'Drop'].includes(job.status) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                                className="p-3 text-red-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm"
                                title="Hapus Pekerjaan"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            <div className="p-3 text-gray-300 group-hover:text-[#002F6C] transition-colors"><Eye size={18}/></div>
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
