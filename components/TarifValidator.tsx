
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, FileUp, Download, Eye, X, History, Trash2, 
  ChevronLeft, ChevronRight, Search, FileText, Database, 
  BarChart2, Clock, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { 
  ValidationResult, ValidationMismatch, FullValidationRow, 
  ValidationHistoryItem, ValidationCategory 
} from '../types';

interface TarifValidatorProps {
    category: ValidationCategory;
}

type CSVRowData = Record<string, any>;

export const TarifValidator: React.FC<TarifValidatorProps> = ({ category }) => {
  const [viewMode, setViewMode] = useState<'form' | 'history'>('form');
  const [fileIT, setFileIT] = useState<File | null>(null);
  const [fileMaster, setFileMaster] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 50;
  
  const [history, setHistory] = useState<ValidationHistoryItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'MATCH' | 'MISMATCH' | 'BLANK'>('ALL');

  useEffect(() => {
    const savedHistory = localStorage.getItem('jne_validation_history');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            localStorage.removeItem('jne_validation_history');
        }
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('jne_validation_history', JSON.stringify(history));
    } catch (e) {
        // Fallback if localStorage is full: keep only last 10
        if (history.length > 10) {
            setHistory(prev => prev.slice(0, 10));
        }
    }
  }, [history]);

  useEffect(() => {
      setFileIT(null);
      setFileMaster(null);
      setResult(null);
      setShowFullReport(false);
      setProgress(0);
      setStatusMessage('');
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'IT' | 'MASTER') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'IT') setFileIT(e.target.files[0]);
      else setFileMaster(e.target.files[0]);
    }
  };

  const handleViewHistoryItem = (item: ValidationHistoryItem) => {
      setResult(item.result);
      setViewMode('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Hapus histori ini?')) {
          setHistory(prev => prev.filter(h => h.id !== id));
      }
  };

  const downloadTemplate = (type: 'IT' | 'MASTER') => {
    let content: string = '';
    let filename: string = '';
    if (category === 'TARIF') {
        if (type === 'IT') {
            content = 'ORIGIN,DEST,SYS_CODE,SERVICE,TARIF,SLA_FORM,SLA_THRU\nMES10612,AMI10000,MES10612AMI10000,REG23,59000,3,5';
            filename = `Template_IT_TARIF.csv`;
        } else {
            content = 'ORIGIN,DEST,SYS_CODE,Service REG,Tarif REG,sla form REG,sla thru REG\nDJJ10000,AMI10000,DJJ10000AMI10000,REG23,107000,4,5';
            filename = `Template_Master_TARIF.csv`;
        }
    } else {
        if (type === 'IT') {
            content = 'ORIGIN,DESTINASI,SERVICE,BT,BD,BD NEXT,BP,BP NEXT\nAMI20100,BDJ10502,REG19,1500,3200,0,0,0';
            filename = `Template_IT_BIAYA.csv`;
        } else {
            content = 'DESTINASI,ZONA,BP OKE23,BP NEXT OKE23,BT OKE23,BD OKE23,BP REG23,BP NEXT REG23,BT REG23,BD REG23,BD NEXT REG23\nAMI10000,A,1500,0,1200,3200,2000,0,1500,3500,0';
            filename = `Template_Master_BIAYA.csv`;
        }
    }
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); window.URL.revokeObjectURL(url);
  };

  const downloadFullReport = (rowsToDownload?: FullValidationRow[]) => {
    if (!result) return;
    const dataToExport = rowsToDownload || result.fullReport || [];
    const csvHeader = category === 'TARIF' 
        ? ['ORIGIN', 'DEST', 'SYS_CODE', 'Service Master', 'Tarif Master', 'SLA Master', 'Service IT', 'Tarif IT', 'SLA IT', 'Keterangan']
        : ['ORIGIN', 'DEST', 'SERVICE IT', 'ACUAN', 'BP Master', 'BT Master', 'BD Master', 'BP IT', 'BT IT', 'BD IT', 'Keterangan'];

    const esc = (val: any) => {
        const s = String(val ?? '');
        return (s.includes(',') || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csvRows = dataToExport.map((row: any) => {
        if (category === 'TARIF') {
            return [
                esc(row.origin), esc(row.dest), esc(row.sysCode), esc(row.serviceMaster), 
                row.tarifMaster, `${row.slaFormMaster}-${row.slaThruMaster}`,
                esc(row.serviceIT), row.tarifIT, `${row.slaFormIT}-${row.slaThruIT}`, esc(row.keterangan)
            ].join(',');
        } else {
            return [
                esc(row.origin), esc(row.dest), esc(row.serviceIT), esc(row.serviceMaster),
                row.bpMaster, row.btMaster, row.bdMaster,
                row.bpIT, row.btIT, row.bdIT, esc(row.keterangan)
            ].join(',');
        }
    });

    const csvContent = [csvHeader.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Report_${category}_${new Date().getTime()}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); window.URL.revokeObjectURL(url);
  };

  const parseLine = (line: string, delimiter: string): string[] => {
    const parts: string[] = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === delimiter && !inQuotes) {
            parts.push(line.substring(start, i));
            start = i + 1;
        }
    }
    parts.push(line.substring(start));
    return parts.map(v => v.trim().replace(/^"|"$/g, ''));
  };

  const processFileChunked = async (
      file: File, 
      onRows: (rows: CSVRowData[]) => void,
      onProgress: (percent: number) => void
  ) => {
      let offset: number = 0;
      let leftover: string = '';
      let headers: string[] | null = null;
      let delimiter: string = ',';
      const CHUNK_SIZE = 1024 * 1024 * 2; 
      
      while (offset < file.size) {
          const slice = file.slice(offset, offset + CHUNK_SIZE);
          const text = await slice.text();
          const cleanText = (offset === 0) ? text.replace(/^\uFEFF/, '') : text;
          const rawLines = (leftover + cleanText).split(/\r\n|\n/);
          leftover = (offset + CHUNK_SIZE < file.size) ? (rawLines.pop() || '') : '';

          if (rawLines.length > 0) {
              let startIndex = 0;
              if (!headers) {
                  const first = rawLines[0];
                  delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
                  headers = parseLine(first, delimiter);
                  startIndex = 1;
              }
              const chunkRowsArray: CSVRowData[] = [];
              for (let i = startIndex; i < rawLines.length; i++) {
                  if (!rawLines[i].trim()) continue;
                  const vals = parseLine(rawLines[i], delimiter);
                  const obj: CSVRowData = {};
                  headers.forEach((h, idx) => { if (h) obj[h.trim()] = vals[idx] || ''; });
                  chunkRowsArray.push(obj);
              }
              onRows(chunkRowsArray);
          }
          offset += CHUNK_SIZE;
          onProgress(Math.min(Math.round((offset / file.size) * 100), 100));
          await new Promise(r => setTimeout(r, 0));
      }
  };

  const processValidation = async () => {
    if (!fileIT || !fileMaster) return;
    setIsValidating(true); setProgress(0); setStatusMessage('Membaca Master Data...');
    
    try {
        const masterMap = new Map<string, CSVRowData>();
        await processFileChunked(fileMaster, (chunk) => {
            chunk.forEach((row) => {
                const k = String(row[Object.keys(row).find(k => k.toUpperCase().includes(category === 'BIAYA' ? 'DEST' : 'SYS')) || ''] || '').trim().toUpperCase();
                if (k) masterMap.set(k, row);
            });
        }, (p) => setProgress(p * 0.3));

        setStatusMessage('Validasi Data IT...');
        const fullReportCollector: FullValidationRow[] = [];
        const mismatchesCollector: ValidationMismatch[] = [];
        let matchesCount = 0, blanksCount = 0, globalIndexCounter = 0;

        const parseNum = (v: any) => parseInt(String(v || '0').replace(/[^0-9]/g, '')) || 0;

        await processFileChunked(fileIT, (chunk) => {
            chunk.forEach((itRow) => {
                globalIndexCounter++;
                const sysKey = Object.keys(itRow).find(k => k.toUpperCase().includes(category === 'BIAYA' ? 'DEST' : 'SYS')) || '';
                const sysCode = String(itRow[sysKey] || '').trim().toUpperCase();
                const masterRow = masterMap.get(sysCode);
                
                const reportRow: FullValidationRow = {
                    origin: String(itRow['ORIGIN'] || ''),
                    dest: category === 'BIAYA' ? sysCode : String(itRow['DEST'] || ''),
                    sysCode,
                    serviceMaster: String(masterRow?.[Object.keys(masterRow || {}).find(k => k.toUpperCase().includes('SERV')) || ''] || '-'),
                    tarifMaster: parseNum(masterRow?.[Object.keys(masterRow || {}).find(k => k.toUpperCase().includes('TARIF')) || '']),
                    slaFormMaster: parseNum(masterRow?.[Object.keys(masterRow || {}).find(k => k.toUpperCase().includes('FORM')) || '']),
                    slaThruMaster: parseNum(masterRow?.[Object.keys(masterRow || {}).find(k => k.toUpperCase().includes('THRU')) || '']),
                    serviceIT: String(itRow[Object.keys(itRow).find(k => k.toUpperCase().includes('SERV')) || ''] || '-'),
                    tarifIT: parseNum(itRow[Object.keys(itRow).find(k => k.toUpperCase().includes('TARIF')) || '']),
                    slaFormIT: parseNum(itRow[Object.keys(itRow).find(k => k.toUpperCase().includes('FORM')) || '']),
                    slaThruIT: parseNum(itRow[Object.keys(itRow).find(k => k.toUpperCase().includes('THRU')) || '']),
                    keterangan: masterRow ? 'Sesuai' : 'Master Data Tidak Ada'
                };

                if (masterRow) {
                    const issuesArray: string[] = [];
                    if (reportRow.tarifIT !== reportRow.tarifMaster) issuesArray.push('Tarif');
                    if (reportRow.slaFormIT !== reportRow.slaFormMaster) issuesArray.push('SLA');
                    if (issuesArray.length > 0) {
                        reportRow.keterangan = `Tidak sesuai: ${issuesArray.join(', ')}`;
                        mismatchesCollector.push({ rowId: globalIndexCounter, reasons: issuesArray, details: [] });
                    } else matchesCount++;
                } else blanksCount++;
                fullReportCollector.push(reportRow);
            });
        }, (p) => setProgress(30 + (p * 0.7)));

        const finalResult: ValidationResult = { 
            totalRows: fullReportCollector.length, 
            matches: matchesCount, 
            blanks: blanksCount, 
            mismatches: mismatchesCollector, 
            fullReport: fullReportCollector 
        };
        
        setResult(finalResult);
        setHistory((prev) => [{
            id: Date.now().toString(), 
            timestamp: new Date().toLocaleString('id-ID'),
            fileNameIT: fileIT.name, 
            fileNameMaster: fileMaster.name, 
            category, 
            result: finalResult
        }, ...prev]);

    } catch (e: any) { 
        alert(`Gagal validasi: ${e.message}`); 
    } finally { 
        setIsValidating(false); 
    }
  };

  const filteredRowsForDisplay = useMemo(() => {
    if (!result?.fullReport) return [];
    if (reportFilter === 'MATCH') return result.fullReport.filter(r => r.keterangan === 'Sesuai');
    if (reportFilter === 'MISMATCH') return result.fullReport.filter(r => r.keterangan.startsWith('Tidak sesuai'));
    if (reportFilter === 'BLANK') return result.fullReport.filter(r => r.keterangan.includes('Tidak Ada'));
    return result.fullReport;
  }, [result, reportFilter]);

  const paginatedRowsForDisplay = filteredRowsForDisplay.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const renderHistory = () => (
      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <div className="p-4 bg-[#002F6C] rounded-[1.5rem] text-white">
                      <History size={24} />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Histori <span className="text-[#EE2E24]">Validasi</span></h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Daftar laporan yang pernah dijalankan</p>
                  </div>
              </div>
              <button 
                  onClick={() => setViewMode('form')} 
                  className="px-8 py-3 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                  <ChevronLeft size={16} /> Kembali
              </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
              {history.length === 0 ? (
                  <div className="p-20 bg-white rounded-[3rem] border border-gray-100 text-center space-y-4 shadow-sm">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                          <History size={40} />
                      </div>
                      <p className="text-gray-400 font-bold uppercase italic tracking-widest text-xs">Belum ada histori validasi tersimpan</p>
                  </div>
              ) : (
                  history.filter(h => h.category === category).map((item) => (
                      <div 
                          key={item.id} 
                          onClick={() => handleViewHistoryItem(item)}
                          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex items-center justify-between"
                      >
                          <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#002F6C] group-hover:text-white transition-all">
                                  <FileText size={24} />
                              </div>
                              <div>
                                  <div className="flex items-center gap-3">
                                      <p className="font-black text-gray-800 uppercase italic">{item.timestamp}</p>
                                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">{item.category}</span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                      <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase"><Database size={10}/> IT: {item.fileNameIT}</span>
                                      <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase"><Database size={10}/> Master: {item.fileNameMaster}</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                              <div className="flex gap-4">
                                  <div className="text-center">
                                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Akurat</p>
                                      <p className="text-sm font-black text-green-600 leading-none">{item.result.matches}</p>
                                  </div>
                                  <div className="text-center">
                                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Beda</p>
                                      <p className="text-sm font-black text-red-600 leading-none">{item.result.mismatches.length}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button onClick={(e) => handleDeleteHistoryItem(item.id, e)} className="p-3 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                                      <Trash2 size={18} />
                                  </button>
                                  <div className="p-3 text-gray-300 group-hover:text-[#002F6C] transition-colors">
                                      <Eye size={18} />
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-left space-y-1">
            <h2 className="text-4xl font-black text-[#002F6C] uppercase italic tracking-tighter leading-none">Validasi <span className="text-[#EE2E24]">{category}</span></h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">JNE Data Integrity System - Build Ver 2.5</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setViewMode('history')}
                className={`px-8 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-sm ${viewMode === 'history' ? 'bg-[#002F6C] text-white' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
            >
                <History size={16} /> Lihat Histori
            </button>
            {result && (
                <button 
                    onClick={() => {setResult(null); setFileIT(null); setFileMaster(null); window.scrollTo({top:0, behavior:'smooth'})}} 
                    className="px-8 py-3 bg-red-50 text-[#EE2E24] rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-[#EE2E24] hover:text-white transition-all shadow-sm flex items-center gap-2"
                >
                    <Trash2 size={16} /> Reset
                </button>
            )}
        </div>
      </div>

      {viewMode === 'history' ? renderHistory() : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[ {t:'IT', f:fileIT, c:'blue'}, {t:'MASTER', f:fileMaster, c:'red'} ].map(x => (
                <div key={x.t} className={`bg-white p-10 rounded-[3rem] shadow-xl border-2 transition-all group ${x.f ? 'border-green-500 shadow-green-50' : 'border-gray-50 hover:border-gray-200 shadow-gray-100/50'}`}>
                    <div className={`w-20 h-20 rounded-[2rem] bg-${x.c === 'blue' ? 'blue-50' : 'red-50'} text-${x.c === 'blue' ? 'blue-600' : 'red-600'} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                    <FileUp size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-2 uppercase italic tracking-tighter">Data {x.t}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Pilih file CSV yang akan divalidasi</p>
                    <input type="file" id={`f-${x.t}`} className="hidden" accept=".csv" onChange={e => handleFileChange(e, x.t as any)} />
                    <label htmlFor={`f-${x.t}`} className="block w-full p-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-center cursor-pointer hover:bg-gray-50 text-sm font-black text-gray-400 truncate tracking-tight">
                        {x.f ? x.f.name : 'KLIK UNTUK MEMILIH FILE'}
                    </label>
                    <button onClick={() => downloadTemplate(x.t as any)} className="mt-6 text-[10px] font-black uppercase text-blue-600 hover:text-red-600 flex items-center gap-2 transition-colors">
                        <Download size={14} /> DOWNLOAD TEMPLATE
                    </button>
                </div>
                ))}
            </div>

            <div className="flex flex-col items-center">
                {isValidating ? (
                    <div className="w-full max-w-xl space-y-4 bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100">
                        <div className="flex justify-between text-xs font-black uppercase italic tracking-tighter">
                        <span className="text-gray-400">{statusMessage}</span>
                        <span className="text-blue-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-[#002F6C] to-blue-500 h-full transition-all duration-300" style={{width:`${progress}%`}}></div>
                        </div>
                    </div>
                ) : (
                    <button 
                    onClick={processValidation} 
                    disabled={!fileIT || !fileMaster} 
                    className="px-16 py-6 bg-gradient-to-br from-[#002F6C] to-blue-900 text-white rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-2xl shadow-blue-200 hover:-translate-y-2 transition-all active:scale-95 disabled:opacity-30 disabled:translate-y-0"
                    >
                        JALANKAN VALIDASI DATA
                    </button>
                )}
            </div>

            {result && (
                <div className="bg-white rounded-[4rem] shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
                    <div className="p-12 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]">
                                <BarChart2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-gray-800 uppercase italic leading-none tracking-tighter">Hasil <span className="text-[#EE2E24]">Validasi</span></h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3">Statistik komparasi data real-time</p>
                            </div>
                        </div>
                        <button onClick={() => downloadFullReport()} className="px-10 py-4 bg-green-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-green-100 flex items-center gap-3 hover:bg-green-700 transition-all hover:-translate-y-1">
                            <Download size={20}/> EXPORT DETAIL DATA
                        </button>
                    </div>
                    <div className="p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { l: 'Total Baris', v: result.totalRows, c: 'blue', f: 'ALL', i: FileText },
                            { l: 'Data Akurat', v: result.matches, c: 'green', f: 'MATCH', i: CheckCircle2 },
                            { l: 'Beda Nilai', v: result.mismatches.length, c: 'red', f: 'MISMATCH', i: AlertCircle },
                            { l: 'Master Kosong', v: result.blanks, c: 'amber', f: 'BLANK', i: Database }
                        ].map(s => (
                            <div key={s.l} onClick={() => { setReportFilter(s.f as any); setCurrentPage(1); setShowFullReport(true); }} className={`p-10 rounded-[3.5rem] bg-${s.c === 'blue' ? 'blue-50' : s.c === 'green' ? 'green-50' : s.c === 'red' ? 'red-50' : 'amber-50'} border-2 border-${s.c === 'blue' ? 'blue-100' : s.c === 'green' ? 'green-100' : s.c === 'red' ? 'red-100' : 'amber-100'} cursor-pointer hover:scale-105 transition-all shadow-sm group`}>
                                <div className="flex justify-between items-start mb-4">
                                    <p className={`text-[10px] font-black uppercase text-${s.c === 'blue' ? 'blue-600' : s.c === 'green' ? 'green-600' : s.c === 'red' ? 'red-600' : 'amber-600'} tracking-[0.2em]`}>{s.l}</p>
                                    <s.i size={16} className={`text-${s.c === 'blue' ? 'blue-300' : s.c === 'green' ? 'green-300' : s.c === 'red' ? 'red-300' : 'amber-300'}`} />
                                </div>
                                <p className="text-5xl font-black text-gray-800 tracking-tighter leading-none">{s.v.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </>
      )}

      {showFullReport && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-[95vw] h-[92vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden border-4 border-white/20">
                <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h4 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Preview <span className="text-[#EE2E24]">{reportFilter}</span> Records</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Menampilkan {filteredRowsForDisplay.length} baris data</p>
                    </div>
                    <button onClick={() => setShowFullReport(false)} className="p-4 bg-white text-gray-400 hover:text-red-600 rounded-2xl shadow-xl hover:shadow-red-50 transition-all active:scale-95"><X size={28}/></button>
                </div>
                <div className="flex-1 overflow-auto p-10 scrollbar-hide">
                    <table className="w-full text-xs text-left border-separate border-spacing-y-4">
                        <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md rounded-2xl font-black uppercase text-gray-400 tracking-widest">
                            <tr>
                                <th className="p-6">SYS CODE</th>
                                <th className="p-6">MASTER DATA</th>
                                <th className="p-6">IT DATA</th>
                                <th className="p-6 text-center">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRowsForDisplay.map((r: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50 transition-all group bg-white shadow-sm">
                                    <td className="p-6 font-black text-gray-800 rounded-l-[2rem] border-y border-l border-gray-100 bg-white group-hover:bg-blue-50/30">{r.sysCode}</td>
                                    <td className="p-6 border-y border-gray-100 bg-white group-hover:bg-blue-50/30">
                                        <div className="space-y-1">
                                            <p className="font-black text-blue-700 italic uppercase">{r.serviceMaster}</p>
                                            <p className="text-[10px] font-bold text-gray-400">Tarif: Rp {r.tarifMaster.toLocaleString()}</p>
                                        </div>
                                    </td>
                                    <td className="p-6 border-y border-gray-100 bg-white group-hover:bg-blue-50/30">
                                        <div className="space-y-1">
                                            <p className="font-black text-red-700 italic uppercase">{r.serviceIT}</p>
                                            <p className="text-[10px] font-bold text-gray-400">Tarif: Rp {r.tarifIT.toLocaleString()}</p>
                                        </div>
                                    </td>
                                    <td className="p-6 rounded-r-[2rem] border-y border-r border-gray-100 bg-white group-hover:bg-blue-50/30 text-center">
                                        <span className={`px-6 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest border ${r.keterangan === 'Sesuai' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{r.keterangan}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-10 bg-gray-50 border-t flex justify-between items-center">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Halaman {currentPage} dari {Math.ceil(filteredRowsForDisplay.length / ROWS_PER_PAGE) || 1}</p>
                    <div className="flex gap-4">
                        <button disabled={currentPage === 1} onClick={() => {setCurrentPage(p => p - 1); window.scrollTo({top:0, behavior:'smooth'})}} className="p-5 bg-white border border-gray-200 text-gray-400 rounded-2xl disabled:opacity-30 hover:shadow-lg transition-all"><ChevronLeft size={24}/></button>
                        <button disabled={currentPage >= Math.ceil(filteredRowsForDisplay.length / ROWS_PER_PAGE)} onClick={() => {setCurrentPage(p => p + 1); window.scrollTo({top:0, behavior:'smooth'})}} className="p-5 bg-white border border-gray-200 text-gray-400 rounded-2xl disabled:opacity-30 hover:shadow-lg transition-all"><ChevronRight size={24}/></button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
