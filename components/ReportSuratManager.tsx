
import React, { useState, useMemo, useRef } from 'react';
import { Job, Status, User } from '../types';
import { Plus, Trash2, Pencil, Search, FileDown, CheckSquare, Square, ExternalLink, Eraser, TrendingUp, Users, AlertCircle, FileText, ArrowLeft, Download, Hourglass, OctagonAlert, TriangleAlert, Upload } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

interface ReportSuratManagerProps {
  subCategory: string;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  onDeleteCancelled: () => void;
  onBulkAddJobs?: (jobs: Job[]) => void;
  currentUser: User;
}

const STATUS_COLORS: Record<string, string> = {
  'DONE': '#10B981',
  'Completed': '#10B981',
  'On Proses': '#3B82F6',
  'In Progress': '#3B82F6',
  'Pending': '#0ea5e9',
  'Hold': '#F59E0B',
  'Cancel': '#64748B',
  'Drop': '#64748B',
  'Overdue': '#EF4444'
};

export const ReportSuratManager: React.FC<ReportSuratManagerProps> = ({
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryFilter, setSummaryFilter] = useState<{ key: 'status' | 'category' | 'pic' | 'overdue' | 'warning' | 'all', value: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState: Partial<Job> = {
    dateInput: new Date().toISOString().split('T')[0],
    status: 'Pending',
    branchDept: '',
    jobType: '', 
    deadline: new Date().toISOString().split('T')[0],
    keterangan: '',
    customData: {
        picUser: '',
        jenisPengajuan: '',
        picRepd: '',
        nomorSurat: '',
        klasifikasi: '',
        approvals: { headDept: false, headDiv: false, regional: false, vp: false, bod: false },
        documents: { softCopy: false, hardCopy: false, lampiran: false, link: '' },
        socialization: { cabang: false, it: false }
    }
  };

  const [formData, setFormData] = useState<Partial<Job>>(initialFormState);

  const allReportJobs = useMemo(() => jobs.filter(j => j.category === "Report Surat"), [jobs]);

  const reportJobs = useMemo(() => {
     let filtered = allReportJobs;
     
     if (subCategory !== 'Summary') {
         filtered = filtered.filter(j => j.subCategory === subCategory);
     }
     
     if (searchTerm) {
         filtered = filtered.filter(j => 
             j.branchDept.toLowerCase().includes(searchTerm.toLowerCase()) ||
             j.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (j.customData?.nomorSurat && j.customData.nomorSurat.toLowerCase().includes(searchTerm.toLowerCase()))
         );
     }
     return filtered;
  }, [allReportJobs, subCategory, searchTerm]);

  // FIX: Added hasCancelledJobs definition to prevent reference error on line 920
  const hasCancelledJobs = useMemo(() => {
    return reportJobs.some(j => j.status === 'Cancel' || j.status === 'Drop');
  }, [reportJobs]);

  // --- CSV LOGIC ---

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let example: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    if (subCategory === 'Email Masuk') {
        headers = ["TGL EMAIL MASUK", "PIC USER", "CABANG/DEPT", "SUBJECT EMAIL", "JENIS PENGAJUAN", "TGL UPDATE", "PIC REPD", "STATUS"];
        example = [today, "John Doe", "Jakarta", "Permintaan Data Januari", "Request Data", today, "Admin 1", "Pending"];
    } else if (subCategory === 'Disposisi') {
        headers = ["TANGGAL", "NO DISPOSISI", "CABANG/DEPT", "KLASIFIKASI", "DESKRIPSI", "STATUS", "KETERANGAN", "HEAD_DEPT", "HEAD_DIV", "REGIONAL", "VP", "BOD", "SOFT_COPY", "HARD_COPY", "LAMPIRAN"];
        example = [today, "DISP/2024/001", "Ops", "Penting", "Pindah Lokasi Gudang", "On Proses", "Catatan...", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE", "TRUE", "FALSE"];
    } else if (subCategory === 'Internal Memo') {
        headers = ["TANGGAL", "NO INTERNAL MEMO", "CABANG/DEPT", "DESKRIPSI", "KETERANGAN", "SOFT_COPY", "HARD_COPY", "LINK", "SOSIALISASI_CABANG", "SOSIALISASI_IT", "STATUS"];
        example = [today, "MEMO/2024/10", "HRD", "Kebijakan Cuti Baru", "Segera dijalankan", "TRUE", "FALSE", "http://docs.jne.id", "TRUE", "TRUE", "Completed"];
    }

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + example.join(",");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Template_${subCategory}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = () => {
    let headers: string[] = [];
    if (subCategory === 'Email Masuk') {
        headers = ["TGL EMAIL MASUK", "PIC USER", "CABANG/DEPT", "SUBJECT EMAIL", "JENIS PENGAJUAN", "TGL UPDATE", "PIC REPD", "STATUS"];
    } else if (subCategory === 'Disposisi') {
        headers = ["TANGGAL", "NO DISPOSISI", "CABANG/DEPT", "KLASIFIKASI", "DESKRIPSI", "STATUS", "KETERANGAN", "HEAD_DEPT", "HEAD_DIV", "REGIONAL", "VP", "BOD", "SOFT_COPY", "HARD_COPY", "LAMPIRAN"];
    } else if (subCategory === 'Internal Memo') {
        headers = ["TANGGAL", "NO INTERNAL MEMO", "CABANG/DEPT", "DESKRIPSI", "KETERANGAN", "SOFT_COPY", "HARD_COPY", "LINK", "SOSIALISASI_CABANG", "SOSIALISASI_IT", "STATUS"];
    }

    const csvRows = [headers.join(",")];
    reportJobs.forEach(job => {
        let row: any[] = [];
        if (subCategory === 'Email Masuk') {
            row = [job.dateInput, job.customData?.picUser, job.branchDept, job.jobType, job.customData?.jenisPengajuan, job.deadline, job.customData?.picRepd, job.status];
        } else if (subCategory === 'Disposisi') {
            row = [
                job.dateInput, job.customData?.nomorSurat, job.branchDept, job.customData?.klasifikasi, job.jobType, job.status, job.keterangan,
                job.customData?.approvals?.headDept, job.customData?.approvals?.headDiv, job.customData?.approvals?.regional, job.customData?.approvals?.vp, job.customData?.approvals?.bod,
                job.customData?.documents?.softCopy, job.customData?.documents?.hardCopy, job.customData?.documents?.lampiran
            ];
        } else if (subCategory === 'Internal Memo') {
            row = [
                job.dateInput, job.customData?.nomorSurat, job.branchDept, job.jobType, job.keterangan,
                job.customData?.documents?.softCopy, job.customData?.documents?.hardCopy, job.customData?.documents?.link,
                job.customData?.socialization?.cabang, job.customData?.socialization?.it, job.status
            ];
        }
        csvRows.push(row.map(v => `"${v || ''}"`).join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Data_${subCategory}_${new Date().toISOString().split('T')[0]}.csv`);
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

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(/,|;/).map(v => v.trim().replace(/^"|"$/g, ''));
            
            const isTrue = (val: string) => ["TRUE", "1", "V", "YES"].includes(String(val).toUpperCase());
            const getValidStatus = (val: string): Status => {
                const list: Status[] = ['Pending', 'In Progress', 'Completed', 'Hold', 'Cancel', 'Drop', 'On Proses', 'DONE'];
                return list.includes(val as Status) ? (val as Status) : 'Pending';
            };

            if (subCategory === 'Email Masuk' && cols.length >= 4) {
                newJobs.push({
                    id: crypto.randomUUID(), category: "Report Surat", subCategory, createdBy: currentUser.email,
                    dateInput: cols[0], branchDept: cols[2], jobType: cols[3], deadline: cols[5] || cols[0],
                    status: getValidStatus(cols[7]),
                    customData: { picUser: cols[1], jenisPengajuan: cols[4], picRepd: cols[6] }
                });
            } else if (subCategory === 'Disposisi' && cols.length >= 6) {
                newJobs.push({
                    id: crypto.randomUUID(), category: "Report Surat", subCategory, createdBy: currentUser.email,
                    dateInput: cols[0], branchDept: cols[2], jobType: cols[4], deadline: cols[0],
                    status: getValidStatus(cols[5]), keterangan: cols[6],
                    customData: {
                        nomorSurat: cols[1], klasifikasi: cols[3],
                        approvals: { headDept: isTrue(cols[7]), headDiv: isTrue(cols[8]), regional: isTrue(cols[9]), vp: isTrue(cols[10]), bod: isTrue(cols[11]) },
                        documents: { softCopy: isTrue(cols[12]), hardCopy: isTrue(cols[13]), lampiran: isTrue(cols[14]) }
                    }
                });
            } else if (subCategory === 'Internal Memo' && cols.length >= 4) {
                newJobs.push({
                    id: crypto.randomUUID(), category: "Report Surat", subCategory, createdBy: currentUser.email,
                    dateInput: cols[0], branchDept: cols[2], jobType: cols[3], deadline: cols[0],
                    status: getValidStatus(cols[10]), keterangan: cols[4],
                    customData: {
                        nomorSurat: cols[1], 
                        documents: { softCopy: isTrue(cols[5]), hardCopy: isTrue(cols[6]), link: cols[7] },
                        socialization: { cabang: isTrue(cols[8]), it: isTrue(cols[9]) }
                    }
                });
            }
        }

        if (newJobs.length > 0) {
            if (onBulkAddJobs) onBulkAddJobs(newJobs);
            else newJobs.forEach(j => onAddJob(j));
            alert(`Berhasil mengimpor ${newJobs.length} data ${subCategory}!`);
        } else {
            alert("Format CSV tidak sesuai atau file kosong.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const drilledJobs = useMemo(() => {
    if (!summaryFilter) return [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return allReportJobs.filter(j => {
        if (summaryFilter.key === 'all') return true;
        if (summaryFilter.key === 'status') return j.status === summaryFilter.value;
        if (summaryFilter.key === 'category') return j.subCategory === summaryFilter.value;
        if (summaryFilter.key === 'overdue') {
            const dl = new Date(j.deadline);
            dl.setHours(0,0,0,0);
            return dl <= today && !['DONE', 'Completed', 'Drop', 'Cancel'].includes(j.status);
        }
        if (summaryFilter.key === 'warning') {
            const dl = new Date(j.deadline);
            dl.setHours(0,0,0,0);
            return dl.getTime() === tomorrow.getTime() && !['DONE', 'Completed', 'Drop', 'Cancel'].includes(j.status);
        }
        if (summaryFilter.key === 'pic') {
            const pic = j.customData?.picRepd || j.customData?.picUser || j.createdBy || 'Unknown';
            return pic === summaryFilter.value;
        }
        return true;
    });
  }, [allReportJobs, summaryFilter]);

  const handleCustomChange = (field: string, value: any, section?: string) => {
      setFormData(prev => {
          const currentCustom = prev.customData || initialFormState.customData!;
          
          if (section) {
              return {
                  ...prev,
                  customData: {
                      ...currentCustom,
                      [section]: {
                          ...currentCustom[section as keyof typeof currentCustom] as object,
                          [field]: value
                      }
                  }
              };
          } else {
              return {
                  ...prev,
                  customData: {
                      ...currentCustom,
                      [field]: value
                  }
              };
          }
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        onUpdateJob(editingId, {
            ...formData,
            status: formData.status as Status 
        });
    } else {
        const newJob: Job = {
            id: crypto.randomUUID(),
            category: "Report Surat",
            subCategory: subCategory,
            dateInput: formData.dateInput || '',
            branchDept: formData.branchDept || '',
            jobType: formData.jobType || '',
            status: (formData.status as Status) || 'Pending',
            deadline: formData.deadline || '',
            keterangan: formData.keterangan || '',
            createdBy: currentUser.email,
            customData: formData.customData
        };
        onAddJob(newJob);
    }
    
    setView('list');
    setEditingId(null);
    setFormData(initialFormState);
  };

  const startEdit = (job: Job) => {
      setEditingId(job.id);
      setFormData({
          ...job,
          customData: {
              ...initialFormState.customData,
              ...job.customData
          }
      });
      setView('form');
  };

  const getStatusColor = (status: Status, deadline: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateDeadline = new Date(deadline);
    dateDeadline.setHours(0,0,0,0);

    if (!['DONE', 'Completed', 'Drop', 'Cancel'].includes(status)) {
        if (dateDeadline <= today) return 'bg-red-100 text-red-700 border-red-200';
        if (dateDeadline.getTime() === tomorrow.getTime()) return 'bg-amber-100 text-amber-700 border-amber-200';
    }

    switch (status) {
      case 'DONE':
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'On Proses':
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Hold':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Cancel':
      case 'Drop':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const renderDrillDownTable = () => {
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <button 
                        onClick={() => setSummaryFilter(null)}
                        className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-1"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Analisa
                    </button>
                    <h3 className="text-xl font-bold text-gray-800">
                        Detail: <span className="text-blue-600">{summaryFilter?.value || 'Semua Data'}</span>
                    </h3>
                </div>
                <button onClick={() => handleExportData()} className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" /> Export Excel
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Sub Kategori</th>
                                <th className="p-3">Cabang/Dept</th>
                                <th className="p-3">Deskripsi/Subject</th>
                                <th className="p-3">PIC</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Deadline</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {drilledJobs.map(job => (
                                <tr key={job.id} className="hover:bg-gray-50">
                                    <td className="p-3">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 font-medium text-gray-600">{job.subCategory}</td>
                                    <td className="p-3">{job.branchDept}</td>
                                    <td className="p-3 max-w-xs truncate">{job.jobType}</td>
                                    <td className="p-3 text-xs">{job.customData?.picRepd || job.customData?.picUser || job.createdBy || '-'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(job.status, job.deadline)}`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`font-bold ${new Date() >= new Date(job.deadline) && !['DONE', 'Completed'].includes(job.status) ? 'text-red-600 underline' : 'text-gray-600'}`}>
                                            {new Date(job.deadline).toLocaleDateString('id-ID')}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button 
                                          onClick={() => onDeleteJob(job.id)}
                                          className={`p-1.5 rounded-md transition-all ${['Cancel', 'Drop'].includes(job.status) ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                          title="Hapus Data"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  };

  const renderSummary = () => {
      if (summaryFilter) return renderDrillDownTable();

      const emailCount = allReportJobs.filter(j => j.subCategory === "Email Masuk").length;
      const dispCount = allReportJobs.filter(j => j.subCategory === "Disposisi").length;
      const memoCount = allReportJobs.filter(j => j.subCategory === "Internal Memo").length;
      
      const countsData = [
          { name: 'Email Masuk', count: emailCount, fill: '#EE2E24' },
          { name: 'Disposisi', count: dispCount, fill: '#002F6C' },
          { name: 'Internal Memo', count: memoCount, fill: '#F59E0B' }
      ];

      // Analysis 1: Status Distribution
      const statusCounts: Record<string, number> = {};
      allReportJobs.forEach(j => {
          statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
      });
      const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Analysis 2: PIC Productivity (Top 5)
      const picCounts: Record<string, number> = {};
      allReportJobs.forEach(j => {
          const pic = j.customData?.picRepd || j.customData?.picUser || j.createdBy || 'Unknown';
          picCounts[pic] = (picCounts[pic] || 0) + 1;
      });
      const picLeaderboard = Object.entries(picCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Analysis 3: SLA Analysis
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const criticalJobs = allReportJobs.filter(j => {
          const deadline = new Date(j.deadline);
          deadline.setHours(0,0,0,0);
          return deadline <= today && !['DONE', 'Completed', 'Drop', 'Cancel'].includes(j.status);
      });

      const warningJobs = allReportJobs.filter(j => {
        const deadline = new Date(j.deadline);
        deadline.setHours(0,0,0,0);
        return deadline.getTime() === tomorrow.getTime() && !['DONE', 'Completed', 'Drop', 'Cancel'].includes(j.status);
      });

      const completionRate = allReportJobs.length > 0 
        ? Math.round((allReportJobs.filter(j => ['DONE', 'Completed'].includes(j.status)).length / allReportJobs.length) * 100) 
        : 0;

      return (
          <div className="space-y-6 animate-in fade-in duration-500">
              {/* TOP ALERTS */}
              <div className="space-y-2">
                {criticalJobs.length > 0 && (
                    <div 
                        onClick={() => setSummaryFilter({ key: 'overdue', value: 'Critical (H-0/Overdue)' })}
                        className="animate-blink-red p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer border-2 border-red-500"
                    >
                        <div className="flex items-center gap-3 font-black uppercase tracking-tighter italic">
                            <OctagonAlert className="w-6 h-6 animate-pulse" />
                            <span>LAPORAN SURAT KRITIS: {criticalJobs.length} Surat Overdue / Jatuh Tempo Hari Ini!</span>
                        </div>
                        <div className="hidden md:block font-bold underline">Tinjau Segera &rarr;</div>
                    </div>
                )}
                {warningJobs.length > 0 && (
                    <div 
                        onClick={() => setSummaryFilter({ key: 'warning', value: 'Warning (H-1)' })}
                        className="animate-blink-orange p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer border-2 border-amber-600"
                    >
                        <div className="flex items-center gap-3 font-black uppercase tracking-tighter italic">
                            <TriangleAlert className="w-6 h-6 animate-pulse" />
                            <span>PERINGATAN: {warningJobs.length} Surat Mendekati Batas Waktu Besok</span>
                        </div>
                        <div className="hidden md:block font-bold underline">Lihat Detail &rarr;</div>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div 
                    onClick={() => setSummaryFilter({ key: 'all', value: 'Semua Report Surat' })}
                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center cursor-pointer hover:shadow-md transition-all group"
                  >
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg mr-4 group-hover:bg-red-100"><FileText size={24}/></div>
                      <div>
                          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Surat</p>
                          <p className="text-2xl font-black text-gray-800">{allReportJobs.length}</p>
                      </div>
                  </div>
                  
                  <div 
                    onClick={() => setSummaryFilter({ key: 'overdue', value: 'Critical (H-0/Overdue)' })}
                    className={`p-5 rounded-xl shadow-sm border flex items-center cursor-pointer hover:shadow-md transition-all group ${criticalJobs.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}
                  >
                      <div className={`p-3 rounded-lg mr-4 ${criticalJobs.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600'}`}><AlertCircle size={24}/></div>
                      <div>
                          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Critical (H-0)</p>
                          <p className={`text-2xl font-black ${criticalJobs.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{criticalJobs.length}</p>
                      </div>
                  </div>

                  <div 
                    onClick={() => setSummaryFilter({ key: 'warning', value: 'Warning (H-1)' })}
                    className={`p-5 rounded-xl shadow-sm border flex items-center cursor-pointer hover:shadow-md transition-all group ${warningJobs.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}
                  >
                      <div className={`p-3 rounded-lg mr-4 ${warningJobs.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-amber-50 text-amber-600'}`}><Hourglass size={24}/></div>
                      <div>
                          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Warning (H-1)</p>
                          <p className={`text-2xl font-black ${warningJobs.length > 0 ? 'text-amber-600' : 'text-gray-800'}`}>{warningJobs.length}</p>
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                      <div className="p-3 bg-green-50 text-green-600 rounded-lg mr-4"><TrendingUp size={24}/></div>
                      <div>
                          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Completion</p>
                          <p className="text-2xl font-black text-gray-800">{completionRate}%</p>
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center lg:hidden xl:flex">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4"><Users size={24}/></div>
                      <div>
                          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Active PICs</p>
                          <p className="text-2xl font-black text-gray-800">{Object.keys(picCounts).length}</p>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Chart */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-700 mb-6 flex items-center">
                          <div className="w-1 h-4 bg-red-600 mr-2 rounded"></div>
                          Volume per Jenis Surat (Klik Bar untuk Detail)
                      </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={countsData} 
                                layout="vertical"
                                onClick={(data) => {
                                    if (data && data.activeLabel) {
                                        setSummaryFilter({ key: 'category', value: String(data.activeLabel) });
                                    }
                                }}
                              >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30} className="cursor-pointer">
                                    {countsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Status Pie Chart */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-700 mb-6 flex items-center">
                          <div className="w-1 h-4 bg-blue-600 mr-2 rounded"></div>
                          Analisa Status Distribusi (Klik Sektor untuk Detail)
                      </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={statusPieData}
                                      cx="50%" cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                      className="cursor-pointer"
                                      onClick={(data) => {
                                          if (data && data.name) {
                                              setSummaryFilter({ key: 'status', value: data.name });
                                          }
                                      }}
                                  >
                                      {statusPieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} />
                                      ))}
                                  </Pie>
                                  <RechartsTooltip />
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* PIC Productivity */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex items-center">
                         <Users className="w-4 h-4 mr-2 text-blue-600" /> Top PIC Productivity (Klik Baris untuk Detail)
                      </div>
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="text-left bg-gray-50/50 text-gray-500 text-xs uppercase">
                                  <th className="p-3">Nama PIC</th>
                                  <th className="p-3 text-center">Total Surat</th>
                                  <th className="p-3">Progress</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {picLeaderboard.map(([name, count]) => (
                                  <tr 
                                    key={name} 
                                    className="hover:bg-blue-50 transition-colors cursor-pointer group"
                                    onClick={() => setSummaryFilter({ key: 'pic', value: name })}
                                  >
                                      <td className="p-3 font-medium text-gray-700 group-hover:text-blue-600">{name}</td>
                                      <td className="p-3 text-center font-bold text-blue-600">{count}</td>
                                      <td className="p-3">
                                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                                              <div 
                                                className="bg-blue-600 h-1.5 rounded-full" 
                                                style={{ width: `${(count / allReportJobs.length) * 100}%` }}
                                              ></div>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {picLeaderboard.length === 0 && (
                                  <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">Belum ada data PIC.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Latest Activity / SLA Check */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex items-center">
                         <AlertCircle className="w-4 h-4 mr-2 text-red-600" /> Priority Attention (Near/Overdue)
                      </div>
                      <div className="divide-y overflow-y-auto max-h-[280px]">
                          {allReportJobs
                            .filter(j => !['DONE', 'Completed'].includes(j.status))
                            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                            .slice(0, 8)
                            .map(j => {
                                const dl = new Date(j.deadline);
                                dl.setHours(0,0,0,0);
                                const isCritical = dl <= today;
                                const isWarning = dl.getTime() === tomorrow.getTime();

                                return (
                                    <div key={j.id} className={`p-3 transition-colors flex justify-between items-center group cursor-default ${isCritical ? 'bg-red-50/50 hover:bg-red-100 animate-pulse' : isWarning ? 'bg-amber-50/50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-gray-800 truncate" title={j.jobType}>{j.jobType}</p>
                                            <p className="text-xs text-gray-500">{j.subCategory} • {j.branchDept}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className={`text-xs font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-600'}`}>
                                                {new Date(j.deadline).toLocaleDateString('id-ID')}
                                            </p>
                                            <p className="text-[10px] text-gray-400 uppercase">{j.status}</p>
                                        </div>
                                    </div>
                                );
                            })}
                          {allReportJobs.filter(j => !['DONE', 'Completed'].includes(j.status)).length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic">Semua pekerjaan sudah selesai.</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const CheckIcon = ({ checked }: { checked?: boolean }) => (
      checked ? <CheckSquare className="w-4 h-4 text-green-600 inline" /> : <Square className="w-4 h-4 text-gray-300 inline" />
  );

  const renderEmailMasukTable = () => (
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-blue-50 text-blue-900 font-semibold border-b border-blue-100">
            <tr>
                <th className="p-3">TGL EMAIL MASUK</th>
                <th className="p-3">PIC USER</th>
                <th className="p-3">CABANG/DEPT</th>
                <th className="p-3">SUBJECT EMAIL</th>
                <th className="p-3">JENIS PENGAJUAN</th>
                <th className="p-3">TGL UPDATE</th>
                <th className="p-3">PIC REPD</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-center">AKSI</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {reportJobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                    <td className="p-3">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">{job.customData?.picUser}</td>
                    <td className="p-3">{job.branchDept}</td>
                    <td className="p-3 max-w-xs truncate" title={job.jobType}>{job.jobType}</td>
                    <td className="p-3">{job.customData?.jenisPengajuan}</td>
                    <td className="p-3">{new Date(job.deadline).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">{job.customData?.picRepd}</td>
                    <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(job.status, job.deadline)}`}>
                            {job.status}
                        </span>
                    </td>
                    <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => startEdit(job)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Pencil size={14}/></button>
                            <button onClick={() => onDeleteJob(job.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                        </div>
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
  );

  const renderDisposisiTable = () => (
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-blue-50 text-blue-900 font-semibold border-b border-blue-100">
            <tr>
                <th className="p-3 border-r">TANGGAL</th>
                <th className="p-3 border-r">NO DISPOSISI</th>
                <th className="p-3 border-r">CABANG/DEPT</th>
                <th className="p-3 border-r">KLASIFIKASI</th>
                <th className="p-3 border-r max-w-xs">DESKRIPSI</th>
                <th className="p-3 border-r">STATUS</th>
                <th className="p-3 border-r">KETERANGAN</th>
                <th className="p-1 border-r text-center text-xs" colSpan={5}>APPROVAL CHECK</th>
                <th className="p-1 border-r text-center text-xs" colSpan={3}>KELENGKAPAN DOK</th>
                <th className="p-3 text-center">AKSI</th>
            </tr>
            <tr className="bg-blue-100 text-xs text-center">
                <th colSpan={7}></th>
                <th className="p-1 border-r border-blue-200">Head Dept</th>
                <th className="p-1 border-r border-blue-200">Head Div</th>
                <th className="p-1 border-r border-blue-200">Regional</th>
                <th className="p-1 border-r border-blue-200">VP</th>
                <th className="p-1 border-r border-blue-200">BOD</th>
                <th className="p-1 border-r border-blue-200">Soft</th>
                <th className="p-1 border-r border-blue-200">Hard</th>
                <th className="p-1 border-r border-blue-200">Lamp</th>
                <th></th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {reportJobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                    <td className="p-3">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                    <td className="p-3 font-mono text-xs">{job.customData?.nomorSurat}</td>
                    <td className="p-3">{job.branchDept}</td>
                    <td className="p-3">{job.customData?.klasifikasi}</td>
                    <td className="p-3 max-w-xs truncate" title={job.jobType}>{job.jobType}</td>
                    <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(job.status, job.deadline)}`}>
                            {job.status}
                        </span>
                    </td>
                    <td className="p-3 italic text-gray-500 max-w-xs truncate">{job.keterangan}</td>
                    
                    {/* Approvals */}
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.approvals?.headDept} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.approvals?.headDiv} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.approvals?.regional} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.approvals?.vp} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.approvals?.bod} /></td>
                    
                    {/* Docs */}
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.documents?.softCopy} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.documents?.hardCopy} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.documents?.lampiran} /></td>
                    
                    <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => startEdit(job)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Pencil size={14}/></button>
                            <button onClick={() => onDeleteJob(job.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                        </div>
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
  );

  const renderMemoTable = () => (
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-blue-50 text-blue-900 font-semibold border-b border-blue-100">
            <tr>
                <th className="p-3 border-r">TANGGAL</th>
                <th className="p-3 border-r">NO INTERNAL MEMO</th>
                <th className="p-3 border-r">CABANG/DEPT</th>
                <th className="p-3 border-r max-w-xs">DESKRIPSI</th>
                <th className="p-3 border-r">KETERANGAN</th>
                <th className="p-1 border-r text-center text-xs" colSpan={3}>KELENGKAPAN DOK</th>
                <th className="p-1 border-r text-center text-xs" colSpan={2}>SOSIALISASI</th>
                <th className="p-3 border-r">STATUS</th>
                <th className="p-3 text-center">AKSI</th>
            </tr>
            <tr className="bg-blue-100 text-xs text-center">
                <th colSpan={5}></th>
                <th className="p-1 border-r border-blue-200">Soft</th>
                <th className="p-1 border-r border-blue-200">Hard</th>
                <th className="p-1 border-r border-blue-200">Link</th>
                <th className="p-1 border-r border-blue-200">Cabang</th>
                <th className="p-1 border-r border-blue-200">IT</th>
                <th colSpan={2}></th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {reportJobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                    <td className="p-3">{new Date(job.dateInput).toLocaleDateString('id-ID')}</td>
                    <td className="p-3 font-mono text-xs">{job.customData?.nomorSurat}</td>
                    <td className="p-3">{job.branchDept}</td>
                    <td className="p-3 max-w-xs truncate" title={job.jobType}>{job.jobType}</td>
                    <td className="p-3 italic text-gray-500 max-w-xs truncate">{job.keterangan}</td>
                    
                    {/* Docs */}
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.documents?.softCopy} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.documents?.hardCopy} /></td>
                    <td className="p-2 text-center">
                        {job.customData?.documents?.link ? (
                            <a href={job.customData.documents.link} target="_blank" rel="noreferrer" title={job.customData.documents.link}>
                                <ExternalLink size={14} className="text-blue-600 inline" />
                            </a>
                        ) : '-'}
                    </td>
                    
                    {/* Soc */}
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.socialization?.cabang} /></td>
                    <td className="p-2 text-center"><CheckIcon checked={job.customData?.socialization?.it} /></td>
                    
                     <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(job.status, job.deadline)}`}>
                            {job.status}
                        </span>
                    </td>

                    <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => startEdit(job)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Pencil size={14}/></button>
                            <button onClick={() => onDeleteJob(job.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                        </div>
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
  );

  if (subCategory === 'Summary') {
      return renderSummary();
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
           <div className="flex items-center text-sm text-gray-500 mb-1">
            <span>Report Surat</span>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900">{subCategory}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Daftar {subCategory}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
            {view === 'list' && (
              <>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                 
                 <button 
                    onClick={() => handleExportData()}
                    className="flex items-center justify-center px-4 py-2 bg-[#002F6C] text-white rounded-lg hover:bg-blue-900 transition text-sm font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                 </button>

                 <button 
                    onClick={() => handleDownloadTemplate()}
                    className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  >
                    <FileDown className="w-4 h-4 mr-2" /> Template
                 </button>

                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Import
                 </button>

                 {hasCancelledJobs && (
                    <button 
                      onClick={onDeleteCancelled}
                      className="flex items-center justify-center px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                      title="Hapus Semua Data Berstatus Cancel/Drop"
                    >
                      <Eraser className="w-4 h-4 mr-2" />
                      Bersihkan Cancel
                    </button>
                  )}
                  <button onClick={() => setView('form')} className="flex items-center px-4 py-2 bg-[#EE2E24] text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
                      <Plus className="w-4 h-4 mr-2" /> Tambah Manual
                  </button>
              </>
            )}
            
            {view === 'form' && (
                <button onClick={() => { setView('list'); setEditingId(null); setFormData(initialFormState); }} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Batal
                </button>
            )}
        </div>
      </div>

      <div className="p-6 overflow-x-auto flex-1">
        {view === 'list' && (
            <>
                <div className="mb-4 relative max-w-md">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input 
                        type="text" 
                        placeholder="Cari..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="border rounded-lg overflow-hidden">
                    {subCategory === 'Email Masuk' && renderEmailMasukTable()}
                    {subCategory === 'Disposisi' && renderDisposisiTable()}
                    {subCategory === 'Internal Memo' && renderMemoTable()}
                </div>
            </>
        )}

        {view === 'form' && (
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium mb-1">{subCategory === 'Email Masuk' ? 'Tgl Email Masuk' : 'Tanggal'}</label>
                        <input type="date" required className="w-full border rounded p-2" 
                            value={formData.dateInput} onChange={e => setFormData({...formData, dateInput: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Cabang / Dept</label>
                        <input type="text" required className="w-full border rounded p-2" 
                            value={formData.branchDept} onChange={e => setFormData({...formData, branchDept: e.target.value})} />
                    </div>

                    {/* Specific: Email Masuk */}
                    {subCategory === 'Email Masuk' && (
                        <>
                             <div>
                                <label className="block text-sm font-medium mb-1">PIC User</label>
                                <input type="text" className="w-full border rounded p-2" 
                                    value={formData.customData?.picUser} onChange={e => handleCustomChange('picUser', e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Subject Email</label>
                                <input type="text" required className="w-full border rounded p-2" 
                                    value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Jenis Pengajuan</label>
                                <select className="w-full border rounded p-2"
                                    value={formData.customData?.jenisPengajuan} onChange={e => handleCustomChange('jenisPengajuan', e.target.value)}>
                                        <option value="">- Pilih -</option>
                                        <option value="Request Data">Request Data</option>
                                        <option value="PROBLEM">PROBLEM</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">PIC REPD</label>
                                <input type="text" className="w-full border rounded p-2" 
                                    value={formData.customData?.picRepd} onChange={e => handleCustomChange('picRepd', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select className="w-full border rounded p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                                    <option value="Pending">Pending</option>
                                    <option value="DONE">DONE</option>
                                    <option value="Hold">Hold</option>
                                    <option value="Cancel">Cancel</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">Tgl Update</label>
                                <input type="date" required className="w-full border rounded p-2" 
                                    value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                            </div>
                        </>
                    )}

                    {/* Specific: Disposisi & Memo */}
                    {(subCategory === 'Disposisi' || subCategory === 'Internal Memo') && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">{subCategory === 'Disposisi' ? 'No Disposisi' : 'No Internal Memo'}</label>
                                <input type="text" className="w-full border rounded p-2" 
                                    value={formData.customData?.nomorSurat} onChange={e => handleCustomChange('nomorSurat', e.target.value)} />
                            </div>
                            {subCategory === 'Disposisi' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Klasifikasi</label>
                                    <input type="text" className="w-full border rounded p-2" 
                                        value={formData.customData?.klasifikasi} onChange={e => handleCustomChange('klasifikasi', e.target.value)} />
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                                <textarea className="w-full border rounded p-2" rows={3}
                                    value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Keterangan</label>
                                <textarea className="w-full border rounded p-2" 
                                    value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
                            </div>

                            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3">Kelengkapan & Approval</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {subCategory === 'Disposisi' && (
                                        <div className="col-span-2 space-y-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Approval</p>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.approvals?.headDept} onChange={e => handleCustomChange('headDept', e.target.checked, 'approvals')} /><span>Head Dept</span></label>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.approvals?.headDiv} onChange={e => handleCustomChange('headDiv', e.target.checked, 'approvals')} /><span>Head Div</span></label>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.approvals?.regional} onChange={e => handleCustomChange('regional', e.target.checked, 'approvals')} /><span>Regional</span></label>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.approvals?.vp} onChange={e => handleCustomChange('vp', e.target.checked, 'approvals')} /><span>VP</span></label>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.approvals?.bod} onChange={e => handleCustomChange('bod', e.target.checked, 'approvals')} /><span>BOD</span></label>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Dokumen</p>
                                        <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.documents?.softCopy} onChange={e => handleCustomChange('softCopy', e.target.checked, 'documents')} /><span>Soft Copy</span></label>
                                        <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.documents?.hardCopy} onChange={e => handleCustomChange('hardCopy', e.target.checked, 'documents')} /><span>Hard Copy</span></label>
                                        {subCategory === 'Disposisi' && <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.documents?.lampiran} onChange={e => handleCustomChange('lampiran', e.target.checked, 'documents')} /><span>Lampiran</span></label>}
                                        {subCategory === 'Internal Memo' && (
                                            <div className="pt-2">
                                                <label className="text-xs block mb-1">Link Aktivasi</label>
                                                <input type="text" className="w-full text-xs border p-1 rounded" placeholder="https://..." 
                                                    value={formData.customData?.documents?.link} onChange={e => handleCustomChange('link', e.target.value, 'documents')} />
                                            </div>
                                        )}
                                    </div>

                                    {subCategory === 'Internal Memo' && (
                                         <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Sosialisasi</p>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.socialization?.cabang} onChange={e => handleCustomChange('cabang', e.target.checked, 'socialization')} /><span>Cabang/Dept</span></label>
                                            <label className="flex items-center space-x-2"><input type="checkbox" checked={formData.customData?.socialization?.it} onChange={e => handleCustomChange('it', e.target.checked, 'socialization')} /><span>IT</span></label>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select className="w-full border rounded p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                                    <option value="On Proses">On Proses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Drop">Drop</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Hold">Hold</option>
                                    <option value="Cancel">Cancel</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setView('list')} className="px-4 py-2 bg-white border rounded">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-[#002F6C] text-white rounded">{editingId ? 'Update' : 'Simpan'}</button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};
