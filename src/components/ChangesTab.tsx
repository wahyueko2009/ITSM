/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ChangeRequest, ChangeRisk, ChangeClassification, ChangeStatus, CabMember, UserSession } from '../types';
import { 
  GitBranch, Plus, Search, Filter, ShieldAlert, CheckCircle2, 
  XOctagon, FileText, Calendar, User, AlignLeft, ChevronRight,
  Users, Check, X, ThumbsUp, ThumbsDown, MessageSquare, Clock, AlertCircle, Edit, Trash, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChangesTabProps {
  changes: ChangeRequest[];
  onAddChange: (change: ChangeRequest) => void;
  onUpdateChange: (change: ChangeRequest) => void;
  cabMembers?: CabMember[];
  onAddCabMember?: (name: string, role: string, email: string) => Promise<any>;
  onUpdateCabMember?: (id: number, fields: any) => Promise<any>;
  onDeleteCabMember?: (id: number) => Promise<any>;
  session?: UserSession;
}

export default function ChangesTab({ 
  changes, 
  onAddChange, 
  onUpdateChange,
  cabMembers = [],
  onAddCabMember,
  onUpdateCabMember,
  onDeleteCabMember,
  session
}: ChangesTabProps) {
  const getActiveCabListForChange = (change: ChangeRequest | null, currentGlobalCab: CabMember[]) => {
    const defaultFallbackMembers = [
      { name: 'Hendrik Pratama', role: 'IT Director' },
      { name: 'Wahyudi Eko', role: 'Infra Manager' },
      { name: 'Rudi Hermawan', role: 'Security Officer' },
      { name: 'Budi Santoso', role: 'Ops Lead' }
    ];

    if (!change) {
      return currentGlobalCab.length > 0
        ? currentGlobalCab.filter(m => m.active === 'Aktif')
        : defaultFallbackMembers;
    }

    try {
      if (change.cabVotes) {
        const parsed = JSON.parse(change.cabVotes);
        if (parsed && parsed._cabMembersSnapshot && Array.isArray(parsed._cabMembersSnapshot) && parsed._cabMembersSnapshot.length > 0) {
          return parsed._cabMembersSnapshot;
        }
      }
    } catch (e) {
      console.error("Error parsing CAB snapshot:", e);
    }

    return currentGlobalCab.length > 0
      ? currentGlobalCab.filter(m => m.active === 'Aktif')
      : defaultFallbackMembers;
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(changes[0] || null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // CAB-specific States
  const [cabMeetingInput, setCabMeetingInput] = useState('');
  const [cabNotesInput, setCabNotesInput] = useState('');
  const [cabFeedback, setCabFeedback] = useState('');

  const triggerFeedback = (message: string) => {
    setCabFeedback(message);
    setTimeout(() => {
      setCabFeedback('');
    }, 3000);
  };



  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formRisk, setFormRisk] = useState<ChangeRisk>('Sedang');
  const [formClass, setFormClass] = useState<ChangeClassification>('Normal');
  const [formImpact, setFormImpact] = useState('');
  const [formImplPlan, setFormImplPlan] = useState('');
  const [formRollbackPlan, setFormRollbackPlan] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formExcelFile, setFormExcelFile] = useState('');
  const [formExcelFileName, setFormExcelFileName] = useState('');

  // Handle Filtering
  const filteredChanges = changes.filter(c => {
    const matchesSearch = 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.requester.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = riskFilter === 'all' || c.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  // Create Change RFC
  const handleSubmitRFC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim() || !formReason.trim() || !formTargetDate) {
      alert('Sila isi syarat wajib (Judul, Penjelasan, Alasan, dan Tanggal Target)');
      return;
    }

    const nextIdNum = changes.length + 1;
    const newId = `RFC-2026-${String(nextIdNum).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newChange: ChangeRequest = {
      id: newId,
      title: formTitle,
      description: formDesc,
      reason: formReason,
      riskLevel: formRisk,
      impact: formImpact || 'Dampak minimal pada sistem produksi terisolasi.',
      implementationPlan: formImplPlan || '1. Backup snapshot database.\n2. Apply patch.\n3. Verify logs.',
      rollbackPlan: formRollbackPlan || 'Restore database dari snapshot backup terakhi.',
      classification: formClass,
      status: 'Menunggu Persetujuan',
      requester: session?.name || 'Budi Santoso', // Use current session name or default Budi
      createdAt: now,
      targetDate: formTargetDate,
      excelFile: formExcelFile || undefined,
      excelFileName: formExcelFileName || undefined,
    };

    onAddChange(newChange);
    setShowAddModal(false);
    setSelectedChange(newChange);

    // Reset Form
    setFormTitle('');
    setFormDesc('');
    setFormReason('');
    setFormRisk('Sedang');
    setFormClass('Normal');
    setFormImpact('');
    setFormImplPlan('');
    setFormRollbackPlan('');
    setFormTargetDate('');
    setFormExcelFile('');
    setFormExcelFileName('');
  };

  // Approval Process CAB Board
  const handleApproveReject = (approved: boolean) => {
    if (!selectedChange) return;

    const updatedChange = { ...selectedChange };
    const now = new Date().toISOString();

    if (approved) {
      updatedChange.status = 'Disetujui' as ChangeStatus;
      updatedChange.approver = 'Hendrik Pratama (IT Director)';
      updatedChange.approvalDate = now;
    } else {
      updatedChange.status = 'Ditolak' as ChangeStatus;
      updatedChange.approver = 'Hendrik Pratama (IT Director)';
      updatedChange.approvalDate = now;
    }

    onUpdateChange(updatedChange);
    setSelectedChange(updatedChange);
  };

  const handleUpdateStatus = (newSt: ChangeStatus) => {
    if (!selectedChange) return;
    const updatedChange = { ...selectedChange, status: newSt };
    onUpdateChange(updatedChange);
    setSelectedChange(updatedChange);
  };

  const handleUpdateCabinetFields = (fieldsToUpdate: Partial<ChangeRequest>) => {
    if (!selectedChange) return;
    const updatedChange = { ...selectedChange, ...fieldsToUpdate };
    onUpdateChange(updatedChange);
    setSelectedChange(updatedChange);
  };

  // Sync inputs when selectedChange updates and auto-snapshot CAB members
  useEffect(() => {
    if (selectedChange) {
      setCabMeetingInput(selectedChange.cabMeetingDate || '');
      setCabNotesInput(selectedChange.cabNotes || '');

      // Auto snapshot CAB members if missing for active/closed change requests
      if (selectedChange.status !== 'Draft') {
        let parsedVotes: any = {};
        try {
          parsedVotes = selectedChange.cabVotes ? JSON.parse(selectedChange.cabVotes) : {};
        } catch (e) {
          parsedVotes = {};
        }

        if (!parsedVotes._cabMembersSnapshot) {
          const defaultFallbackMembers = [
            { name: 'Hendrik Pratama', role: 'IT Director' },
            { name: 'Wahyudi Eko', role: 'Infra Manager' },
            { name: 'Rudi Hermawan', role: 'Security Officer' },
            { name: 'Budi Santoso', role: 'Ops Lead' }
          ];
          const activeGlobal = cabMembers.length > 0
            ? cabMembers.filter(m => m.active === 'Aktif').map(m => ({ name: m.name, role: m.role, email: m.email || '', active: m.active }))
            : defaultFallbackMembers;

          const updatedVotes = {
            ...parsedVotes,
            _cabMembersSnapshot: activeGlobal
          };

          // Update dynamically
          handleUpdateCabinetFields({
            cabVotes: JSON.stringify(updatedVotes)
          });
        }
      }
    }
  }, [selectedChange?.id]);

  return (
    <div className="space-y-6" id="changes-tab-interface">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari RFC Berdasarkan ID, judul perubahan, pengusul..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Risk select */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 text-xs font-semibold text-slate-600">
            <span>Risiko:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1.5 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>

          {/* Status select */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 text-xs font-semibold text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1.5 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Draft">Draft</option>
              <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Sedang Diimplementasi">Sedang Diimplementasi</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Ajukan RFC
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RFC List (Left Side) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-1">
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 font-bold text-xs text-slate-700">
            Dokumen Permintaan Perubahan ({filteredChanges.length})
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
            {filteredChanges.map((c) => {
              const date = new Date(c.createdAt).toLocaleDateString('id-ID');
              const isSelected = selectedChange?.id === c.id;

              const statusColor = 
                c.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' :
                c.status === 'Menunggu Persetujuan' ? 'bg-amber-50 text-amber-700 animate-pulse' :
                c.status === 'Disetujui' ? 'bg-indigo-50 text-indigo-700' :
                c.status === 'Ditolak' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700';

              const riskBadgeColor =
                c.riskLevel === 'Tinggi' ? 'text-red-600 font-bold' :
                c.riskLevel === 'Sedang' ? 'text-amber-600 font-semibold' : 'text-slate-500';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedChange(c)}
                  onDoubleClick={() => {
                    setSelectedChange(c);
                    setIsDetailModalOpen(true);
                  }}
                  className={`p-4 hover:bg-slate-50/50 transition cursor-pointer space-y-1 group relative ${
                    isSelected ? 'bg-indigo-50/40 border-l-4 border-indigo-600' : ''
                  }`}
                  title="Klik ganda (Double click) untuk membuka popup detail penuh"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="font-extrabold">{c.id}</span>
                    <span className="flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                      <span className="hidden group-hover:inline text-[9px] font-bold mr-1">🔍 Klik 2x</span>
                      {date}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {c.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500">Risiko: <span className={riskBadgeColor}>{c.riskLevel}</span></span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${statusColor}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredChanges.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Dokumen RFC tidak ditemukan.
              </div>
            )}
          </div>
        </div>

        {/* RFC Detailed Viewer & CAB Board Action Panel */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
          {selectedChange ? (
            <div className="divide-y divide-slate-100">
              
              {/* Header */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedChange.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Klasifikasi: <b>{selectedChange.classification}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(true)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold font-mono text-[10px] rounded-lg border border-indigo-100/50 flex items-center gap-1 transition cursor-pointer"
                      title="Buka detail RFC di popup yang lebih lebar"
                    >
                      <span>🔍 Perbesar (Popup)</span>
                    </button>
                    <span className="text-xs text-slate-500 font-medium font-bold">Diajukan: {new Date(selectedChange.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {selectedChange.title}
                </h2>

                <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1">
                    <User size={14} className="text-slate-400" />
                    Pengusul: <b className="text-slate-800">{selectedChange.requester}</b>
                  </span>
                  <span>•</span>
                  <span>Tanggal Eksekusi Target: <b className="text-slate-800">{new Date(selectedChange.targetDate).toLocaleDateString('id-ID')}</b></span>
                </div>
              </div>

              {/* Plans section */}
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">1. Alasan / Justifikasi Perubahan</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {selectedChange.reason}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">2. Penjelasan Detail Implementasi</h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedChange.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-emerald-50/20 border border-emerald-100/40 p-3.5 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Rencana Langkah Penerapan (Implementation Plan)
                    </h5>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                      {selectedChange.implementationPlan}
                    </p>
                  </div>

                  <div className="bg-rose-50/20 border border-rose-100/40 p-3.5 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1">
                      <XOctagon size={14} />
                      Rencana Cadangan Pembatalan (Rollback Plan)
                    </h5>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                      {selectedChange.rollbackPlan}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Evaluasi Risiko</h4>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded border border-slate-100">
                      <ShieldAlert size={16} className={selectedChange.riskLevel === 'Tinggi' ? 'text-red-500' : 'text-amber-500'} />
                      <span className="text-xs font-bold text-slate-700">Tingkat Risiko: <span className={selectedChange.riskLevel === 'Tinggi' ? 'text-red-600' : 'text-slate-800'}>{selectedChange.riskLevel}</span></span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Analisis Dampak Sistem</h4>
                    <p className="text-xs text-slate-600">{selectedChange.impact}</p>
                  </div>
                </div>
              </div>

              {/* CAB Review / CAB Advisory Board Workspace */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6">
                
                {/* Section Title Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="text-indigo-600" size={20} />
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-slate-900 leading-none">Dewan Komite CAB (Change Advisory Board)</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Gunakan panel ini untuk menjadwalkan rapat, mencatat suara risalah, dan mensahkan persetujuan perubahan.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-100 font-mono">
                      ITIL Compliance
                    </span>
                  </div>
                </div>

                {/* Rich Transient Toast Notification */}
                {cabFeedback && (
                  <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 shadow-xs transition-all animate-none">
                    <Check size={14} />
                    <span>{cabFeedback}</span>
                  </div>
                )}

                {/* 1. CAB Meeting Scheduling & Agenda */}
                {session?.role === 'admin' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                    <div className="md:col-span-2 text-left space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        Jadwal Rapat Peninjauan CAB
                      </label>
                      <input
                        type="datetime-local"
                        value={cabMeetingInput}
                        onChange={(e) => setCabMeetingInput(e.target.value)}
                        className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-indigo-500 rounded p-1.5 text-xs font-semibold text-slate-700"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateCabinetFields({
                            cabMeetingDate: cabMeetingInput
                          });
                          triggerFeedback('Jadwal rapat dewan CAB berhasil disimpan!');
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded text-xs font-bold font-mono transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus size={14} />
                        Simpan Jadwal CAB
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider">
                        Jadwal Peninjauan CAB
                      </span>
                      <p className="text-xs font-bold text-slate-700">
                        {cabMeetingInput ? `🗓️ ${new Date(cabMeetingInput).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB` : '⏱️ Belum dijadwalkan oleh Administrator'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold italic">
                      🔒 Hanya Admin yang dapat menjadwalkan
                    </span>
                  </div>
                )}

                {/* 2. Interactive CAB Members Voting Panel */}
                <div className="space-y-3 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-indigo-500" />
                      Status Persetujuan / Voting Anggota CAB
                    </h4>
                    <span className="text-[9px] bg-slate-105 text-slate-500 px-2 py-0.5 rounded-md font-bold italic">
                      ⚠️ Hanya pemilik hak suara masing-masing yang dapat memilih.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const activeCabList = getActiveCabListForChange(selectedChange, cabMembers);

                      const parsedVotes = (() => {
                        try {
                          return selectedChange.cabVotes ? JSON.parse(selectedChange.cabVotes) : {};
                        } catch (e) {
                          return {};
                        }
                      })();

                      return activeCabList.map((member) => {
                        const currentVote = parsedVotes[member.name] || 'Belum Memilih';
                        
                        let voteBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
                        let voteIcon = <Clock size={11} />;
                        
                        if (currentVote === 'Setuju') {
                          voteBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                          voteIcon = <ThumbsUp size={11} />;
                        } else if (currentVote === 'Tolak') {
                          voteBadgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                          voteIcon = <ThumbsDown size={11} />;
                        } else if (currentVote === 'Abstain') {
                          voteBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                          voteIcon = <AlertCircle size={11} />;
                        }

                        // Determine if logged-in user can vote for this specific member card
                        const isCurrentUser = !!(session?.name && (
                          session.name.toLowerCase().trim() === member.name.toLowerCase().trim() ||
                          session.name.toLowerCase().includes(member.name.toLowerCase()) ||
                          member.name.toLowerCase().includes(session.name.toLowerCase())
                        ));

                        return (
                          <div key={member.name} className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-2 relative transition ${
                            isCurrentUser 
                              ? 'bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/10' 
                              : 'bg-white border-slate-100'
                          }`}>
                            {isCurrentUser && (
                              <span className="absolute -top-2 -right-1 text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full scale-90 uppercase animate-pulse">
                                Hak Anda
                              </span>
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-800 leading-none truncate">{member.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-none">{member.role}</p>
                            </div>

                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 justify-center ${voteBadgeClass}`}>
                              {voteIcon}
                              <span>{currentVote}</span>
                            </div>

                            {/* Dropdown to cast vote */}
                            <div className="pt-1">
                              {isCurrentUser ? (
                                ['Disetujui', 'Ditolak', 'Sedang Diimplementasi', 'Selesai', 'Batal'].includes(selectedChange.status) ? (
                                  <div className="text-[9px] text-amber-600 font-extrabold p-1 text-center bg-amber-50 rounded border border-amber-100 select-none uppercase tracking-wider font-mono">
                                    🔒 Terkunci ({selectedChange.status})
                                  </div>
                                ) : (
                                  <select
                                    value={currentVote}
                                    onChange={(e) => {
                                      const nextVoteValue = e.target.value;
                                      const nextVotes = { 
                                        ...parsedVotes, 
                                        [member.name]: nextVoteValue,
                                        _cabMembersSnapshot: activeCabList
                                      };
                                      const newVotesJson = JSON.stringify(nextVotes);

                                      // Auto evaluate consensus rule (Requirement 3)
                                      const activeCabNames = activeCabList.map(m => m.name);
                                      const votesOfActive = activeCabNames.map(name => nextVotes[name] || 'Belum Memilih');

                                      const hasTolak = votesOfActive.some(v => v === 'Tolak');
                                      const allApproved = votesOfActive.length > 0 && votesOfActive.every(v => v === 'Setuju');

                                      let extraFields: Partial<ChangeRequest> = {
                                        cabVotes: newVotesJson
                                      };

                                      if (hasTolak) {
                                        extraFields.status = 'Ditolak';
                                        extraFields.approver = `Sistem (Ditolak Konsensus CAB - Terjadi Penolakan)`;
                                        extraFields.approvalDate = new Date().toISOString();
                                      } else if (allApproved) {
                                        extraFields.status = 'Disetujui';
                                        extraFields.approver = `Sistem (Disetujui Konsensus Mutlak CAB)`;
                                        extraFields.approvalDate = new Date().toISOString();
                                      } else {
                                        // Return to Pending Approval if previously authorized/rejected but no longer coherent
                                        if (selectedChange.status === 'Disetujui' || selectedChange.status === 'Ditolak') {
                                          extraFields.status = 'Menunggu Persetujuan';
                                          extraFields.approver = '';
                                          extraFields.approvalDate = '';
                                        }
                                      }

                                      handleUpdateCabinetFields(extraFields);
                                      triggerFeedback(`Suara Anda (${nextVoteValue}) berhasil dicatat secara otomatis!`);
                                    }}
                                    className="w-full bg-white border border-slate-200 text-[10px] font-bold text-slate-700 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  >
                                    <option value="Belum Memilih">Belum Memilih</option>
                                    <option value="Setuju">✅ Setuju</option>
                                    <option value="Tolak">❌ Tolak</option>
                                    <option value="Abstain">⚠️ Abstain</option>
                                  </select>
                                )
                              ) : (
                                <div className="text-[9px] text-slate-400 font-semibold p-1 text-center bg-slate-50 rounded border border-slate-100 select-none">
                                  🔒 Terkunci (Bukan Anda)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 3. CAB Meeting Notes & Risalah */}
                <div className="space-y-2 text-left bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                  <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <MessageSquare size={13} className="text-slate-400" />
                    Catatan Rapat / Risalah Keputusan CAB (Meeting Minutes)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tulis ringkasan hasil tanya jawab CAB, jaminan rollback, atau mitigasi risiko di sini..."
                    value={cabNotesInput}
                    onChange={(e) => setCabNotesInput(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-indigo-500 rounded p-2 text-xs font-medium text-slate-700"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateCabinetFields({
                          cabNotes: cabNotesInput
                        });
                        triggerFeedback('Risalah rapat peninjauan CAB berhasil disimpan!');
                      }}
                      className="bg-slate-150 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded text-[11px] font-bold transition cursor-pointer"
                    >
                      Perbarui Risalah CAB
                    </button>
                  </div>
                </div>

                {/* 4. Final Verification and Board Decision Stepper Container */}
                <div className="p-4 bg-indigo-50/40 border border-indigo-100/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                      <ShieldAlert size={14} className="text-indigo-600" />
                      Status Keputusan Akhir CAB Board
                    </div>
                    {selectedChange.approver ? (
                      <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded inline-block">
                        ✓ Disahkan oleh CAB: {selectedChange.approver} ({selectedChange.approvalDate ? new Date(selectedChange.approvalDate).toLocaleString('id-ID') : '-'})
                      </p>
                    ) : (
                      <div className="text-[11px] text-slate-600 leading-normal">
                        Rekomendasi CAB saat ini: {(() => {
                          try {
                            const activeCabList = getActiveCabListForChange(selectedChange, cabMembers);

                            const N = activeCabList.length;
                            const parsed = selectedChange.cabVotes ? JSON.parse(selectedChange.cabVotes) : {};
                            
                            // Only count votes belonging to active CAB members
                            const activeVotes = Object.entries(parsed)
                              .filter(([name]) => activeCabList.some(m => m.name === name))
                              .map(([_, vote]) => vote);

                            const approves = activeVotes.filter(v => v === 'Setuju').length;
                            const rejects = activeVotes.filter(v => v === 'Tolak').length;
                            
                            // For quorum, dynamic simple majority (e.g. >= ceil((N + 1) / 2) approvals)
                            const requiredApproves = N === 1 ? 1 : Math.ceil((N + 1) / 2);
                            const maxAllowedRejects = N === 1 ? 1 : Math.ceil(N / 2);

                            if (approves >= requiredApproves) {
                              return <b className="text-emerald-600">Disetujui berdasarkan mayoritas mutlak ({approves}/{N} Setuju). Siap disahkan!</b>;
                            } else if (rejects >= maxAllowedRejects) {
                              return <b className="text-rose-600 font-bold">Ditangguhkan / Ditolak ({rejects}/{N} Penolakan terdaftar). Butuh revisi.</b>;
                            } else {
                              return <b className="text-amber-600 font-medium">Menunggu suara kuorum masuk (Butuh minimum {requiredApproves} Suara Setuju, saat ini {approves}/{N}).</b>;
                            }
                          } catch (e) {
                            return <span>Menunggu verifikasi voting dewan direksi.</span>;
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {session?.role === 'admin' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Admin Action Steppers */}
                        {selectedChange.status === 'Menunggu Persetujuan' && (
                          <>
                            <button
                              onClick={() => handleApproveReject(false)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1"
                            >
                              <XOctagon size={14} />
                              Tolak RFC
                            </button>
                            <button
                              onClick={() => handleApproveReject(true)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} />
                              Mengesahkan RFC
                            </button>
                          </>
                        )}

                        {selectedChange.status === 'Disetujui' && (
                          <button
                            onClick={() => {
                              handleUpdateStatus('Sedang Diimplementasi');
                              triggerFeedback('Sukses memulai implementasi perubahan (Proses)!');
                            }}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition flex items-center gap-1"
                          >
                            <span>▶️ Mulai Implementasi (Proses)</span>
                          </button>
                        )}

                        {selectedChange.status === 'Sedang Diimplementasi' && (
                          <button
                            onClick={() => {
                              handleUpdateStatus('Selesai');
                              triggerFeedback('Perubahan sistem telah diselesaikan (Selesai)!');
                            }}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition flex items-center gap-1"
                          >
                            <span>✅ Selesaikan Perubahan (Selesai)</span>
                          </button>
                        )}

                        {/* Admin Direct Override Dropdown */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-150">
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-1 font-mono">Fase:</span>
                          <select
                            value={selectedChange.status}
                            onChange={(e) => handleUpdateStatus(e.target.value as ChangeStatus)}
                            className="bg-slate-50 border-0 rounded px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                            <option value="Disetujui">Disetujui (Approved)</option>
                            <option value="Sedang Diimplementasi">Sedang Diimplementasi (Proses)</option>
                            <option value="Selesai">Selesai (Completed)</option>
                            <option value="Batal">Batal (Cancelled)</option>
                            <option value="Ditolak">Ditolak</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* Non-Admin (IT Agent) view-only badges or prompts */
                      <div className="flex items-center justify-end gap-2 pr-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Status RFC:</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          selectedChange.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          selectedChange.status === 'Sedang Diimplementasi' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          selectedChange.status === 'Selesai' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                          selectedChange.status === 'Ditolak' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {selectedChange.status === 'Sedang Diimplementasi' ? 'Sedang Diimplementasi (Proses)' : selectedChange.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              Sila pilih Request for Change (RFC) untuk meninjau rancangan teknis.
            </div>
          )}
        </div>

      </div>

      {/* --- ADD CHANGEREQUEST MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900">
                <span className="flex items-center gap-2">
                  <GitBranch className="text-indigo-600" size={18} />
                  Ajukan Dokumen Permintaan Perubahan (RFC) Baru
                </span>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
              </div>

              <form onSubmit={handleSubmitRFC} className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Judul Dokumen Perubahan <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Contoh: Migrasi Server Email Core Hub ke O365"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  {/* Justification */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Alasan Pengajuan / Justifikasi Bisnis <span className="text-red-500">*</span></label>
                    <textarea
                      placeholder="Sebutkan kenapa perubahan mendesak ini dilakukan dan nilai tambah bagi bisnis..."
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      required
                      rows={2}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Detail Eksekusi & Ruang Lingkup Perubahan <span className="text-red-500">*</span></label>
                    <textarea
                      placeholder="Jelaskan apa saja perubahan yang akan dilakukan secara teknis..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      required
                      rows={2}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  {/* Risk & Classification */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Klasifikasi Perubahan</label>
                    <select
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value as ChangeClassification)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
                    >
                      <option value="Normal">Normal (Review CAB Standard)</option>
                      <option value="Standar">Standar (Prosedur Berulang Pre-Approved)</option>
                      <option value="Darurat">Darurat (Butuh Persetujuan Sekarang)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tingkat Risiko</label>
                    <select
                      value={formRisk}
                      onChange={(e) => setFormRisk(e.target.value as ChangeRisk)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
                    >
                      <option value="Rendah">Rendah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Tinggi">Tinggi</option>
                    </select>
                  </div>

                  {/* Impact */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Analisis Dampak Sistem / Potensi Downtime</label>
                    <input
                      type="text"
                      placeholder="Contoh: Downtime internet lobi selama 5 menit"
                      value={formImpact}
                      onChange={(e) => setFormImpact(e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  {/* Target Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal & Waktu Implementasi <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      value={formTargetDate}
                      onChange={(e) => setFormTargetDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  {/* Implementation Plan */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Rencana Implementasi Langkah-demi-Langkah</label>
                    <textarea
                      placeholder="1. Matikan daemon server&#10;2. Apply patch upgrade&#10;3. Nyalakan sistem kembali..."
                      value={formImplPlan}
                      onChange={(e) => setFormImplPlan(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-mono text-[11px] text-slate-800"
                    />
                  </div>

                  {/* Rollback Plan */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 font-mono">Rencana Pembatalan (Rollback Plan) jika Terjadi Kendala</label>
                    <textarea
                      placeholder="Contoh: Ambil sasis file konfigurasi lama pada slot B..."
                      value={formRollbackPlan}
                      onChange={(e) => setFormRollbackPlan(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-mono text-[11px] text-slate-800"
                    />
                  </div>

                  {/* Excel Upload for Change Board */}
                  <div className="md:col-span-2 border border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 p-4 rounded-xl transition duration-200">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Dokumen Lampiran Excel CAB (.xlsx, .xls)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-250 cursor-pointer px-3 py-2 rounded-lg text-xs font-black shadow-sm text-slate-700 transition">
                        <Plus size={14} className="text-slate-500" />
                        Pilih File Excel...
                        <input 
                          type="file"
                          id="change-excel-upload"
                          accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('spreadsheet') || file.type.includes('excel');
                              if (!isExcel) {
                                alert('Sila pilih file Excel yang sah (.xlsx, .xls).');
                                return;
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                alert('Ukuran file melebihi batas 5MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setFormExcelFile(event.target.result as string);
                                  setFormExcelFileName(file.name);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {formExcelFileName ? (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-120 px-2.5 py-1.5 rounded-lg">
                          <span className="font-semibold truncate max-w-[200px]">{formExcelFileName}</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormExcelFile('');
                              setFormExcelFileName('');
                              const el = document.getElementById('change-excel-upload') as HTMLInputElement;
                              if (el) el.value = '';
                            }}
                            className="text-red-500 hover:text-red-700 ml-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-450 italic">Belum ada file Excel yang dipilih</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 bg-slate-50 -mx-5 -mb-5 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Kirim RFC
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isDetailModalOpen && selectedChange && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-indigo-700 font-extrabold bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                    {selectedChange.id}
                  </span>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-855 text-slate-800 leading-tight">
                      Detail Permintaan Perubahan (RFC) & Panel CAB
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Klasifikasi: <b className="text-slate-700">{selectedChange.classification}</b> • Risiko: <b className="text-slate-700">{selectedChange.riskLevel}</b></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedChange.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    selectedChange.status === 'Sedang Diimplementasi' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                    selectedChange.status === 'Selesai' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                    selectedChange.status === 'Ditolak' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {selectedChange.status}
                  </span>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-1 px-3 bg-slate-200 hover:bg-slate-350 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition-colors rounded-lg text-sm font-bold cursor-pointer inline-flex items-center"
                    title="Tutup Modal"
                  >
                    Tutup (&times;)
                  </button>
                </div>
              </div>

              {/* Modal Body - Two scrollable columns */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                
                {/* Left Column: Technical Document Details */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)] text-left">
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Judul Dokumen Perubahan</h4>
                    <h2 className="text-base font-black text-slate-900 tracking-tight leading-snug mt-1">
                      {selectedChange.title}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Diusulkan Oleh</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <User size={12} className="text-slate-400" />
                        {selectedChange.requester}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Tanggal Target Eksekusi</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(selectedChange.targetDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                        <AlignLeft size={12} className="text-indigo-500" />
                        1. Alasan / Justifikasi Perubahan
                      </h4>
                      <p className="text-xs text-slate-700 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-semibold">
                        {selectedChange.reason}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                        <FileText size={12} className="text-indigo-500" />
                        2. Ruang Lingkup & Deskripsi Teknis Perubahan
                      </h4>
                      <div className="text-xs text-slate-700 mt-1.5 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap font-mono [font-size:11px]">
                        {selectedChange.description}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/35 border border-emerald-100 p-3.5 rounded-xl space-y-1.5">
                        <h5 className="text-[11px] font-black text-emerald-800 uppercase tracking-widest font-mono flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          Rencana Implementasi
                        </h5>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                          {selectedChange.implementationPlan || '-'}
                        </p>
                      </div>

                      <div className="bg-rose-50/35 border border-rose-100 p-3.5 rounded-xl space-y-1.5">
                        <h5 className="text-[11px] font-black text-rose-800 uppercase tracking-widest font-mono flex items-center gap-1">
                          <XOctagon size={13} />
                          Rencana Cadangan Pembatalan
                        </h5>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                          {selectedChange.rollbackPlan || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Tingkat Risiko</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`h-2.5 w-2.5 rounded-full ${selectedChange.riskLevel === 'Tinggi' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="text-xs font-bold text-slate-700">{selectedChange.riskLevel}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Dampak Sistem & Downtime</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{selectedChange.impact || 'Tidak ada downtime dilaporkan.'}</p>
                      </div>
                    </div>

                    {/* Excel Attachment Preview Card */}
                    {selectedChange.excelFile ? (
                      <div className="border border-slate-200 rounded-xl bg-white shadow-3xs p-4 space-y-3 mt-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                            <FileText size={12} className="text-emerald-600" />
                            Dokumen Lampiran Excel CAB
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                            {selectedChange.excelFileName || 'dokumen_cab.xlsx'}
                          </span>
                        </div>
                        
                        {(() => {
                          const isAuthorized = session?.role === 'admin' || session?.role === 'agent';
                          
                          if (!isAuthorized) {
                            return (
                              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold font-mono">
                                <Lock size={14} className="text-rose-500 shrink-0 select-none animate-bounce" />
                                Akses Terbatas: Hanya Sys Admin dan IT Agent yang diizinkan melihat/preview file Excel CAB.
                              </div>
                            );
                          }
                          
                          return <ExcelPreviewer base64Data={selectedChange.excelFile} fileName={selectedChange.excelFileName || 'dokumen_cab.xlsx'} />;
                        })()}
                      </div>
                    ) : null}

                  </div>
                </div>

                {/* Right Column: CAB Actions & Processing Panel */}
                <div className="p-6 bg-slate-50/50 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] text-left">
                  
                  {/* CAB Schedule */}
                  <div className="bg-white p-4 rounded-xl border border-slate-105 border-slate-150 shadow-xs space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="text-indigo-650" size={16} />
                      <h4 className="text-xs font-bold text-slate-800">Jadwal Rapat Anggota CAB</h4>
                    </div>
                    {session?.role === 'admin' ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="datetime-local"
                          value={cabMeetingInput}
                          onChange={(e) => setCabMeetingInput(e.target.value)}
                          className="flex-1 bg-slate-50 border-0 focus:ring-1 focus:ring-indigo-500 rounded p-1.5 text-xs font-bold text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateCabinetFields({
                              cabMeetingDate: cabMeetingInput
                            });
                            triggerFeedback('Jadwal rapat dewan CAB berhasil disimpan!');
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-mono text-[11px] font-bold py-1.5 px-3 rounded transition cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-slate-600">
                        {cabMeetingInput ? `🗓️ ${new Date(cabMeetingInput).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB` : '⏱️ Belum dijadwalkan oleh Administrator'}
                      </p>
                    )}
                  </div>

                  {/* CAB Voting */}
                  <div className="space-y-3">
                    {(() => {
                      const activeCabList = getActiveCabListForChange(selectedChange, cabMembers);
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Users size={14} className="text-indigo-500" />
                              Status Voting Risalah Komite CAB
                            </h4>
                            <span className="text-[9px] text-slate-400 font-bold">Quorum ({activeCabList.length} Anggota)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                              const parsedVotes = (() => {
                                try {
                                  return selectedChange.cabVotes ? JSON.parse(selectedChange.cabVotes) : {};
                                } catch (e) {
                                  return {};
                                }
                              })();

                              return activeCabList.map((member) => {
                                const currentVote = parsedVotes[member.name] || 'Belum Memilih';
                                
                                let voteBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
                                let voteIcon = <Clock size={11} />;
                                
                                if (currentVote === 'Setuju') {
                                  voteBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                  voteIcon = <ThumbsUp size={11} />;
                                } else if (currentVote === 'Tolak') {
                                  voteBadgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                                  voteIcon = <ThumbsDown size={11} />;
                                } else if (currentVote === 'Abstain') {
                                  voteBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                                  voteIcon = <AlertCircle size={11} />;
                                }

                                const isCurrentUser = !!(session?.name && (
                                  session.name.toLowerCase().trim() === member.name.toLowerCase().trim() ||
                                  session.name.toLowerCase().includes(member.name.toLowerCase()) ||
                                  member.name.toLowerCase().includes(session.name.toLowerCase())
                                ));

                                return (
                                  <div key={member.name} className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-2 relative transition ${
                                    isCurrentUser 
                                      ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10' 
                                      : 'bg-white border-slate-100'
                                  }`}>
                                    {isCurrentUser && (
                                      <span className="absolute -top-2 -right-1 text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full scale-90 uppercase">
                                        HAK ANDA
                                      </span>
                                    )}
                                    <div>
                                      <p className="text-xs font-bold text-slate-800 leading-none truncate">{member.name}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-none">{member.role}</p>
                                    </div>

                                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 justify-center ${voteBadgeClass}`}>
                                      {voteIcon}
                                      <span>{currentVote}</span>
                                    </div>

                                    <div className="pt-1">
                                      {isCurrentUser ? (
                                        ['Disetujui', 'Ditolak', 'Sedang Diimplementasi', 'Selesai', 'Batal'].includes(selectedChange.status) ? (
                                          <div className="text-[9px] text-amber-600 font-extrabold p-1 text-center bg-amber-50 rounded border border-amber-100 select-none uppercase tracking-wider font-mono">
                                            🔒 Terkunci ({selectedChange.status})
                                          </div>
                                        ) : (
                                          <select
                                            value={currentVote}
                                            onChange={(e) => {
                                              const nextVoteValue = e.target.value;
                                              const nextVotes = { 
                                                ...parsedVotes, 
                                                [member.name]: nextVoteValue,
                                                _cabMembersSnapshot: activeCabList
                                              };
                                              const newVotesJson = JSON.stringify(nextVotes);

                                              // Auto evaluate consensus rule
                                              const activeCabNames = activeCabList.map(m => m.name);
                                              const votesOfActive = activeCabNames.map(name => nextVotes[name] || 'Belum Memilih');

                                              const hasTolak = votesOfActive.some(v => v === 'Tolak');
                                              const allApproved = votesOfActive.length > 0 && votesOfActive.every(v => v === 'Setuju');

                                              let extraFields: Partial<ChangeRequest> = {
                                                cabVotes: newVotesJson
                                              };

                                              if (hasTolak) {
                                                extraFields.status = 'Ditolak';
                                                extraFields.approver = `Sistem (Ditolak Konsensus CAB - Terjadi Penolakan)`;
                                                extraFields.approvalDate = new Date().toISOString();
                                              } else if (allApproved) {
                                                extraFields.status = 'Disetujui';
                                                extraFields.approver = `Sistem (Disetujui Konsensus Mutlak CAB)`;
                                                extraFields.approvalDate = new Date().toISOString();
                                              } else {
                                                if (selectedChange.status === 'Disetujui' || selectedChange.status === 'Ditolak') {
                                                  extraFields.status = 'Menunggu Persetujuan';
                                                  extraFields.approver = '';
                                                  extraFields.approvalDate = '';
                                                }
                                              }

                                              handleUpdateCabinetFields(extraFields);
                                              triggerFeedback(`Suara Anda (${nextVoteValue}) berhasil direkam!`);
                                            }}
                                            className="w-full bg-slate-100 border-0 focus:ring-1 focus:ring-indigo-500 rounded p-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                                          >
                                            <option value="Belum Memilih">--- Berikan Suara ---</option>
                                            <option value="Setuju">✅ Setuju</option>
                                            <option value="Tolak">❌ Tolak</option>
                                            <option value="Abstain">⚠️ Abstain</option>
                                          </select>
                                        )
                                      ) : (
                                        <div className="text-[9px] text-slate-400 font-semibold p-1 text-center bg-slate-50 border border-slate-100 rounded select-none">
                                          🔒 Terkunci
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* CAB Notes Area */}
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 font-mono">
                      <MessageSquare size={13} className="text-slate-400" />
                      Risalah Rapat CAB (Meeting Minutes)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Masukkan poin kesepakatan rapat CAB di sini..."
                      value={cabNotesInput}
                      onChange={(e) => setCabNotesInput(e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-indigo-500 rounded p-2 text-xs font-semibold text-slate-700"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateCabinetFields({
                            cabNotes: cabNotesInput
                          });
                          triggerFeedback('Risalah rapat peninjauan CAB berhasil disimpan!');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-mono text-[10px] font-black py-1 px-3 rounded cursor-pointer"
                      >
                        Simpan Risalah Rapat
                      </button>
                    </div>
                  </div>

                  {/* Board Decision Stepper Container */}
                  <div className="p-4 bg-indigo-50/40 border border-indigo-100/40 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                        <ShieldAlert size={14} className="text-indigo-600" />
                        Status Keputusan Akhir CAB Board
                      </div>
                      {selectedChange.approver ? (
                        <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded inline-block mt-1">
                          ✓ Disahkan: {selectedChange.approver} ({selectedChange.approvalDate ? new Date(selectedChange.approvalDate).toLocaleString('id-ID') : '-'})
                        </p>
                      ) : (
                        <div className="text-[11px] text-slate-600 leading-normal">
                          Rekomendasi CAB saat ini: {(() => {
                            try {
                              const activeCabList = getActiveCabListForChange(selectedChange, cabMembers);

                              const N = activeCabList.length;
                              const parsed = selectedChange.cabVotes ? JSON.parse(selectedChange.cabVotes) : {};
                              
                              const activeVotes = Object.entries(parsed)
                                .filter(([name]) => activeCabList.some(m => m.name === name))
                                .map(([_, vote]) => vote);

                              const approves = activeVotes.filter(v => v === 'Setuju').length;
                              const rejects = activeVotes.filter(v => v === 'Tolak').length;
                              
                              const requiredApproves = N === 1 ? 1 : Math.ceil((N + 1) / 2);
                              const maxAllowedRejects = N === 1 ? 1 : Math.ceil(N / 2);

                              if (approves >= requiredApproves) {
                                return <b className="text-emerald-600">Disetujui mayoritas ({approves}/{N} Setuju). Siap disahkan!</b>;
                              } else if (rejects >= maxAllowedRejects) {
                                return <b className="text-rose-600 font-bold">Ditolak ({rejects}/{N} Tolak). Butuh revisi.</b>;
                              } else {
                                return <span>Menunggu verifikasi voting dewan direksi ({approves} setuju, {rejects} menolak, target {requiredApproves} setuju).</span>;
                              }
                            } catch (e) {
                              return <span>Menunggu voting dewan direksi.</span>;
                            }
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      {session?.role === 'admin' ? (
                        <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                          <div className="flex items-center gap-1.5">
                            {selectedChange.status === 'Menunggu Persetujuan' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveReject(false)}
                                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-slate-200 text-rose-700 text-xs font-bold rounded cursor-pointer transition flex items-center gap-1"
                                >
                                  <XOctagon size={13} />
                                  Tolak
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveReject(true)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white text-xs font-bold rounded cursor-pointer transition flex items-center gap-1 shadow-xs"
                                >
                                  <CheckCircle2 size={13} />
                                  Sahkan
                                </button>
                              </>
                            )}

                            {selectedChange.status === 'Disetujui' && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateStatus('Sedang Diimplementasi');
                                  triggerFeedback('Sukses memulai implementasi perubahan!');
                                }}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded cursor-pointer transition flex items-center gap-1 shadow-xs"
                              >
                                <span>▶️ Mulai Perubahan (Proses)</span>
                              </button>
                            )}

                            {selectedChange.status === 'Sedang Diimplementasi' && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateStatus('Selesai');
                                  triggerFeedback('Perubahan diselesaikan!');
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded cursor-pointer transition flex items-center gap-1 shadow-xs"
                              >
                                <span>✅ Selesaikan (Selesai)</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-400 px-1">Fase:</span>
                            <select
                              value={selectedChange.status}
                              onChange={(e) => handleUpdateStatus(e.target.value as ChangeStatus)}
                              className="bg-slate-50 border-0 rounded p-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                              <option value="Disetujui">Disetujui</option>
                              <option value="Sedang Diimplementasi">Proses</option>
                              <option value="Selesai">Selesai</option>
                              <option value="Batal">Batal</option>
                              <option value="Ditolak">Ditolak</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end w-full gap-2">
                          <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Status:</span>
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded">
                            {selectedChange.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExcelPreviewer({ base64Data, fileName }: { base64Data: string; fileName: string }) {
  const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: any[][] } | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const base64Clean = base64Data.split(';base64,')[1] || base64Data.split(',')[1] || base64Data;
      const binaryString = window.atob(base64Clean);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const workbook = XLSX.read(bytes.buffer, { type: 'array' });
      const result: { [sheetName: string]: any[][] } = {};
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Let's filter out row arrays which are entirely filled with empty/null strings to keep the UI clean
        const filteredJson = json.filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));
        result[sheetName] = filteredJson;
      });
      setSheetsData(result);
      if (workbook.SheetNames.length > 0) {
        setActiveSheet(workbook.SheetNames[0]);
      }
    } catch (err: any) {
      console.error("Gagal melakukan parse Excel:", err);
      setParseError("Tidak dapat menguraikan data file Excel ini. Pastikan file tidak rusak.");
    }
  }, [base64Data]);

  if (parseError) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl text-amber-800 text-xs font-mono">
        ❌ {parseError}
        <div className="mt-2 text-[10px]">
          <a href={base64Data} download={fileName} className="text-indigo-600 hover:underline font-bold">
            Unduh File Asli ({fileName})
          </a>
        </div>
      </div>
    );
  }

  if (!sheetsData) {
    return (
      <div className="text-xs text-slate-450 italic flex items-center gap-1.5 py-4 animate-pulse">
        Sedang memproses & memformat dokumen Excel...
      </div>
    );
  }

  const sheetNames = Object.keys(sheetsData);
  const rows = sheetsData[activeSheet] || [];

  return (
    <div className="space-y-3">
      {/* Download direct link */}
      <div className="flex items-center justify-between">
        <a 
          href={base64Data} 
          download={fileName} 
          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold inline-flex items-center gap-1"
        >
          📥 Unduh File Excel ({fileName})
        </a>
        <span className="text-[10px] text-slate-400 font-mono italic">Smart-render oleh Sistem</span>
      </div>

      {/* Sheet Tabs */}
      {sheetNames.length > 1 && (
        <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 overflow-x-auto">
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(name)}
              className={`px-3 py-1 text-[11px] rounded transition cursor-pointer shrink-0 ${
                activeSheet === name 
                  ? 'bg-indigo-600 text-white font-mono font-bold shadow-xs' 
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-mono font-normal'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Grid Table Layout */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative">
        <div className="max-h-[300px] overflow-auto [font-family:monospace] [font-size:11px]">
          <table className="w-full border-collapse border-spacing-0 select-text bg-white">
            <thead>
              <tr className="bg-slate-100 text-slate-500 font-mono select-none">
                <th className="border-r border-b border-slate-200 p-1 text-center w-8 bg-slate-150"></th>
                {(() => {
                  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
                  const headers = [];
                  for (let i = 0; i < maxCols; i++) {
                    let letter = '';
                    let temp = i;
                    while (temp >= 0) {
                      letter = String.fromCharCode((temp % 26) + 65) + letter;
                      temp = Math.floor(temp / 26) - 1;
                    }
                    headers.push(
                      <th key={i} className="border-r border-b border-slate-200 p-1 text-center font-bold min-w-[120px] text-slate-600 text-[10px]">
                        {letter}
                      </th>
                    );
                  }
                  return headers;
                })()}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-slate-400 italic font-mono">Sheet ini kosong atau berisi data kosong</td>
                </tr>
              ) : (
                rows.map((row, rIdx) => {
                  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
                  // Ensure we fill up the row cells to max columns to render grid perfectly
                  const filledRow = [...row];
                  while (filledRow.length < maxCols) {
                    filledRow.push('');
                  }
                  return (
                    <tr key={rIdx} className="hover:bg-indigo-50/20 divide-x divide-slate-150 border-b border-slate-150">
                      <td className="bg-slate-100 text-slate-400 font-mono text-center select-none font-bold p-1 text-[9px] border-r border-slate-200 w-8">
                        {rIdx + 1}
                      </td>
                      {filledRow.map((cell: any, cIdx: number) => (
                        <td key={cIdx} className="p-1 px-2 text-slate-800 break-words align-top font-sans text-xs">
                          {cell !== undefined && cell !== null ? String(cell) : ''}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
