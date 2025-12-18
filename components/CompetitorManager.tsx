
import React, { useState, useMemo, useRef } from 'react';
import { CompetitorRow, User } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';
import { Upload, Download, Search, ArrowLeft, RefreshCw, Zap, Server, AlertCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface CompetitorManagerProps {
  subCategory: string;
  currentUser: User;
}

export const CompetitorManager: React.FC<CompetitorManagerProps> = ({ subCategory }) => {
  // Mock initial data using LocalStorage for persistence in this demo
  const [data, setData] = useState<CompetitorRow[]>(() => {
    const saved = localStorage.getItem('jne_competitor_data');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegional, setSelectedRegional] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useRealApi, setUseRealApi] = useState(false); // Toggle for Real vs Simulation
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateData = (newData: CompetitorRow[]) => {
      setData(newData);
      localStorage.setItem('jne_competitor_data', JSON.stringify(newData));
  };

  // --- DOWNLOAD & UPLOAD LOGIC ---

  const handleDownloadTemplate = () => {
      const headers = [
          "REGIONAL", "ORIGIN", "DESTINATION", "WEIGHT_KG",
          "JNE_REG_PRICE", "JNE_REG_SLA",
          "JNT_EZ_PRICE", "JNT_EZ_SLA",
          "LION_REG_PRICE", "LION_REG_SLA",
          "SICEPAT_REG_PRICE", "SICEPAT_REG_SLA",
          "JNE_JTR_PRICE", "JNE_JTR_SLA",
          "JNT_CARGO_PRICE", "JNT_CARGO_SLA",
          "LION_BIG_PRICE", "LION_BIG_SLA",
          "WAHANA_CARGO_PRICE", "WAHANA_CARGO_SLA"
      ];
      
      const example = "BNN,JAKARTA,BANDUNG,1,23000,3-5,0,0,0,0,0,0,90000,4-5,0,0,0,0,0,0";
      const content = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + example;
      const encodedUri = encodeURI(content);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Template_Kompetitor.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadData = () => {
      const headers = [
          "REGIONAL", "ORIGIN", "DESTINATION", "WEIGHT_KG",
          "JNE_REG_PRICE", "JNE_REG_SLA",
          "JNT_EZ_PRICE", "JNT_EZ_SLA",
          "LION_REG_PRICE", "LION_REG_SLA",
          "SICEPAT_REG_PRICE", "SICEPAT_REG_SLA",
          "JNE_JTR_PRICE", "JNE_JTR_SLA",
          "JNT_CARGO_PRICE", "JNT_CARGO_SLA",
          "LION_BIG_PRICE", "LION_BIG_SLA",
          "WAHANA_CARGO_PRICE", "WAHANA_CARGO_SLA"
      ];

      const rows = data.map(d => [
          d.regional, d.origin, d.destination, d.weight,
          d.jneRegPrice, d.jneRegSla, d.jntEzPrice, d.jntEzSla, d.lionRegPrice, d.lionRegSla, d.sicepatRegPrice, d.sicepatRegSla,
          d.jneJtrPrice, d.jneJtrSla, d.jntCargoPrice, d.jntCargoSla, d.lionBigPrice, d.lionBigSla, d.wahanaCargoPrice, d.wahanaCargoSla
      ].join(","));
      
      const content = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
      const encodedUri = encodeURI(content);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Data_Kompetitor_${new Date().toISOString().split('T')[0]}.csv`);
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

          for(let i=1; i<lines.length; i++) {
              if(!lines[i].trim()) continue;
              const cols = lines[i].split(/,|;/);
              if(cols.length < 5) continue;

              const parsePrice = (val: string) => parseInt((val || '0').replace(/[^0-9]/g, '')) || 0;

              newRows.push({
                  id: crypto.randomUUID(),
                  regional: cols[0]?.trim() || 'Unknown',
                  origin: cols[1]?.trim(),
                  destination: cols[2]?.trim(),
                  weight: parseFloat(cols[3]) || 1,
                  
                  jneRegPrice: parsePrice(cols[4]), jneRegSla: cols[5],
                  jntEzPrice: parsePrice(cols[6]), jntEzSla: cols[7],
                  lionRegPrice: parsePrice(cols[8]), lionRegSla: cols[9],
                  sicepatRegPrice: parsePrice(cols[10]), sicepatRegSla: cols[11],
                  
                  jneJtrPrice: parsePrice(cols[12]), jneJtrSla: cols[13],
                  jntCargoPrice: parsePrice(cols[14]), jntCargoSla: cols[15],
                  lionBigPrice: parsePrice(cols[16]), lionBigSla: cols[17],
                  wahanaCargoPrice: parsePrice(cols[18]), wahanaCargoSla: cols[19]
              });
          }
          
          if(newRows.length > 0) {
              updateData([...newRows, ...data]);
              alert(`Berhasil import ${newRows.length} data kompetitor.`);
          }
          if(fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  // --- AUTOMATIC SEARCH LOGIC ---

  const fetchRealPrices = async (items: CompetitorRow[]) => {
      // We send data to Google Script which acts as a Backend/Proxy to query APIs like Binderbyte/RajaOngkir
      // The Google Script must implement the logic to fetch third-party APIs
      try {
          const response = await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                  action: 'check_competitor_rates',
                  data: items.map(item => ({
                      id: item.id,
                      origin: item.origin,
                      destination: item.destination,
                      weight: item.weight
                  }))
              })
          });

          if (!response.ok) throw new Error("Gagal menghubungi server");

          const result = await response.json();
          if (result.status === 'success' && result.data) {
              return result.data; // Expecting array of { id, jntEzPrice, ... }
          } else {
              throw new Error(result.message || "Format data tidak sesuai");
          }
      } catch (error) {
          console.error(error);
          throw error;
      }
  };

  const handleAutoCheck = async () => {
      // Filter rows that have empty prices
      const emptyRows = data.filter(d => d.jntEzPrice === 0 || d.sicepatRegPrice === 0);
      
      if (emptyRows.length === 0) {
          alert("Semua data sudah terisi harga kompetitor.");
          return;
      }

      const modeText = useRealApi ? "REAL TIME (Via Server)" : "SIMULASI (Demo)";
      const confirm = window.confirm(
          `Sistem akan mencari harga untuk ${emptyRows.length} baris data yang kosong.\n` +
          `Mode: ${modeText}\n\n` +
          (useRealApi ? "Pastikan Google Script Anda sudah dikonfigurasi dengan API Key (Binderbyte/RajaOngkir)." : "") +
          "\nLanjutkan?"
      );
      if(!confirm) return;

      setIsProcessing(true);

      try {
          let updatedRows = [...data];

          if (useRealApi) {
              // REAL FETCH MODE
              // Batched in groups of 10 to avoid timeouts
              const BATCH_SIZE = 10;
              for (let i = 0; i < emptyRows.length; i += BATCH_SIZE) {
                  const batch = emptyRows.slice(i, i + BATCH_SIZE);
                  try {
                      const realResults = await fetchRealPrices(batch);
                      
                      // Merge results
                      updatedRows = updatedRows.map(row => {
                          const match = realResults.find((r: any) => r.id === row.id);
                          return match ? { ...row, ...match } : row;
                      });
                      
                      setData(updatedRows); // Update UI progressively
                  } catch (err) {
                      console.error("Batch error", err);
                      // Continue to next batch
                  }
              }
              alert("Proses pencarian data Real Time selesai.");

          } else {
              // SIMULATION MODE
              await new Promise(resolve => setTimeout(resolve, 1500));
              const simulated = data.map(row => {
                  // Skip if already has data
                  if (row.jntEzPrice > 0) return row;

                  const randomPrice = (base: number) => {
                      if (base === 0) return 20000;
                      const variance = (Math.random() * 0.4) - 0.2; 
                      return Math.round(base * (1 + variance) / 100) * 100;
                  };

                  const slaMap = ["1-2", "2-3", "2-4", "3-5"];
                  const randomSla = () => slaMap[Math.floor(Math.random() * slaMap.length)];

                  return {
                      ...row,
                      jntEzPrice: row.jntEzPrice || randomPrice(row.jneRegPrice),
                      jntEzSla: row.jntEzSla || randomSla(),
                      lionRegPrice: row.lionRegPrice || randomPrice(row.jneRegPrice),
                      lionRegSla: row.lionRegSla || randomSla(),
                      sicepatRegPrice: row.sicepatRegPrice || randomPrice(row.jneRegPrice),
                      sicepatRegSla: row.sicepatRegSla || randomSla(),
                      
                      jntCargoPrice: row.jntCargoPrice || randomPrice(row.jneJtrPrice),
                      jntCargoSla: row.jntCargoSla || "3-7",
                      lionBigPrice: row.lionBigPrice || randomPrice(row.jneJtrPrice),
                      lionBigSla: row.lionBigSla || "3-6",
                      wahanaCargoPrice: row.wahanaCargoPrice || randomPrice(row.jneJtrPrice),
                      wahanaCargoSla: row.wahanaCargoSla || "4-8"
                  };
              });
              updateData(simulated);
              alert("Proses Simulasi selesai.");
          }
      } catch (error) {
          alert("Terjadi kesalahan saat mengambil data.");
      } finally {
          setIsProcessing(false);
      }
  };

  const filteredData = useMemo(() => {
      if(!searchTerm) return data;
      return data.filter(r => 
          r.regional.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.destination.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [data, searchTerm]);

  // --- STATS CALCULATION ---
  const summaryStats = useMemo(() => {
      const regionals = Array.from(new Set(data.map(d => d.regional)));
      
      return regionals.map(reg => {
          const rows = data.filter(d => d.regional === reg);
          
          const calcAvgDiff = (jnePrice: number, compPrice: number) => {
             if(jnePrice === 0 || compPrice === 0) return 0;
             return ((compPrice - jnePrice) / jnePrice) * 100;
          };

          let totalDiffReg = 0;
          let countReg = 0;
          let totalDiffCargo = 0;
          let countCargo = 0;

          rows.forEach(r => {
             if(r.jneRegPrice > 0) {
                if(r.jntEzPrice > 0) { totalDiffReg += calcAvgDiff(r.jneRegPrice, r.jntEzPrice); countReg++; }
                if(r.lionRegPrice > 0) { totalDiffReg += calcAvgDiff(r.jneRegPrice, r.lionRegPrice); countReg++; }
                if(r.sicepatRegPrice > 0) { totalDiffReg += calcAvgDiff(r.jneRegPrice, r.sicepatRegPrice); countReg++; }
             }
             if(r.jneJtrPrice > 0) {
                if(r.jntCargoPrice > 0) { totalDiffCargo += calcAvgDiff(r.jneJtrPrice, r.jntCargoPrice); countCargo++; }
                if(r.lionBigPrice > 0) { totalDiffCargo += calcAvgDiff(r.jneJtrPrice, r.lionBigPrice); countCargo++; }
                if(r.wahanaCargoPrice > 0) { totalDiffCargo += calcAvgDiff(r.jneJtrPrice, r.wahanaCargoPrice); countCargo++; }
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

  const formatPrice = (p: number) => p ? p.toLocaleString('id-ID') : '-';
  
  // Helpers for Percentage Colors
  const getDiffPercent = (jne: number, comp: number) => {
      if (!jne || !comp) return 0;
      return ((comp - jne) / jne) * 100;
  };

  const getPercentColor = (pct: number) => {
      if (pct > 0) return 'text-green-600'; 
      if (pct < 0) return 'text-red-600';   
      return 'text-gray-400';
  };

  const renderPercentBadge = (jne: number, comp: number) => {
      const pct = getDiffPercent(jne, comp);
      if (pct === 0) return null;
      return (
          <span className={`text-[10px] ml-1 font-bold ${getPercentColor(pct)}`}>
              {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
          </span>
      );
  };
  
  const getPriceColor = (jnePrice: number, compPrice: number) => {
      if(!jnePrice || !compPrice) return '';
      if(jnePrice < compPrice) return 'bg-green-100 text-green-900 border-green-200'; 
      if(jnePrice > compPrice) return 'bg-red-100 text-red-900 border-red-200'; 
      return 'bg-yellow-50'; 
  };

  // --- DETAIL VIEW LOGIC (Drill Down) ---
  const renderRegionalDetail = () => {
      const regionalData = data.filter(d => d.regional === selectedRegional);
      
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-4">
                <button 
                    onClick={() => setSelectedRegional(null)} 
                    className="flex items-center text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-1" /> Kembali ke Summary
                </button>
                <h3 className="text-xl font-bold text-gray-800">
                    Detail Regional: <span className="text-blue-600">{selectedRegional}</span>
                </h3>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                  <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold uppercase">
                          <th rowSpan={2} className="p-3 border min-w-[120px]">Origin</th>
                          <th rowSpan={2} className="p-3 border min-w-[120px]">Destination</th>
                          <th colSpan={4} className="p-2 border bg-blue-50 text-blue-900">REGULAR Comparison</th>
                          <th colSpan={4} className="p-2 border bg-orange-50 text-orange-900">CARGO Comparison</th>
                      </tr>
                      <tr className="bg-gray-50 font-semibold text-[10px] uppercase">
                          <th className="p-2 border w-24">JNE REG</th>
                          <th className="p-2 border">J&T EZ</th>
                          <th className="p-2 border">LION</th>
                          <th className="p-2 border">SICEPAT</th>
                          <th className="p-2 border w-24">JNE JTR</th>
                          <th className="p-2 border">JNT CARGO</th>
                          <th className="p-2 border">LION BIG</th>
                          <th className="p-2 border">WAHANA</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {regionalData.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50">
                              <td className="p-3 border text-left font-medium">{row.origin}</td>
                              <td className="p-3 border text-left font-medium">{row.destination}</td>
                              
                              {/* REGULAR */}
                              <td className="p-3 border font-bold text-blue-700 bg-blue-50/30">{formatPrice(row.jneRegPrice)}</td>
                              <td className="p-3 border">
                                  <div className="flex flex-col items-center">
                                    <span>{formatPrice(row.jntEzPrice)}</span>
                                    {renderPercentBadge(row.jneRegPrice, row.jntEzPrice)}
                                  </div>
                              </td>
                              <td className="p-3 border">
                                   <div className="flex flex-col items-center">
                                    <span>{formatPrice(row.lionRegPrice)}</span>
                                    {renderPercentBadge(row.jneRegPrice, row.lionRegPrice)}
                                  </div>
                              </td>
                              <td className="p-3 border">
                                   <div className="flex flex-col items-center">
                                    <span>{formatPrice(row.sicepatRegPrice)}</span>
                                    {renderPercentBadge(row.jneRegPrice, row.sicepatRegPrice)}
                                  </div>
                              </td>

                              {/* CARGO */}
                              <td className="p-3 border font-bold text-blue-900 bg-orange-50/30">{formatPrice(row.jneJtrPrice)}</td>
                              <td className="p-3 border">
                                  <div className="flex flex-col items-center">
                                    <span>{formatPrice(row.jntCargoPrice)}</span>
                                    {renderPercentBadge(row.jneJtrPrice, row.jntCargoPrice)}
                                  </div>
                              </td>
                              <td className="p-3 border">
                                  <div className="flex flex-col items-center">
                                    <span>{formatPrice(row.lionBigPrice)}</span>
                                    {renderPercentBadge(row.jneJtrPrice, row.lionBigPrice)}
                                  </div>
                              </td>
                              <td className="p-3 border">
                                  <div className="flex flex-col items-center">
                                    <span>{formatPrice(row.wahanaCargoPrice)}</span>
                                    {renderPercentBadge(row.jneJtrPrice, row.wahanaCargoPrice)}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
        </div>
      );
  };

  const renderSummary = () => {
      if (selectedRegional) {
          return renderRegionalDetail();
      }

      return (
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Summary Perbandingan Harga Regular per Regional</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={summaryStats} 
                            onClick={(data) => {
                                if(data && data.activeLabel) setSelectedRegional(String(data.activeLabel));
                            }}
                            className="cursor-pointer"
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="regional" />
                            <YAxis label={{ value: '% Selisih (Positif = JNE Lebih Murah)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} cursor={{fill: 'transparent'}} />
                            <Legend />
                            <Bar name="% Selisih Regular (Lebih Murah/Mahal)" dataKey="avgDiffReg" fill="#EE2E24" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">*Klik pada grafik atau tabel untuk melihat detail per kecamatan.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Summary Perbandingan Harga Cargo per Regional</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={summaryStats}
                            onClick={(data) => {
                                if(data && data.activeLabel) setSelectedRegional(String(data.activeLabel));
                            }}
                            className="cursor-pointer"
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="regional" />
                            <YAxis />
                            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} cursor={{fill: 'transparent'}} />
                            <Legend />
                            <Bar name="% Selisih Cargo (Lebih Murah/Mahal)" dataKey="avgDiffCargo" fill="#002F6C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Detail Average per Regional (Klik baris untuk detail)</div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-white border-b">
                      <tr>
                          <th className="p-4">Regional</th>
                          <th className="p-4 text-center">Jml Data</th>
                          <th className="p-4 text-center">Avg Selisih Regular</th>
                          <th className="p-4 text-center">Status Regular</th>
                          <th className="p-4 text-center">Avg Selisih Cargo</th>
                          <th className="p-4 text-center">Status Cargo</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {summaryStats.map(stat => (
                          <tr 
                            key={stat.regional} 
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedRegional(stat.regional)}
                          >
                              <td className="p-4 font-bold">{stat.regional}</td>
                              <td className="p-4 text-center">{stat.count}</td>
                              <td className={`p-4 text-center font-medium ${stat.avgDiffReg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {stat.avgDiffReg > 0 ? '+' : ''}{stat.avgDiffReg.toFixed(2)}%
                              </td>
                              <td className="p-4 text-center">
                                  {stat.avgDiffReg >= 0 ? 
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">JNE Cheaper</span> : 
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">JNE Expensive</span>
                                  }
                              </td>
                              <td className={`p-4 text-center font-medium ${stat.avgDiffCargo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {stat.avgDiffCargo > 0 ? '+' : ''}{stat.avgDiffCargo.toFixed(2)}%
                              </td>
                              <td className="p-4 text-center">
                                  {stat.avgDiffCargo >= 0 ? 
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">JNE Cheaper</span> : 
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">JNE Expensive</span>
                                  }
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
      );
  };

  const renderForm = () => (
      <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <div className="flex gap-2 flex-wrap w-full md:w-auto">
                 <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                 
                 <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                     <Upload className="w-4 h-4 mr-2" /> Upload CSV
                 </button>
                 
                 <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                     <Download className="w-4 h-4 mr-2" /> Template
                 </button>

                 <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>

                 <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setUseRealApi(false)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${!useRealApi ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mode Simulasi
                    </button>
                    <button 
                        onClick={() => setUseRealApi(true)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${useRealApi ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mode Real (Server)
                    </button>
                 </div>

                 <button 
                    onClick={handleAutoCheck} 
                    disabled={isProcessing}
                    className={`flex items-center px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${useRealApi ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    title={useRealApi ? "Cek harga Real-Time via Server" : "Simulasi harga (Demo)"}
                 >
                     {isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : (useRealApi ? <Server className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />)}
                     {useRealApi ? 'Cek Harga Server' : 'Auto-Check Demo'}
                 </button>
                 
                 <button onClick={handleDownloadData} className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">
                     <Download className="w-4 h-4 mr-2" /> Export
                 </button>
             </div>
             
             <div className="relative w-full md:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Cari Kota/Reg..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          
          {useRealApi && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>
                    <strong>Mode Real Time Aktif:</strong> Sistem akan menghubungi Google Apps Script Anda. Pastikan script backend sudah memiliki API Key (seperti Binderbyte/RajaOngkir) untuk mengambil data asli.
                </span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                  <thead>
                      <tr className="bg-gray-200 text-gray-700 font-bold uppercase">
                          <th rowSpan={2} className="p-2 border bg-green-50">Regional</th>
                          <th rowSpan={2} className="p-2 border min-w-[100px] bg-green-50">Origin</th>
                          <th rowSpan={2} className="p-2 border min-w-[100px] bg-green-50">Destination</th>
                          
                          {/* REGULAR GROUP */}
                          <th colSpan={8} className="p-2 border bg-blue-100 text-blue-900 border-b-blue-300">REGULAR</th>
                          
                          {/* CARGO GROUP */}
                          <th colSpan={8} className="p-2 border bg-orange-100 text-orange-900 border-b-orange-300">TRUCKING/CARGO</th>
                      </tr>
                      <tr className="bg-gray-100 font-semibold text-[10px] uppercase">
                          {/* Regular Sub Headers */}
                          <th className="p-1 border bg-blue-600 text-white w-16">JNE (REG)</th>
                          <th className="p-1 border bg-blue-600 text-white w-12">SLA</th>
                          <th className="p-1 border bg-green-600 text-white w-16">J&T (EZ)</th>
                          <th className="p-1 border bg-green-600 text-white w-12">SLA</th>
                          <th className="p-1 border bg-red-600 text-white w-16">LION (PACK)</th>
                          <th className="p-1 border bg-red-600 text-white w-12">SLA</th>
                          <th className="p-1 border bg-orange-500 text-white w-16">SICEPAT</th>
                          <th className="p-1 border bg-orange-500 text-white w-12">SLA</th>

                          {/* Cargo Sub Headers */}
                          <th className="p-1 border bg-blue-800 text-white w-16">JNE (JTR)</th>
                          <th className="p-1 border bg-blue-800 text-white w-12">SLA</th>
                          <th className="p-1 border bg-green-700 text-white w-16">JNT CARGO</th>
                          <th className="p-1 border bg-green-700 text-white w-12">SLA</th>
                          <th className="p-1 border bg-red-700 text-white w-16">LION (BIG)</th>
                          <th className="p-1 border bg-red-700 text-white w-12">SLA</th>
                          <th className="p-1 border bg-gray-500 text-white w-16">WAHANA</th>
                          <th className="p-1 border bg-gray-500 text-white w-12">SLA</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {filteredData.length === 0 ? (
                          <tr><td colSpan={20} className="p-8 text-gray-400 italic">Belum ada data. Silakan Upload CSV atau gunakan Auto-Check.</td></tr>
                      ) : (
                          filteredData.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-2 border font-bold">{row.regional}</td>
                                  <td className="p-2 border">{row.origin}</td>
                                  <td className="p-2 border">{row.destination}</td>
                                  
                                  {/* REGULAR VALUES */}
                                  <td className="p-2 border font-bold text-blue-700">{formatPrice(row.jneRegPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.jneRegSla}</td>
                                  
                                  <td className={`p-2 border ${getPriceColor(row.jneRegPrice, row.jntEzPrice)}`}>{formatPrice(row.jntEzPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.jntEzSla}</td>
                                  
                                  <td className={`p-2 border ${getPriceColor(row.jneRegPrice, row.lionRegPrice)}`}>{formatPrice(row.lionRegPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.lionRegSla}</td>
                                  
                                  <td className={`p-2 border ${getPriceColor(row.jneRegPrice, row.sicepatRegPrice)}`}>{formatPrice(row.sicepatRegPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.sicepatRegSla}</td>

                                  {/* CARGO VALUES */}
                                  <td className="p-2 border font-bold text-blue-900">{formatPrice(row.jneJtrPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.jneJtrSla}</td>

                                  <td className={`p-2 border ${getPriceColor(row.jneJtrPrice, row.jntCargoPrice)}`}>{formatPrice(row.jntCargoPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.jntCargoSla}</td>
                                  
                                  <td className={`p-2 border ${getPriceColor(row.jneJtrPrice, row.lionBigPrice)}`}>{formatPrice(row.lionBigPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.lionBigSla}</td>

                                  <td className={`p-2 border ${getPriceColor(row.jneJtrPrice, row.wahanaCargoPrice)}`}>{formatPrice(row.wahanaCargoPrice)}</td>
                                  <td className="p-2 border text-gray-500">{row.wahanaCargoSla}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="bg-gray-50 min-h-[600px] flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-white rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">
              Kompetitor: <span className="text-blue-600">{subCategory}</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
              {subCategory === 'Summary' 
                ? 'Analisa perbandingan harga JNE vs Kompetitor per Regional' 
                : 'Input dan monitoring detail harga kompetitor'}
          </p>
      </div>

      <div className="p-6 flex-1">
          {subCategory === 'Summary' ? renderSummary() : renderForm()}
      </div>
    </div>
  );
};
