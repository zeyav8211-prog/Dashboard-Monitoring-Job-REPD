
import React, { useState, useMemo, useRef } from 'react';
import { Job, Status, User } from '../types';
import { Plus, Pencil, Search, CheckSquare, Square, X, Database, Calendar, Clock, FileType, Upload, Download, MapPin, User as UserIcon, FileText, Info } from 'lucide-react';

interface ProduksiMasterManagerProps {
  category: string;
  subCategory: string;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  currentUser: User;
  onBulkAddJobs: (jobs: Job[]) => void;
}

export const ProduksiMasterManager: React.FC<ProduksiMasterManagerProps> = ({
  category, subCategory, jobs, onAddJob, onUpdateJob, onDeleteJob, currentUser, onBulkAddJobs
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<Job | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Job>>({
    status: 'Pending',
    dateInput: new Date().toISOString().split('T')[0],
    activationDate: '',
    deadline: '',
    branchDept: '',
    jobType: '',
    keterangan: '',
    customData: {
        masterDataSources: {
            server: false,
            it: false,
            others: false,
            othersText: ''
        }
    }
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => 
        j.category === category && 
        j.subCategory === subCategory &&
        (j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) || 
        j.jobType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [jobs, category, subCategory, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        onUpdateJob(editingId, formData);
    } else {
        const newJob: Job = {
            id: crypto.randomUUID(),
            category,
            subCategory,
            createdBy: currentUser.email,
            dateInput: formData.dateInput || new Date().toISOString().split('T')[0],
            branchDept: formData.branchDept || '',
            jobType: formData.jobType || '',
            status: (formData.status as Status) || 'Pending',
            deadline: formData.deadline || '',
            activationDate: formData.activationDate,
            keterangan: formData.keterangan,
            customData: formData.customData
        };
        onAddJob(newJob);
    }
    handleCancel();
  };

  const handleEdit = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setEditingId(job.id);
    setFormData(job);
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
    setFormData({
        status: 'Pending',
        dateInput: new Date().toISOString().split('T')[0],
        activationDate: '',
        deadline: '',
        branchDept: '',
        jobType: '',
        keterangan: '',
        customData: {
            masterDataSources: { server: false, it: false, others: false, othersText: '' }
        }
    });
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

  const toggleSource = (key: 'server' | 'it' | 'others') => {
      const currentSources = formData.customData?.masterDataSources || {};
      setFormData({
          ...formData,
          customData: {
              ...formData.customData,
              masterDataSources: {
                  ...currentSources,
                  [key]: !currentSources[key]
              }
          }
      });
  };

  const handleDownloadTemplate = () => {
    const headers = ["TGL_INPUT", "CABANG_DEPT", "NAMA_PEKERJAAN", "TGL_AKTIFASI", "TGL_DEADLINE", "STATUS", "KETERANGAN"];
    const today = new Date().toISOString().split('T')[0];
    const example = [today, "JAKARTA", "Master Data Contoh", today, today, "Pending", "Catatan Master Data"].join(",");
    const csvContent = headers.join(",") + "\n" + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Template_Produksi_Master_${subCategory.replace(/\s+/g, '_')}.csv`);
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
        
        if (lines.length < 2) return;

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
            if (cols.length < 3) continue;
            
            newJobs.push({
                id: crypto.randomUUID(),
                category,
                subCategory,
                createdBy: currentUser.email,
                dateInput: cols[0],
                branchDept: cols[1],
                jobType: cols[2],
                activationDate: cols[3],
                deadline: cols[4],
                status: (cols[5] as Status) || 'Pending',
                keterangan: cols[6] || ''
            } as Job);
        }
        
        if (newJobs.length > 0) {
            onBulkAddJobs(newJobs);
            alert(`Berhasil mengimport ${newJobs.length} data produksi master.`);
        } else {
            alert("Tidak ada data valid yang ditemukan.");
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 min-h-[600px] flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">Produksi <span className="text-[#EE2E24]">Master Data</span></h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{subCategory}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            {view === 'list' && (
                <>
                    <button onClick={handleDownloadTemplate} title="Download Template CSV" className="p-3 bg-white text-gray-400 border border-gray-100 rounded-xl hover:text-blue-600 transition-all">
                        <FileType size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} title="Import Data CSV" className="p-3 bg-white text-gray-400 border border-gray-100 rounded-xl hover:text-orange-600 transition-all">
                        <Upload size={18} />
                    </button>
                    <button onClick={() => setView('form')} className="px-8 py-3 bg-[#EE2E24] text-white rounded-2xl hover:bg-red-700 text-xs font-black uppercase shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center gap-2 ml-2">
                        <Plus size={18} /> Input Data Master
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="p-8 flex-1">
        {view === 'form' ? (
          <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-[#002F6C] uppercase italic tracking-wider flex items-center gap-3">
                    <Database size={24} className="text-[#EE2E24]" /> Input <span className="text-[#EE2E24]">Data Baru</span>
                </h3>
                <button onClick={handleCancel} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tanggal Input</label>
                  <input type="date" required className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-[#EE2E24] transition-all font-bold text-gray-700" value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cabang / Dept</label>
                  <input type="text" required placeholder="Contoh: Jakarta / Ops" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-50 transition-all font-bold text-gray-700" value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Pekerjaan / Deskripsi</label>
                  <input type="text" required placeholder="Deskripsi master data yang diproduksi..." className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-50 transition-all font-bold text-gray-700" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                  <div>
                    <label className="block text-xs font-black text-[#EE2E24] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Calendar size={14} /> Tanggal Aktifasi
                    </label>
                    <input type="date" required className="w-full px-5 py-3.5 bg-red-50/30 border border-red-100 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-[#EE2E24] transition-all font-black text-[#EE2E24]" value={formData.activationDate} onChange={e => setFormData({...formData, activationDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#002F6C] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Clock size={14} /> Tanggal Deadline
                    </label>
                    <input type="date" required className="w-full px-5 py-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-[#002F6C] transition-all font-black text-[#002F6C]" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                  </div>
                </div>

                <div className="md:col-span-2 p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <Database size={18} className="text-[#002F6C]" />
                        <span className="text-xs font-black text-[#002F6C] uppercase tracking-widest">Sumber Data Master</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="hidden" checked={formData.customData?.masterDataSources?.server} onChange={() => toggleSource('server')} />
                            {formData.customData?.masterDataSources?.server ? <CheckSquare className="text-[#002F6C]" size={24} /> : <Square className="text-gray-300 group-hover:text-[#002F6C]" size={24} />}
                            <span className="text-sm font-bold text-gray-700">Master Data Server</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="hidden" checked={formData.customData?.masterDataSources?.it} onChange={() => toggleSource('it')} />
                            {formData.customData?.masterDataSources?.it ? <CheckSquare className="text-[#002F6C]" size={24} /> : <Square className="text-gray-300 group-hover:text-[#002F6C]" size={24} />}
                            <span className="text-sm font-bold text-gray-700">Master Data IT</span>
                        </label>
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                            <label className="flex items-center gap-3 cursor-pointer group flex-shrink-0">
                                <input type="checkbox" className="hidden" checked={formData.customData?.masterDataSources?.others} onChange={() => toggleSource('others')} />
                                {formData.customData?.masterDataSources?.others ? <CheckSquare className="text-[#002F6C]" size={24} /> : <Square className="text-gray-300 group-hover:text-[#002F6C]" size={24} />}
                                <span className="text-sm font-bold text-gray-700">Lain-lain</span>
                            </label>
                            {formData.customData?.masterDataSources?.others && (
                                <input 
                                    type="text" 
                                    placeholder="Sebutkan sumber lainnya..." 
                                    className="flex-1 px-4 py-2 text-xs bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-100 animate-in slide-in-from-left-2" 
                                    value={formData.customData?.masterDataSources?.othersText || ''}
                                    onChange={e => setFormData({
                                        ...formData,
                                        customData: {
                                            ...formData.customData,
                                            masterDataSources: {
                                                ...formData.customData?.masterDataSources,
                                                othersText: e.target.value
                                            }
                                        }
                                    })}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Keterangan (Optional)</label>
                  <textarea placeholder="Tambahkan catatan tambahan..." className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl min-h-[100px] font-medium" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                  <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Hold">Hold</option>
                    <option value="Cancel">Cancel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={handleCancel} className="px-10 py-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs hover:bg-gray-50 transition-all">Batal</button>
                <button type="submit" className="px-12 py-4 bg-[#002F6C] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-900 transition-all active:scale-95">Simpan Data Master</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input type="text" placeholder="Cari data master..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-gray-100 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                  <tr>
                    <th className="p-6">Detail Master Data</th>
                    <th className="p-6">Unit</th>
                    <th className="p-6">Sumber Data</th>
                    <th className="p-6">Tgl Aktifasi</th>
                    <th className="p-6">Deadline</th>
                    <th className="p-6">Status</th>
                    <th className="p-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredJobs.length === 0 ? (
                    <tr><td colSpan={7} className="p-20 text-center text-gray-400 italic">Belum ada data master yang diproduksi.</td></tr>
                  ) : (
                    filteredJobs.map(job => (
                      <tr 
                        key={job.id} 
                        onClick={() => setSelectedJobDetail(job)}
                        className="hover:bg-gray-50/50 transition-all group cursor-pointer"
                      >
                        <td className="p-6">
                          <div className="font-black text-gray-800 text-[13px]">{job.jobType}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic">{job.keterangan || '-'}</div>
                        </td>
                        <td className="p-6 font-black text-gray-800">{job.branchDept}</td>
                        <td className="p-6">
                            <div className="flex flex-wrap gap-1">
                                {job.customData?.masterDataSources?.server && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">Server</span>}
                                {job.customData?.masterDataSources?.it && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">IT</span>}
                                {job.customData?.masterDataSources?.others && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-black uppercase">{job.customData?.masterDataSources?.othersText || 'Lainnya'}</span>}
                            </div>
                        </td>
                        <td className="p-6 font-black text-[#EE2E24]">{job.activationDate ? new Date(job.activationDate).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="p-6 font-black text-gray-600">{job.deadline ? new Date(job.deadline).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="p-6">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${getStatusStyle(job.status)}`}>{job.status}</span>
                        </td>
                        <td className="p-6 text-center">
                            <button onClick={(e) => handleEdit(e, job)} className="p-3 text-gray-300 hover:text-[#002F6C] hover:bg-white rounded-2xl transition-all"><Pencil size={18} /></button>
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

      {/* JOB DETAIL MODAL */}
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
