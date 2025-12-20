
import React, { useState, useMemo, useRef } from 'react';
import { Job, Status, User } from '../types';
import { 
  Plus, Pencil, Search, FileDown, CheckSquare, FileText, ArrowLeft, 
  Upload, Table, LayoutGrid, Info, BarChart3, PieChart as PieIcon,
  TrendingUp, Mail, FileCheck, ClipboardList, Target, X, Square, MapPin, User as UserIcon, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface ReportSuratManagerProps {
  subCategory: string;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  onDeleteCancelled: () => void;
  onBulkAddJobs: (jobs: Job[]) => void;
  currentUser: User;
}

const COLORS = ['#EE2E24', '#002F6C', '#10B981', '#F59E0B', '#6366F1'];

export const ReportSuratManager: React.FC<ReportSuratManagerProps> = ({
  subCategory, jobs, onAddJob, onUpdateJob, onBulkAddJobs, currentUser
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
    customData: {
        picUser: '',
        jenisPengajuan: '',
        picRepd: '',
        nomorSurat: '',
        klasifikasi: '',
        tanggalUpdate: '',
        approvals: {},
        documents: {},
        socialization: {}
    }
  });

  const reportJobs = useMemo(() => {
    let base = jobs.filter(j => j.category === "Report Surat");
    if (subCategory !== 'Summary') {
        base = base.filter(j => j.subCategory === subCategory);
    }
    if (searchTerm) {
        const s = searchTerm.toLowerCase();
        base = base.filter(j => j.branchDept.toLowerCase().includes(s) || j.jobType.toLowerCase().includes(s));
    }
    return base;
  }, [jobs, subCategory, searchTerm]);

  const summaryAnalysis = useMemo(() => {
    const suratJobs = jobs.filter(j => j.category === "Report Surat");
    const subCategories = ["Email Masuk", "Disposisi", "Internal Memo"];
    const countBySub = subCategories.map(sub => ({ name: sub, count: suratJobs.filter(j => j.subCategory === sub).length }));
    const statusCounts = [
        { name: 'Completed', value: suratJobs.filter(j => ['Completed', 'DONE'].includes(j.status)).length },
        { name: 'Active', value: suratJobs.filter(j => !['Completed', 'DONE', 'Cancel', 'Drop'].includes(j.status)).length },
        { name: 'Dropped', value: suratJobs.filter(j => ['Cancel', 'Drop'].includes(j.status)).length }
    ].filter(v => v.value > 0);
    const completionRate = suratJobs.length ? Math.round((statusCounts.find(s => s.name === 'Completed')?.value || 0) / suratJobs.length * 100) : 0;
    return { total: suratJobs.length, countBySub, statusCounts, completionRate };
  }, [jobs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        onUpdateJob(editingId, formData);
    } else {
        const newJob: Job = {
            id: crypto.randomUUID(),
            category: "Report Surat",
            subCategory,
            createdBy: currentUser.email,
            dateInput: formData.dateInput || new Date().toISOString().split('T')[0],
            branchDept: formData.branchDept || '',
            jobType: formData.jobType || '',
            status: (formData.status as Status) || 'Pending',
            deadline: formData.deadline || formData.dateInput || new Date().toISOString().split('T')[0],
            keterangan: formData.keterangan || '',
            activationDate: formData.activationDate,
            customData: formData.customData
        };
        onAddJob(newJob);
    }
    setView('list');
    setEditingId(null);
  };

  const handleEdit = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setEditingId(job.id);
    setFormData(job);
    setView('form');
  };

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let example: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    if (subCategory === 'Email Masuk') {
        headers = ["TGL_MASUK", "CABANG_DEPT", "PIC_USER", "SUBJECT_EMAIL", "JENIS_PENGAJUAN", "PIC_REPD", "TGL_UPDATE", "STATUS", "KETERANGAN", "DEADLINE"];
        example = [today, "JAKARTA", "User A", "Subject Contoh", "Urgent", "REPD B", today, "Pending", "Catatan...", today];
    } else if (subCategory === 'Disposisi') {
        headers = ["TGL", "CABANG_DEPT", "NO_DISPOSISI", "KLASIFIKASI", "DESKRIPSI", "STATUS", "KETERANGAN", "DEADLINE"];
        example = [today, "BOD", "123/DSP/2024", "Penting", "Deskripsi Disposisi", "In Progress", "Proses Review", today];
    } else if (subCategory === 'Internal Memo') {
        headers = ["TGL", "CABANG_DEPT", "NO_MEMO", "DESKRIPSI", "TGL_AKTIFASI", "STATUS", "KETERANGAN"];
        example = [today, "HC", "001/IM/2024", "Memo Contoh", today, "Completed", "Done"];
    } else {
        headers = ["TGL", "CABANG_DEPT", "DESKRIPSI", "STATUS", "KETERANGAN", "DEADLINE"];
        example = [today, "CABANG", "Pekerjaan", "Pending", "-", today];
    }

    const csvContent = headers.join(",") + "\n" + example.join(",");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Template_${subCategory.replace(/\s+/g, '_')}.csv`);
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
            
            let job: Partial<Job> = {
                id: crypto.randomUUID(),
                category: "Report Surat",
                subCategory: subCategory === 'Summary' ? 'Disposisi' : subCategory,
                createdBy: currentUser.email,
            };

            if (subCategory === 'Email Masuk') {
                job.dateInput = cols[0];
                job.branchDept = cols[1];
                job.jobType = cols[3];
                job.status = (cols[7] as Status) || 'Pending';
                job.keterangan = cols[8];
                job.deadline = cols[9];
                job.customData = { picUser: cols[2], jenisPengajuan: cols[4], picRepd: cols[5], tanggalUpdate: cols[6] };
            } else if (subCategory === 'Disposisi') {
                job.dateInput = cols[0];
                job.branchDept = cols[1];
                job.jobType = cols[4];
                job.status = (cols[5] as Status) || 'Pending';
                job.keterangan = cols[6];
                job.deadline = cols[7];
                job.customData = { nomorSurat: cols[2], klasifikasi: cols[3] };
            } else if (subCategory === 'Internal Memo') {
                job.dateInput = cols[0];
                job.branchDept = cols[1];
                job.jobType = cols[3];
                job.status = (cols[5] as Status) || 'Pending';
                job.activationDate = cols[4];
                job.keterangan = cols[6];
                job.customData = { nomorSurat: cols[2] };
            } else {
                job.dateInput = cols[0];
                job.branchDept = cols[1];
                job.jobType = cols[2];
                job.status = (cols[3] as Status) || 'Pending';
                job.keterangan = cols[4];
                job.deadline = cols[5] || cols[0];
            }
            newJobs.push(job as Job);
        }
        
        if (newJobs.length > 0) {
            onBulkAddJobs(newJobs);
            alert(`Berhasil mengimport ${newJobs.length} data surat.`);
        } else {
            alert("Tidak ada data valid yang ditemukan.");
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
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

  // Fixed CheckboxItem type to allow 'key' prop by using React.FC
  const CheckboxItem: React.FC<{ label: string, checked: boolean, onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
        <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
        {checked ? <CheckSquare size={20} className="text-[#002F6C]" /> : <Square size={20} className="text-gray-300 group-hover:text-[#002F6C]" />}
        <span className="text-xs font-medium text-gray-700">{label}</span>
    </label>
  );

  if (subCategory === 'Summary') {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                <div className="p-5 bg-[#EE2E24] rounded-3xl text-white shadow-lg shadow-red-100">
                    <BarChart3 size={40} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-gray-800 uppercase italic tracking-tighter">Analisa <span className="text-[#EE2E24]">Report Surat</span></h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Global Unit Report Surat Performance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Surat', value: summaryAnalysis.total, icon: FileText, color: 'blue' },
                    { label: 'Email Masuk', value: summaryAnalysis.countBySub[0].count, icon: Mail, color: 'red' },
                    { label: 'Disposisi', value: summaryAnalysis.countBySub[1].count, icon: ClipboardList, color: 'green' },
                    { label: 'Internal Memo', value: summaryAnalysis.countBySub[2].count, icon: FileCheck, color: 'amber' }
                ].map((item, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
                        <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center mb-4`}>
                            <item.icon size={24} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-3xl font-black text-gray-800">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                    <h3 className="text-xl font-black uppercase italic mb-10 flex items-center gap-3">
                        <TrendingUp className="text-[#EE2E24]" /> Distribusi <span className="text-[#EE2E24]">Kategori</span>
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summaryAnalysis.countBySub}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fill: '#94a3b8'}} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="count" fill="#002F6C" radius={[10, 10, 0, 0]} barSize={50}>
                                    {summaryAnalysis.countBySub.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#002F6C] p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white uppercase italic mb-8">Status <span className="text-red-500">Penyelesaian</span></h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={summaryAnalysis.statusCounts} 
                                        cx="50%" cy="50%" 
                                        innerRadius={60} outerRadius={80} 
                                        paddingAngle={10} dataKey="value" stroke="none"
                                    >
                                        {summaryAnalysis.statusCounts.map((_, index) => <Cell key={index} fill={index === 0 ? '#10B981' : (index === 1 ? '#F59E0B' : '#EE2E24')} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', color: 'white', fontWeight: 'bold'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="relative z-10 mt-8 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Completion Rate</p>
                            <p className="text-4xl font-black text-white">{summaryAnalysis.completionRate}%</p>
                        </div>
                        <div className="text-right">
                            <Target size={40} className="text-red-500 opacity-50 ml-auto" />
                            <p className="text-[10px] text-white/70 italic mt-2 uppercase font-bold">Target: 100%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  const renderForm = () => {
    switch (subCategory) {
        case 'Email Masuk':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tgl Email Masuk</label>
                            <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-red-50" value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cabang / Dept</label>
                            <input type="text" placeholder="Contoh: Jakarta / Ops" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PIC User</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.picUser} onChange={e => setFormData({...formData, customData: {...formData.customData, picUser: e.target.value}})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Email</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Pengajuan</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.jenisPengajuan} onChange={e => setFormData({...formData, customData: {...formData.customData, jenisPengajuan: e.target.value}})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PIC REPD</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.picRepd} onChange={e => setFormData({...formData, customData: {...formData.customData, picRepd: e.target.value}})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Update</label>
                            <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.tanggalUpdate} onChange={e => setFormData({...formData, customData: {...formData.customData, tanggalUpdate: e.target.value}})} />
                        </div>
                    </div>
                </div>
            );
        case 'Disposisi':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                            <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cabang / Dept</label>
                            <input type="text" placeholder="Contoh: Jakarta / Ops" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">No Disposisi</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.nomorSurat} onChange={e => setFormData({...formData, customData: {...formData.customData, nomorSurat: e.target.value}})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Klasifikasi</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.klasifikasi} onChange={e => setFormData({...formData, customData: {...formData.customData, klasifikasi: e.target.value}})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">APPROVAL</p>
                        <div className="flex flex-wrap gap-6">
                            {['HeadDept', 'HeadDiv', 'Regional', 'VP', 'BOD'].map(key => (
                                <CheckboxItem 
                                    key={key} 
                                    label={key} 
                                    checked={!!formData.customData?.approvals?.[key.toLowerCase() as keyof typeof formData.customData.approvals]} 
                                    onChange={v => setFormData({
                                        ...formData, 
                                        customData: {
                                            ...formData.customData, 
                                            approvals: {...formData.customData?.approvals, [key.toLowerCase()]: v}
                                        }
                                    })} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">KELENGKAPAN DOKUMEN</p>
                        <div className="flex flex-wrap gap-6">
                            {['Soft Copy', 'Lampiran', 'Hard Copy'].map(label => {
                                const key = label.toLowerCase().replace(' ', '');
                                return (
                                    <CheckboxItem 
                                        key={label} 
                                        label={label} 
                                        checked={!!formData.customData?.documents?.[key as keyof typeof formData.customData.documents]} 
                                        onChange={v => setFormData({
                                            ...formData, 
                                            customData: {
                                                ...formData.customData, 
                                                documents: {...formData.customData?.documents, [key]: v}
                                            }
                                        })} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        case 'Internal Memo':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                            <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cabang / Dept</label>
                            <input type="text" placeholder="Contoh: Jakarta / Ops" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">No Internal Memo</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.customData?.nomorSurat} onChange={e => setFormData({...formData, customData: {...formData.customData, nomorSurat: e.target.value}})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Aktifasi</label>
                            <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.activationDate} onChange={e => setFormData({...formData, activationDate: e.target.value})} />
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KELENGKAPAN DOKUMEN</p>
                        <div className="flex flex-wrap items-center gap-6">
                            <CheckboxItem 
                                label="Soft Copy" 
                                checked={!!formData.customData?.documents?.softCopy} 
                                onChange={v => setFormData({...formData, customData: {...formData.customData, documents: {...formData.customData?.documents, softCopy: v}}})} 
                            />
                            <CheckboxItem 
                                label="Hard Copy" 
                                checked={!!formData.customData?.documents?.hardCopy} 
                                onChange={v => setFormData({...formData, customData: {...formData.customData, documents: {...formData.customData?.documents, hardCopy: v}}})} 
                            />
                            <div className="flex-1 flex items-center gap-2">
                                <CheckboxItem 
                                    label="Link Aktifasi" 
                                    checked={!!formData.customData?.documents?.linkAktifasi} 
                                    onChange={v => setFormData({...formData, customData: {...formData.customData, documents: {...formData.customData?.documents, linkAktifasi: v}}})} 
                                />
                                <input 
                                    type="text" 
                                    placeholder="https://..." 
                                    className="flex-1 px-4 py-2 text-xs bg-white border border-gray-200 rounded-lg" 
                                    value={formData.customData?.documents?.linkUrl || ''} 
                                    onChange={e => setFormData({...formData, customData: {...formData.customData, documents: {...formData.customData?.documents, linkUrl: e.target.value}}})}
                                    disabled={!formData.customData?.documents?.linkAktifasi}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">SOSIALISASI</p>
                        <div className="flex flex-wrap gap-6">
                            <CheckboxItem 
                                label="Cabang / Dept" 
                                checked={!!formData.customData?.socialization?.cabang} 
                                onChange={v => setFormData({...formData, customData: {...formData.customData, socialization: {...formData.customData?.socialization, cabang: v}}})} 
                            />
                            <CheckboxItem 
                                label="IT" 
                                checked={!!formData.customData?.socialization?.it} 
                                onChange={v => setFormData({...formData, customData: {...formData.customData, socialization: {...formData.customData?.socialization, it: v}}})} 
                            />
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter italic">Daftar Surat <span className="text-[#EE2E24]">{subCategory}</span></h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Hanya menampilkan data pribadi Anda</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {subCategory !== 'Summary' && (
                <>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                    <button onClick={handleDownloadTemplate} title="Download Template CSV" className="flex items-center px-6 py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 text-xs font-black uppercase"><FileDown size={18} className="mr-2" /> Template</button>
                    <button onClick={() => fileInputRef.current?.click()} title="Import Data CSV" className="flex items-center px-6 py-3 bg-blue-50 border-2 border-blue-100 text-[#002F6C] rounded-2xl hover:bg-[#002F6C] hover:text-white text-xs font-black uppercase"><Upload size={18} className="mr-2" /> Import</button>
                    <button onClick={() => setView(view === 'list' ? 'form' : 'list')} className="flex items-center px-8 py-3 bg-[#EE2E24] text-white rounded-2xl hover:bg-red-700 text-xs font-black uppercase shadow-lg shadow-red-100">{view === 'list' ? 'Input Baru' : 'Lihat Daftar'}</button>
                </>
            )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden min-h-[500px]">
        {view === 'list' ? (
          <div className="p-8 space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input type="text" placeholder="Cari di daftar saya..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                        <tr>
                            <th className="p-6">Detail Surat</th>
                            <th className="p-6">Cabang / Dept</th>
                            <th className="p-6">Status</th>
                            <th className="p-6">Deadline</th>
                            <th className="p-6 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {reportJobs.map(job => (
                            <tr 
                              key={job.id} 
                              onClick={() => setSelectedJobDetail(job)}
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                            >
                                <td className="p-6">
                                    <div className="font-black text-gray-800 text-[13px]">{job.jobType}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{job.subCategory} {job.customData?.nomorSurat ? `- ${job.customData.nomorSurat}` : ''}</div>
                                </td>
                                <td className="p-6 font-black text-gray-800">{job.branchDept}</td>
                                <td className="p-6">
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${getStatusStyle(job.status)}`}>{job.status}</span>
                                </td>
                                <td className="p-6 font-bold">{new Date(job.deadline).toLocaleDateString('id-ID')}</td>
                                <td className="p-6 text-center">
                                    <button onClick={(e) => handleEdit(e, job)} className="p-3 text-gray-300 hover:text-[#002F6C] hover:bg-white rounded-2xl transition-all"><Pencil size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        ) : (
          <div className="p-12 max-w-4xl mx-auto space-y-10 animate-in zoom-in-95 duration-500">
             <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <h3 className="text-2xl font-black text-gray-800 uppercase italic">Input <span className="text-[#EE2E24]">Data Baru</span></h3>
                <button onClick={() => setView('list')} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><X/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-8">
                {renderForm()}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (Optional)</label>
                        <textarea placeholder="Tambahkan catatan atau keterangan tambahan..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[100px]" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Hold">Hold</option>
                            <option value="Cancel">Cancel</option>
                        </select>
                    </div>
                    {subCategory !== 'Internal Memo' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                            <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => setView('list')} className="px-8 py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold uppercase text-xs hover:bg-gray-50 transition-all">Batal</button>
                    <button type="submit" className="px-10 py-3 bg-[#002F6C] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-900 transition-all">Simpan Data</button>
                </div>
             </form>
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
