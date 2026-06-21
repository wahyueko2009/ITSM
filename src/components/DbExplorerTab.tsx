/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Database, Play, Table, AlertCircle, CheckCircle2, Search, RefreshCw, Terminal, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface DbExplorerTabProps {
  token: string | null;
}

interface TableOption {
  name: string;
  description: string;
  defaultQuery: string;
}

const TABLES: TableOption[] = [
  {
    name: 'tickets',
    description: 'Tabel utama menyimpan semua laporan insiden / tiket gangguan pelanggan',
    defaultQuery: 'SELECT id, title, priority, status, category, requester, assigned_agent FROM tickets ORDER BY id ASC LIMIT 50;',
  },
  {
    name: 'work_notes',
    description: 'Tabel catatan teknis, komentar internal, dan riwayat pergantian status tiket',
    defaultQuery: 'SELECT id, ticket_id, author, type, text, created_at FROM work_notes ORDER BY id ASC LIMIT 50;',
  },
  {
    name: 'change_requests',
    description: 'Tabel Request for Change (RFC) atau manajemen perubahan infrastruktur',
    defaultQuery: 'SELECT id, title, risk_level, status, requester, created_at FROM change_requests ORDER BY id ASC LIMIT 50;',
  },
  {
    name: 'assets',
    description: 'Database Aset TI / CMDB (Configuration Management Database)',
    defaultQuery: 'SELECT id, name, type, serial_number, status, owner, location FROM assets ORDER BY id ASC LIMIT 50;',
  },
  {
    name: 'kb_articles',
    description: 'Tabel artikel solusi penanganan mandiri (Knowledge Base)',
    defaultQuery: 'SELECT id, title, category, author, views, usefulness_rate FROM kb_articles ORDER BY id ASC LIMIT 50;',
  },
  {
    name: 'sla_policies',
    description: 'Tabel peraturan target waktu respons & resolusi SLA per prioritas',
    defaultQuery: 'SELECT id, category, priority_code, priority_name, target_resolution_hours, effective_year FROM sla_policies ORDER BY effective_year DESC, priority_code ASC;',
  },
  {
    name: 'users',
    description: 'Daftar user berserta hak akses (administrator, agent, user umum) hasil sinkronisasi',
    defaultQuery: 'SELECT id, name, email, role, department FROM users ORDER BY id ASC LIMIT 50;',
  },
];

