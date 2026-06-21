/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { SlaPolicy, UserSession } from '../types';
import { 
  Calendar, Lock, Unlock, Edit, Check, X, AlertTriangle, RefreshCw, FileText
} from 'lucide-react';

interface SlaMasterTabProps {
  slaPolicies: SlaPolicy[];
  onAddSlaPolicy: (policy: SlaPolicy) => void;
  onUpdateSlaPolicy: (policy: SlaPolicy) => void;
  onDeleteSlaPolicy: (id: string) => void;
  onResetSlaPolicies: () => void;
  onClearAllTicketsAndChanges?: () => void;
  session: UserSession;
}

export default function SlaMasterTab({
  slaPolicies,
  onAddSlaPolicy,
  onUpdateSlaPolicy,
  onDeleteSlaPolicy,
  onResetSlaPolicies,
  onClearAllTicketsAndChanges,
  session
}: SlaMasterTabProps) {
  const currentYearVal = new Date().getFullYear();
  const isAdmin = session?.role === 'admin' || session?.name === 'Admin Support';

  // State to filter the active Year for the SLA configuration
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Inline editing state for a specific row ID
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Form states during inline edit
  const [editDescription, setEditDescription] = useState<string>('');
  const [editResponseVal, setEditResponseVal] = useState<number>(15);
  const [editResponseUnit, setEditResponseUnit] = useState<'Menit' | 'Jam'>('Menit');
  const [editSlaResponsePercent, setEditSlaResponsePercent] = useState<number>(99);
  const [editResolutionVal, setEditResolutionVal] = useState<number>(4);
  const [editResolutionUnit, setEditResolutionUnit] = useState<'Jam' | 'Hari Kerja'>('Jam');
  const [editSlaResolutionPercent, setEditSlaResolutionPercent] = useState<number>(95);

  // Filter the rules so we ONLY show the 4 standardized levels for the chosen Year
  const yearPolicies = slaPolicies
    .filter(p => p.effectiveYear === selectedYear)
    .sort((a, b) => a.priorityCode.localeCompare(b.priorityCode));

  // Default values mapping based on the image provided
  const SLA_DEFAULTS: Record<string, { desc: string; respVal: number; respUnit: 'Menit' | 'Jam'; respSla: number; resVal: number; resUnit: 'Jam' | 'Hari Kerja'; resSla: number }> = {
    P1: {
      desc: 'Insiden kritis yang mengganggu operasional bisnis utama, sistem ERP tidak dapat digunakan, atau transaksi utama tidak dapat diproses termasuk pada pemenuhan kewajiban regulasi, proses audit, dan tutup buku (financial closing)',
      respVal: 15,
      respUnit: 'Menit',
      respSla: 99,
      resVal: 4,
      resUnit: 'Jam',
      resSla: 95
    },
    P2: {
      desc: 'Insiden yang berdampak pada fungsi utama aplikasi sehingga proses bisnis tidak berjalan optimal, namun sistem masih dapat diakses dan terdapat proses alternatif',
      respVal: 30,
      respUnit: 'Menit',
      respSla: 99,
      resVal: 8,
      resUnit: 'Jam',
      resSla: 95
    },
    P3: {
      desc: 'Insiden yang tidak berdampak langsung pada operasional utama. Sistem tetap berjalan namun terdapat gangguan pada beberapa fungsi atau laporan',
      respVal: 60,
      respUnit: 'Menit',
      respSla: 99,
      resVal: 3,
      resUnit: 'Hari Kerja',
      resSla: 95
    },
    P4: {
      desc: 'Permintaan informasi, bantuan penggunaan, konfigurasi minor, atau gangguan yang tidak mempengaruhi proses operasional.',
      respVal: 60,
      respUnit: 'Menit',
      respSla: 99, // default
      resVal: 5,
      resUnit: 'Hari Kerja',
      resSla: 95  // default
    }
  };

  // Human Readable Priority Names
  const PRIORITY_NAMES: Record<string, string> = {
    P1: 'Critical / Urgent',
    P2: 'Tinggi / High',
    P3: 'Sedang / Medium',
    P4: 'Rendah / Low'
  };

  // Helper to convert units to stored hours values
  const convertToHours = (val: number, unit: 'Menit' | 'Jam' | 'Hari Kerja'): number => {
    if (unit === 'Menit') return val / 60;
    if (unit === 'Hari Kerja') return val * 24;
    return val;
  };

  // Initialize SLA for the selected year if not present
  const handleInitializeYear = () => {
    if (!isAdmin) {
      alert('Izin Ditolak: Hanya Sys Admin yang dapat menentukan aturan SLA.');
      return;
    }

    // Add exactly P1, P2, P3, P4
    Object.keys(SLA_DEFAULTS).forEach(code => {
      const def = SLA_DEFAULTS[code];
      const respHours = convertToHours(def.respVal, def.respUnit);
      const resHours = convertToHours(def.resVal, def.resUnit);

      const newPolicy: SlaPolicy = {
        id: `SLA-${selectedYear}-${code}`,
        category: 'Umum',
        priorityCode: code,
        priorityName: PRIORITY_NAMES[code],
        targetResponseHours: respHours,
        targetResolutionHours: resHours,
        slaResponsePercent: def.respSla,
        slaResolutionPercent: def.resSla,
        effectiveYear: selectedYear,
        description: def.desc
      };
      onAddSlaPolicy(newPolicy);
    });

    alert(`Aturan SLA untuk Tahun ${selectedYear} sukses diinisialisasi dengan 4 prioritas dasar.`);
  };

  // Enable inline editing for a row
  const startEditing = (p: SlaPolicy) => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Sys Admin yang diperbolehkan mengubah target atau penjelasan SLA!');
      return;
    }

    setEditingRowId(p.id);
    setEditDescription(p.description || '');
    setEditSlaResponsePercent(p.slaResponsePercent !== undefined ? p.slaResponsePercent : 99);
    setEditSlaResolutionPercent(p.slaResolutionPercent !== undefined ? p.slaResolutionPercent : 95);

    // Resolve Target Response hours to display value & unit
    const hoursResponse = p.targetResponseHours || 1;
    if (hoursResponse < 1) {
      setEditResponseVal(Math.round(hoursResponse * 60));
      setEditResponseUnit('Menit');
    } else {
      setEditResponseVal(hoursResponse);
      setEditResponseUnit('Jam');
    }

    // Resolve Target Resolution hours to display value & unit
    const hoursResolution = p.targetResolutionHours;
    if (hoursResolution >= 24) {
      setEditResolutionVal(Math.round(hoursResolution / 24));
      setEditResolutionUnit('Hari Kerja');
    } else {
      setEditResolutionVal(hoursResolution);
      setEditResolutionUnit('Jam');
    }
  };

  // Save changes
  const saveRowChange = (p: SlaPolicy) => {
    if (!editDescription.trim()) {
      alert('Penjelasan maksud prioritas wajib diisi!');
      return;
    }

    const calculatedResponseHours = convertToHours(editResponseVal, editResponseUnit);
    const calculatedResolutionHours = convertToHours(editResolutionVal, editResolutionUnit);

    const updated: SlaPolicy = {
      ...p,
      description: editDescription.trim(),
      targetResponseHours: calculatedResponseHours,
      targetResolutionHours: calculatedResolutionHours,
      slaResponsePercent: Number(editSlaResponsePercent),
      slaResolutionPercent: Number(editSlaResolutionPercent)
    };

    onUpdateSlaPolicy(updated);
    setEditingRowId(null);
    alert(`Berhasil memperbarui data SLA untuk prioritias ${p.priorityCode}!`);
  };

  // Format response hours nicely for display
  const formatResponseDisplay = (hours?: number): string => {
    if (hours === undefined) return '-';
    if (hours < 1) {
      return `≤ ${Math.round(hours * 60)} Menit`;
    }
    return `≤ ${hours} Jam`;
  };

  // Format resolution hours nicely for display
  const formatResolutionDisplay = (hours: number): string => {
    if (hours >= 24) {
      return `${Math.round(hours / 24)} Hari Kerja`;
    }
    return `${hours} Jam`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="sla-simple-master-dashboard">

      {/* Main Unified Board Card */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-xs p-6 space-y-6 text-left">
        
        {/* Year Filter and Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">
              Pilih Tahun Berlaku SLA
            </label>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-450" />
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setEditingRowId(null);
                }}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-black text-indigo-700 px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end">
            {isAdmin && (
              <button
                onClick={() => {
                  if (window.confirm('Pulihkan preset awal untuk tahun ini? Seluruh perubahan kustom akan dikesampingkan.')) {
                    onResetSlaPolicies();
                    setEditingRowId(null);
                  }
                }}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Beri data default untuk seluruh tahun"
              >
                <RefreshCw size={12} className="text-slate-500" />
                <span>Reset Preset Global</span>
              </button>
            )}
          </div>
        </div>

        {/* The 4-rows Unified Table */}
        {yearPolicies.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-3xs bg-white">
            <table className="w-full text-xs text-left" id="sla-inline-table">
              
              {/* Header */}
              <thead className="bg-slate-900 text-slate-100 font-mono uppercase text-[10.5px] tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3.5 px-3 font-bold text-center w-16">Kode</th>
                  <th className="py-3.5 px-4 font-bold w-[40%]">Maksud & Penjelasan Dampak (*Penjelasan Prioritas)</th>
                  <th className="py-3.5 px-4 font-bold text-center w-36">Target Response Time *)</th>
                  <th className="py-3.5 px-4 font-bold text-center w-36">SLA Response Time **)</th>
                  <th className="py-3.5 px-4 font-bold text-center w-36">Target Resolution Time ***)</th>
                  <th className="py-3.5 px-4 font-bold text-center w-36">SLA Resolution Time ****)</th>
                  <th className="py-3.5 px-4 font-bold text-center w-28">Hak Edit / Aksi</th>
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-slate-100">
                {yearPolicies.map((p, index) => {
                  const isEditing = editingRowId === p.id;
                  
                  // Color highlights for the codes
                  let priorityBadgeStyle = 'text-slate-600 bg-slate-50 border-slate-100';
                  if (p.priorityCode === 'P1') priorityBadgeStyle = 'text-rose-700 bg-rose-50 border-rose-100';
                  else if (p.priorityCode === 'P2') priorityBadgeStyle = 'text-amber-700 bg-amber-50 border-amber-100';
                  else if (p.priorityCode === 'P3') priorityBadgeStyle = 'text-indigo-700 bg-indigo-50 border-indigo-100';

                  const currentSlaResponse = p.slaResponsePercent !== undefined ? p.slaResponsePercent : 99;
                  const currentSlaResolution = p.slaResolutionPercent !== undefined ? p.slaResolutionPercent : 95;

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors duration-150 ${index % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'} ${
                        isEditing ? 'bg-amber-50/50 hover:bg-amber-50/50 border-y-2 border-amber-300' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Code badge */}
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono leading-none border font-black ${priorityBadgeStyle}`}>
                          {p.priorityCode}
                        </span>
                      </td>

                      {/* Description / Explanation edit field or read-only view */}
                      <td className="py-4 px-4 font-medium text-slate-700 leading-relaxed">
                        {isEditing ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-indigo-700 block uppercase tracking-wide">
                              Penjelasan Prioritas {p.priorityCode}:
                            </span>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={3}
                              className="w-full bg-white border border-amber-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold leading-relaxed leading-[1.3] shadow-inner"
                              placeholder="Tulis penjelasan lengkap dampak insiden kode ini..."
                              required
                            />
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                              <span>{p.priorityName || PRIORITY_NAMES[p.priorityCode]}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed leading-[1.35] max-w-xl">
                              {p.description || 'Tidak ada detail penjelasan.'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Target Response value edit field or read-only display */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex flex-col gap-1 items-center bg-white p-1.5 rounded-lg border border-amber-300 shadow-sm">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Maksimum</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="1440"
                                value={editResponseVal}
                                onChange={(e) => setEditResponseVal(Number(e.target.value))}
                                className="w-12 bg-slate-50 border border-slate-200 px-1 py-0.5 text-center font-bold rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <select
                                value={editResponseUnit}
                                onChange={(e) => setEditResponseUnit(e.target.value as 'Menit' | 'Jam')}
                                className="bg-slate-50 border border-slate-200 text-[10px] p-0.5 rounded focus:outline-none"
                              >
                                <option value="Menit">menit</option>
                                <option value="Jam">jam</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-indigo-55 text-indigo-750 font-black font-mono text-[11px] rounded-md border border-indigo-120/35">
                            {formatResponseDisplay(p.targetResponseHours)}
                          </span>
                        )}
                      </td>

                      {/* SLA Response Time Compliance % (e.g. >= 99%) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex flex-col gap-1 items-center bg-white p-1.5 rounded-lg border border-amber-300 shadow-sm">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Kepatuhan (%)</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-450 font-semibold">≥</span>
                              <input
                                type="number"
                                min="10"
                                max="100"
                                value={editSlaResponsePercent}
                                onChange={(e) => setEditSlaResponsePercent(Number(e.target.value))}
                                className="w-12 bg-slate-50 border border-slate-200 px-1 py-0.5 text-center font-bold rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-slate-500 font-bold">%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-700 font-black font-mono text-[11px] rounded-md border border-rose-100/40">
                            {`≥ ${currentSlaResponse}%`}
                          </span>
                        )}
                      </td>

                      {/* Target Resolution value edit field or read-only display */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex flex-col gap-1 items-center bg-white p-1.5 rounded-lg border border-amber-300 shadow-sm">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Durasi</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="1440"
                                value={editResolutionVal}
                                onChange={(e) => setEditResolutionVal(Number(e.target.value))}
                                className="w-12 bg-slate-50 border border-slate-200 px-1 py-0.5 text-center font-bold rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <select
                                value={editResolutionUnit}
                                onChange={(e) => setEditResolutionUnit(e.target.value as 'Jam' | 'Hari Kerja')}
                                className="bg-slate-50 border border-slate-200 text-[10px] p-0.5 rounded focus:outline-none"
                              >
                                <option value="Jam">jam</option>
                                <option value="Hari Kerja">Hari Kerja</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-black font-mono text-[11px] rounded-md border border-slate-200/50">
                            {formatResolutionDisplay(p.targetResolutionHours)}
                          </span>
                        )}
                      </td>

                      {/* SLA Resolution Time Compliance % (e.g. >= 95%) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex flex-col gap-1 items-center bg-white p-1.5 rounded-lg border border-amber-300 shadow-sm">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Kepatuhan (%)</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-450 font-semibold">≥</span>
                              <input
                                type="number"
                                min="10"
                                max="100"
                                value={editSlaResolutionPercent}
                                onChange={(e) => setEditSlaResolutionPercent(Number(e.target.value))}
                                className="w-12 bg-slate-50 border border-slate-200 px-1 py-0.5 text-center font-bold rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-slate-500 font-bold">%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black font-mono text-[11px] rounded-md border border-emerald-100/40">
                            {`≥ ${currentSlaResolution}%`}
                          </span>
                        )}
                      </td>

                      {/* Controls and locks */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveRowChange(p)}
                                className="p-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] flex items-center gap-0.5 shadow-3xs cursor-pointer transition"
                                title="Simpan data"
                              >
                                <Check size={11} strokeWidth={3} />
                                <span>Simpan</span>
                              </button>
                              <button
                                onClick={() => setEditingRowId(null)}
                                className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px] flex items-center gap-0.5 border border-slate-250 cursor-pointer transition"
                                title="Batal ubah"
                              >
                                <X size={11} strokeWidth={3} />
                                <span>Batal</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {isAdmin ? (
                                <button
                                  onClick={() => startEditing(p)}
                                  className="p-1 px-2.5 text-indigo-700 hover:text-indigo-805 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer transition"
                                  title="Ubah data baris ini"
                                >
                                  <Edit size={11} className="text-indigo-650" />
                                  <span>Ubah</span>
                                </button>
                              ) : (
                                <span className="p-1 px-2 bg-slate-50 border border-slate-200/40 text-slate-400 rounded text-[9.5px] font-bold flex items-center gap-1 select-none">
                                  <Lock size={10} className="text-slate-400" />
                                  <span>Terkunci</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty or Uninitialized state for selected year */
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1.5 px-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">
                SLA Tahun {selectedYear} Belum Didaftarkan
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Tabel untuk Tahun <strong>{selectedYear}</strong> belum diisi. 
                Demi kemudahan pengerjaan, Anda dapat langsung menginisialisasi **tepat 4 baris aturan prioritas standar** {selectedYear} (P1, P2, P3, P4) berdasarkan template acuan industri dengan tombol instan di bawah ini.
              </p>
            </div>

            {isAdmin ? (
              <button
                onClick={handleInitializeYear}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <FileText size={13} />
                <span>Inisialisasi 4 Aturan SLA Tahun {selectedYear}</span>
              </button>
            ) : (
              <div className="p-2.5 bg-slate-50 text-[10px] text-slate-450 border border-slate-200/50 rounded-lg inline-block font-semibold">
                Sila hubungi <strong>Sys Admin/Administrator</strong> untuk menginisialisasi parameter dasar SLA {selectedYear}.
              </div>
            )}
          </div>
        )}



      </div>

    </div>
  );
}
