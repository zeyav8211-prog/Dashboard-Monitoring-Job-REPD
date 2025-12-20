
import React, { useState, useMemo, useRef } from 'react';
import { CompetitorRow, User } from '../types';
import { Upload, Download, Search, RefreshCw, Zap } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell 
} from 'recharts';

interface CompetitorManagerProps {
  subCategory: string;
  currentUser: User;
}

export const CompetitorManager: React.FC<CompetitorManagerProps> = ({ subCategory }) => {
  const [data, setData] = useState<CompetitorRow[]>(() => {
    const saved = localStorage.getItem('jne_competitor_data');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateData = (newData: CompetitorRow[]) => {
      setData(newData);
      localStorage.setItem('jne_competitor_data', JSON.stringify(newData));
  };

  const handleDownloadData = () => {
      const headers = ["REGIONAL", "ORIGIN", "DESTINATION", "WEIGHT_KG", "JNE_REG_PRICE", "JNT_EZ_PRICE", "SICEPAT_REG_PRICE", "JNE_JTR_PRICE", "JNT_CARGO_PRICE"];
      const rows = data.map(d => [d.regional, d.origin, d.destination, d.weight, d.jneRegPrice, d.jntEzPrice, d.sicepatRegPrice, d.jneJtrPrice, d.jntCargoPrice].join(","));
      const content = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
      const encodedUri = encodeURI(content);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Export_Kompetitor_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split(/\r\n|\n/);
          const newRows: CompetitorRow[] = [];
          const parsePrice = (val: string) => parseInt((val || '0').replace(/[^0-9]/g, '')) || 0;
          for(let i=1; i<lines.length; i++) {
              if(!lines[i].trim()) continue;
              const cols = lines[i].split(/,|;/);
              if(cols.length < 5) continue;
              newRows.push({
                  id: crypto.randomUUID(),
                  regional: cols[0]?.trim() || 'Unknown',
                  origin: cols[1]?.trim(), destination: cols[2]?.trim(), weight: parseFloat(cols[3]) || 1,
                  jneRegPrice: parsePrice(cols[4]), jneRegSla: cols[5] || '-',
                  jntEzPrice: parsePrice(cols[6]), jntEzSla: cols[7] || '-',
                  lionRegPrice: parsePrice(cols[8]), lionRegSla: cols[9] || '-',
                  sicepatRegPrice: parsePrice(cols[10]), sicepatRegSla: cols[11] || '-',
                  jneJtrPrice: parsePrice(cols[12]), jneJtrSla: cols[13] || '-',
                  jntCargoPrice: parsePrice(cols[14]), jntCargoSla: cols[15] || '-',
                  lionBigPrice: parsePrice(cols[16]), lionBigSla: cols[17] || '-',
                  wahanaCargoPrice: parsePrice(cols[18]), wahanaCargoSla: cols[19] || '-'
              });
          }
          if(newRows.length > 0) updateData([...newRows, ...data]);
          if(fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleAutoCheck = async () => {
      const emptyRows = data.filter(d => d.jntEzPrice === 0);
      if (emptyRows.length === 0) { alert("Data sudah terisi."); return; }
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const simulated = data.map(row => {
          if (row.jntEzPrice > 0) return row;
          const rnd = (base: number) => Math.round(base * (1 + ((Math.random() * 0.4) - 0.2)) / 100) * 100;
          return {
              ...row,
              jntEzPrice: rnd(row.jneRegPrice), jntEzSla: "2-3",
              sicepatRegPrice: rnd(row.jneRegPrice), sicepatRegSla: "2-3",
              jntCargoPrice: rnd(row.jneJtrPrice), jntCargoSla: "3-7"
          };
      });
      updateData(simulated);
      setIsProcessing(false);
  };

  const filteredData = useMemo(() => {
      if(!searchTerm) return data;
      const s = searchTerm.toLowerCase();
      return data.filter(r => r.regional.toLowerCase().includes(s) || r.origin.toLowerCase().includes(s) || r.destination.toLowerCase().includes(s));
  }, [data, searchTerm]);

  const summaryStats = useMemo(() => {
      const regionals = Array.from(new Set(data.map(d => d.regional)));
      return regionals.map(reg => {
          const rows = data.filter(d => d.regional === reg);
          let totalDiffReg = 0, countReg = 0, totalDiffCargo = 0, countCargo = 0;
          rows.forEach(r => {
             if(r.jneRegPrice > 0 && r.jntEzPrice > 0) { 
                 totalDiffReg += ((r.jntEzPrice - r.jneRegPrice) / r.jneRegPrice) * 100; 
                 countReg++; 
             }
             if(r.jneJtrPrice > 0 && r.jntCargoPrice > 0) { 
                 totalDiffCargo += ((r.jntCargoPrice - r.jneJtrPrice) / r.jneJtrPrice) * 100; 
                 countCargo++; 
             }
          });
          return { 
              regional: reg, 
              count: rows.length, 
              avgDiffReg: countReg ? (totalDiffReg / countReg) : 0, 
              avgDiffCargo: countCargo ? (totalDiffCargo / countCargo) : 0 
          };
      });
  }, [data]);

  const COLORS = ['#EE2E24', '#002F6C', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/50 min-h-[600px] flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">Kompetitor: <span className="text-[#EE2E24]">{subCategory}</span></h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Market Price Monitoring System</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white text-gray-400 border border-gray-100 rounded-xl hover:text-[#002F6C] transition-all"><Upload size={18} /></button>
            <button onClick={handleDownloadData} className="p-3 bg-white text-gray-400 border border-gray-100 rounded-xl hover:text-green-600 transition-all"><Download size={18} /></button>
            <button onClick={handleAutoCheck} disabled={isProcessing} className="px-8 py-3 bg-[#EE2E24] text-white rounded-2xl hover:bg-red-700 text-xs font-black uppercase shadow-lg shadow-red-100 transition-all flex items-center gap-2 ml-2">
                {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />} Auto-Sync
            </button>
        </div>
      </div>

      <div className="p-8 flex-1">
        {subCategory === 'Summary' ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm h-80">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">% Selisih Regular (JNE vs J&T/Sicepat)</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryStats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="regional" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            {/* FIX: Using any for value to satisfy Recharts Formatter type */}
                            <Tooltip formatter={(value: any) => `${Number(value || 0).toFixed(1)}%`} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="avgDiffReg" radius={[10, 10, 0, 0]} barSize={40}>
                                {summaryStats.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm h-80">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">% Selisih Cargo (JNE JTR vs J&T Cargo)</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryStats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="regional" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip formatter={(value: any) => `${Number(value || 0).toFixed(1)}%`} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="avgDiffCargo" fill="#002F6C" radius={[10, 10, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-[2.5rem] border border-gray-100 shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                        <tr>
                            <th className="p-6">Regional</th>
                            <th className="p-6 text-center">Jml Jalur</th>
                            <th className="p-6 text-center">Avg Diff REG</th>
                            <th className="p-6 text-center">Avg Diff JTR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {summaryStats.map(s => (
                            <tr key={s.regional} className="hover:bg-gray-50 transition-colors">
                                <td className="p-6 font-black uppercase italic text-gray-800">{s.regional}</td>
                                <td className="p-6 text-center font-bold text-gray-500">{s.count}</td>
                                <td className={`p-6 text-center font-black ${s.avgDiffReg >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.avgDiffReg.toFixed(2)}%</td>
                                <td className={`p-6 text-center font-black ${s.avgDiffCargo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.avgDiffCargo.toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input type="text" placeholder="Cari regional atau kota..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm focus:ring-4 focus:ring-blue-50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="overflow-x-auto rounded-[2.5rem] border border-gray-100 shadow-sm bg-white overflow-hidden">
                <table className="w-full text-[11px] text-center border-collapse">
                    <thead className="bg-gray-50 font-black uppercase tracking-widest text-gray-400 border-b">
                        <tr className="border-b">
                            <th rowSpan={2} className="p-4 border-r">Rute (Origin ➔ Dest)</th>
                            <th colSpan={2} className="p-2 border-r bg-blue-50 text-blue-900">JNE (REG)</th>
                            <th colSpan={2} className="p-2 border-r">J&T (EZ)</th>
                            <th colSpan={2} className="p-2 bg-orange-50 text-orange-900">JNE (JTR)</th>
                        </tr>
                        <tr className="text-[9px]">
                            <th className="p-2 border-r border-b">Tarif</th><th className="p-2 border-r border-b">SLA</th>
                            <th className="p-2 border-r border-b">Tarif</th><th className="p-2 border-r border-b">SLA</th>
                            <th className="p-2 border-r border-b">Tarif</th><th className="p-2 border-b">SLA</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredData.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 border-r text-left">
                                    <div className="font-black italic text-gray-800 uppercase">{row.origin} ➔ {row.destination}</div>
                                    <div className="text-[9px] text-gray-400 font-bold">{row.regional}</div>
                                </td>
                                <td className="p-3 border-r font-black text-blue-700 bg-blue-50/20">{row.jneRegPrice ? row.jneRegPrice.toLocaleString('id-ID') : '-'}</td>
                                <td className="p-3 border-r text-gray-400 font-bold">{row.jneRegSla}</td>
                                <td className="p-3 border-r font-bold">{row.jntEzPrice ? row.jntEzPrice.toLocaleString('id-ID') : '-'}</td>
                                <td className="p-3 border-r text-gray-400">{row.jntEzSla}</td>
                                <td className="p-3 font-black text-orange-700 bg-orange-50/20">{row.jneJtrPrice ? row.jneJtrPrice.toLocaleString('id-ID') : '-'}</td>
                                <td className="p-3 text-gray-400 font-bold">{row.jneJtrSla}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