export default function DbExplorerTab({ token }: DbExplorerTabProps) {
  const [activeTable, setActiveTable] = useState<TableOption>(TABLES[0]);
  const [sqlQuery, setSqlQuery] = useState<string>(activeTable.defaultQuery);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryHeaders, setQueryHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState<number>(0);

  // Run the SQL Query
  const executeQuery = async (queryToRun: string) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryToRun }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengeksekusi query database.');
      }

      setQueryRows(data.rows || []);
      setRowCount(data.rowCount || 0);

      // Extract headers from the keys of the first row if available
      if (data.rows && data.rows.length > 0) {
        setQueryHeaders(Object.keys(data.rows[0]));
      } else {
        setQueryHeaders([]);
      }

      setSuccessMsg(`Berhasil mengeksekusi kueri! Menampilkan ${data.rows?.length || 0} baris data.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Kesalahan sistem saat mengeksekusi SQL.');
      setQueryRows([]);
      setQueryHeaders([]);
      setRowCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Run query on load or table select change
  useEffect(() => {
    setSqlQuery(activeTable.defaultQuery);
    executeQuery(activeTable.defaultQuery);
  }, [activeTable]);

  const handleTableSelect = (tblName: string) => {
    const selected = TABLES.find(t => t.name === tblName);
    if (selected) {
      setActiveTable(selected);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 font-sans">
      {/* Intro info box */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center p-8 pointer-events-none">
          <Database size={220} className="text-slate-100" />
        </div>
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/25 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-black uppercase tracking-wider font-mono">
            <Terminal size={12} /> Live Engine Console
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">Eksplor Database Cloud SQL PostgreSQL</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Platform ITSM ini menggunakan database relasional <strong>Cloud SQL PostgreSQL</strong> yang persisten. 
            Melalui tab ini, Anda dapat memeriksa baris tabel secara real-time untuk memverifikasi proses penyimpanan data (SELECT) langsung ke database utama.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <div className="text-xs bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Core: active-pool Connection
            </div>
            <div className="text-xs bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono text-slate-300">
              <Info size={13} className="text-indigo-400" />
              Keamanan: Read-Only Mode (SELECT) Aktif
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Table size={14} className="text-slate-500" />
              Pilih Tabel Sistem
            </h3>
            <div className="flex flex-col gap-1.5">
              {TABLES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleTableSelect(t.name)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs font-bold transition flex flex-col gap-1 items-start cursor-pointer ${
                    activeTable.name === t.name
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-xs'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50/50'
                  }`}
                >
                  <span className="font-mono text-xs">{t.name === 'users' ? '🛡️ users' : `📁 ${t.name}`}</span>
                  <span className="text-[10px] font-medium text-slate-400 leading-normal line-clamp-2">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Console Workspace */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Console Header */}
            <div className="px-5 py-4 border-b border-rose-50 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-slate-700" />
                <span className="text-xs font-black font-mono uppercase text-slate-700 tracking-wider">
                  Kueri SQL Konsol ({activeTable.name})
                </span>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                PostgreSQL
              </span>
            </div>

            {/* Custom Query Area */}
            <div className="p-5 space-y-4 border-b border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">
                  Input Query SQL (SELECT saja)
                </label>
                <div className="relative font-mono">
                  <textarea
                    rows={3}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full text-xs font-mono p-4 bg-slate-900 text-teal-400 border border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 leading-relaxed"
                    placeholder="Contoh: SELECT * FROM tickets ORDER BY created_at DESC;"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-450 flex items-center gap-1">
                  <Info size={12} className="text-slate-400 shrink-0" />
                  Ganti query di atas untuk memfilter data tertentu, lalu klik tombol jalankan.
                </p>
                <button
                  onClick={() => executeQuery(sqlQuery)}
                  disabled={isLoading || !sqlQuery.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-450 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm shadow-indigo-600/10 shrink-0"
                >
                  {isLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Play size={13} className="fill-current" />
                  )}
                  Jalankan SQL Query
                </button>
              </div>
            </div>

            {/* Status alerts */}
            {error && (
              <div className="mx-5 my-4 bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-rose-800">Eksekusi SQL Gagal</p>
                  <p className="text-xs text-rose-700 leading-normal font-mono">{error}</p>
                </div>
              </div>
            )}

            {successMsg && !error && (
              <div className="mx-5 my-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-emerald-800">Eksekusi SQL Berhasil</p>
                  <p className="text-xs text-emerald-700 leading-normal">{successMsg}</p>
                </div>
              </div>
            )}

            {/* Query Results */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Table size={14} className="text-slate-400" />
                  Hasil Tabel ({rowCount} Baris ditemukan)
                </h4>
                <button
                  type="button"
                  onClick={() => executeQuery(sqlQuery)}
                  disabled={isLoading}
                  className="p-1 px-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded text-[10px] font-bold flex items-center gap-1 transition font-mono uppercase"
                >
                  <RefreshCw size={10} className={`${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {isLoading ? (
                <div className="border border-slate-100 rounded-xl p-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">Menghubungi database PostgreSQL...</p>
                </div>
              ) : queryRows.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <Table size={18} className="text-slate-400" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-750">Tidak ada baris data</h5>
                  <p className="text-[11px] text-slate-450 max-w-xs mx-auto leading-normal">
                    Kueri dieksekusi dengan sukses tetapi tabel kosong atau tidak ada hasil baris yang cocok dengan kueri filter Anda.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
                    <table className="w-full text-left border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 select-none">
                          {queryHeaders.map((header) => (
                            <th 
                              key={header} 
                              className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider font-mono border-r border-slate-200/60 last:border-0"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        {queryRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            {queryHeaders.map((header) => {
                              const value = row[header];
                              let displayValue = '';
                              if (value === null || value === undefined) {
                                displayValue = 'NULL';
                              } else if (typeof value === 'object') {
                                displayValue = JSON.stringify(value);
                              } else {
                                displayValue = String(value);
                              }

                              const isNull = value === null || value === undefined;

                              return (
                                <td 
                                  key={header} 
                                  className="px-4 py-2 text-xs font-mono border-r border-slate-100 last:border-0 max-w-xs truncate"
                                >
                                  {isNull ? (
                                    <span className="text-slate-400 font-bold italic">null</span>
                                  ) : (
                                    displayValue
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
