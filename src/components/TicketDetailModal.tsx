import React, { useState, useMemo } from 'react';
import { Ticket, UserSession, WorkNote, TicketStatus, TicketPriority, DatabaseUser } from '../types';
import { 
  X, User, Mail, Calendar, Clock, CheckCircle2, 
  Send, MessageSquare, Tag, ShieldAlert, Sparkles, RefreshCw, AlertCircle, Cpu, FileText, Lock
} from 'lucide-react';
import { motion } from 'motion/react';

interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
  session: UserSession;
  onUpdateTicket: (updatedTicket: Ticket) => void;
  users?: DatabaseUser[];
}

export default function TicketDetailModal({ ticket, onClose, session, onUpdateTicket, users = [] }: TicketDetailModalProps) {
  const [commentText, setCommentText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    recommendedCategory: string;
    recommendedPriority: string;
    confidence: number;
    reason: string;
    estimatedRootCause: string;
    suggestedSteps: string[];
    draftResolutionText: string;
  } | null>(null);

  const isTechnical = session.role === 'admin' || session.role === 'agent';
  const isAdmin = session.role === 'admin';
  const isDispatcher = session.role === 'admin';
  const isAssignedToMe = useMemo(() => {
    const isDirectlyAssigned = !!(ticket.assignedAgent && ticket.assignedAgent.toLowerCase() !== 'unassigned' && ticket.assignedAgent.toLowerCase().includes(session.name.toLowerCase()));
    const isITStaff = session.role === 'admin' || session.role === 'agent';
    return isDirectlyAssigned || isITStaff;
  }, [ticket.assignedAgent, session.name, session.role]);
  const canAssignOrForward = useMemo(() => {
    const isUnassigned = !ticket.assignedAgent || ticket.assignedAgent.trim() === '' || ticket.assignedAgent.toLowerCase() === 'unassigned';
    return isTechnical || isUnassigned || isAssignedToMe;
  }, [isTechnical, ticket.assignedAgent, isAssignedToMe]);

  // Compute IT_AGENTS list dynamically based on registered users with agent or admin role
  const IT_AGENTS = useMemo(() => {
    if (users && users.length > 0) {
      // Filter users who are agents or admins
      const agentsList = users.filter(u => u.role === 'agent' || u.role === 'admin');
      if (agentsList.length > 0) {
        return agentsList.map(u => {
          const roleLabel = u.role === 'admin' ? 'IT Admin' : 'IT Specialist';
          const deptLabel = u.department ? ` - ${u.department}` : '';
          return `${u.name} (${roleLabel}${deptLabel})`;
        });
      }
    }
    // Fallback if no users loaded yet or static template
    return [
      'Siti Rahma (IT Support Tier-1)',
      'Budi Santoso (Network Specialist)',
      'Andi Wijaya (Systems Administrator)',
      'Rian Hidayat (Cybersecurity Specialist)',
      'Wati Lestari (Database Administrator)'
    ];
  }, [users]);

  const [selectedAgentForAssign, setSelectedAgentForAssign] = useState(
    ticket.assignedAgent || (IT_AGENTS[0] || '')
  );

  React.useEffect(() => {
    setSelectedAgentForAssign(ticket.assignedAgent || (IT_AGENTS[0] || ''));
  }, [ticket.assignedAgent, IT_AGENTS]);

  // Status Badge Colors (Minimalist and clean)
  const statusConfig = useMemo(() => {
    switch (ticket.status) {
      case 'Baru':
        return { bg: 'bg-blue-50 text-blue-750 border-blue-100', text: 'Baru' };
      case 'Ditugaskan':
        return { bg: 'bg-indigo-50 text-indigo-750 border-indigo-100', text: 'Ditugaskan' };
      case 'Sedang Diproses':
        return { bg: 'bg-indigo-600 text-white border-transparent', text: 'Diproses' };
      case 'Ditangguhkan':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-150', text: 'Ditangguhkan' };
      case 'Selesai':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-150', text: 'Selesai' };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: ticket.status };
    }
  }, [ticket.status]);

  // Priority config
  const priorityConfig = useMemo(() => {
    switch (ticket.priority) {
      case 'Urgent':
        return { text: 'Urgent', bg: 'bg-rose-50 text-rose-700 border-rose-100' };
      case 'Tinggi':
        return { text: 'Tinggi', bg: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'Sedang':
        return { text: 'Sedang', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { text: 'Rendah', bg: 'bg-slate-50 text-slate-500 border-slate-100' };
    }
  }, [ticket.priority]);

  // Update Status Transition
  const handleStatusChange = (newStatus: TicketStatus) => {
    const updatedInc: Ticket = { ...ticket };
    const now = new Date().toISOString();
    const prevStatus = updatedInc.status;
    
    updatedInc.status = newStatus;
    updatedInc.updatedAt = now;

    const defaultAgent = IT_AGENTS[0] || 'Siti Rahma (IT Support Tier-1)';

    // Auto agent assign on status move
    if (!updatedInc.assignedAgent && newStatus !== 'Baru') {
      updatedInc.assignedAgent = defaultAgent;
    }

    const noteText = `Status insiden diubah dari "${prevStatus}" menjadi "${newStatus}".${
      !ticket.assignedAgent ? ` Tiket dialokasikan ke agen ${defaultAgent}.` : ''
    }`;

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-${Date.now()}`,
        author: 'Sistem Portal (Popup)',
        text: noteText,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
  };

  // Assign ticket to an IT agent explicitly (Transitions status to "Ditugaskan")
  const handleAssignAgent = (agentName: string) => {
    const updatedInc: Ticket = { ...ticket };
    const now = new Date().toISOString();
    const prevStatus = updatedInc.status;
    const prevAgent = updatedInc.assignedAgent;

    updatedInc.assignedAgent = agentName;
    updatedInc.status = 'Ditugaskan';
    updatedInc.updatedAt = now;

    let logText = `Tiket ditugaskan ke agen spesialis: ${agentName}.`;
    if (prevStatus === 'Baru') {
      logText = `Tiket baru diverifikasi dan didelegasikan ke agen spesialis: ${agentName}. Status berpindah dari "Baru" menjadi "Ditugaskan".`;
    } else if (prevAgent && prevAgent !== agentName) {
      logText = `Tiket dialihkan (re-assigned) dari "${prevAgent}" ke agen baru: ${agentName}. Status diatur ulang ke "Ditugaskan".`;
    }

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-assign-${Date.now()}`,
        author: 'Sistem Portal (Popup)',
        text: logText,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
  };

  // Reopen ticket from "Selesai" (Transitions status back to "Sedang Diproses")
  const handleReopenTicket = () => {
    const updatedInc: Ticket = { ...ticket };
    const now = new Date().toISOString();
    const prevStatus = updatedInc.status;

    updatedInc.status = 'Sedang Diproses';
    updatedInc.updatedAt = now;

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-reopen-${Date.now()}`,
        author: 'Sistem Portal (Popup)',
        text: `Tiket insiden dibuka kembali (Re-opened) oleh administrator/klien karena kendala belum terselesaikan sepenuhnya.`,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
  };

  // Update Ticket Priority
  const handlePriorityChange = (newPriority: TicketPriority) => {
    const updatedInc: Ticket = { ...ticket };
    const now = new Date().toISOString();
    const prevPriority = updatedInc.priority;

    updatedInc.priority = newPriority;
    updatedInc.updatedAt = now;

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-prio-${Date.now()}`,
        author: 'Sistem Portal (Popup)',
        text: `Prioritas tingkat urgensi diubah dari "${prevPriority}" menjadi "${newPriority}".`,
        createdAt: now,
        type: 'system'
      }
    ];

    onUpdateTicket(updatedInc);
  };

  // Submit Resolution / Selesaikan Tiket
  const handleResolveTicket = (resolutionText: string) => {
    if (!resolutionText.trim()) return;

    const updatedInc: Ticket = { ...ticket };
    const now = new Date().toISOString();

    updatedInc.status = 'Selesai';
    updatedInc.resolutionNotes = resolutionText;
    updatedInc.updatedAt = now;
    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-res-${Date.now()}`,
        author: 'Sistem Portal (Popup)',
        text: `Insiden telah ditandai Selesai. Catatan resolusi diposting.`,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const now = new Date().toISOString();
    const newNote: WorkNote = {
      id: `note-${Date.now()}`,
      author: session.name,
      text: commentText.trim(),
      createdAt: now,
      type: 'comment'
    };

    const updatedTicket: Ticket = {
      ...ticket,
      updatedAt: now,
      workNotes: [...ticket.workNotes, newNote]
    };

    onUpdateTicket(updatedTicket);
    setCommentText('');
  };

  // Trigger Gemini AI smart triage
  const handleAiAnalyze = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error occurred');
      }

      const data = await response.json();
      setAiAnalysis(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('GEMINI_API_KEY_MISSING')) {
        setAiError('Kunci API Gemini terdeteksi kosong. Silakan aktifkan Gemini API Key dari panel Secrets/');
      } else {
        setAiError(err.message || 'Gagal menghubungi asisten AI Gemini.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quick Action Apply AI resolution draf to comment text
  const applyAiResolutionNotes = () => {
    if (!aiAnalysis) return;
    setCommentText(`Resolusi Rekomendasi AI:\n\n${aiAnalysis.draftResolutionText}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4" id="ticket-detail-modal-root">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-150 flex flex-col max-h-[90vh] overflow-hidden"
        id="ticket-detail-modal-card"
      >
        {/* Header Block */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 to-indigo-50/10 shrink-0">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-extrabold text-slate-500 bg-slate-100 rounded-md px-2 py-0.5 border border-slate-150/60">
                {ticket.id}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                &bull; {ticket.ticketType || 'Incident'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-950 leading-snug tracking-tight">
              {ticket.title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer shrink-0 mt-0.5 bg-slate-100/50"
            id="close-ticket-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body - Scrollable dual-column layout for details and activities */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6 text-left" id="ticket-modal-scrollable-body">
          
          {/* LEFT 3 COLS: Ticket details, descriptions, and updates / Actions */}
          <div className="md:col-span-3 space-y-5">
            {/* Quick Strip */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 text-[10px] font-extrabold block uppercase tracking-wider mb-1 font-mono">Status</span>
                <span className={`inline-block px-3 py-0.5 text-xs font-bold rounded-full border ${statusConfig.bg}`}>
                  {statusConfig.text}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-extrabold block uppercase tracking-wider mb-1 font-mono">Prioritas</span>
                <span className={`inline-block px-3 py-0.5 text-xs font-bold rounded border ${priorityConfig.bg}`}>
                  {priorityConfig.text}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-extrabold block uppercase tracking-wider mb-1 font-mono">Kategori</span>
                <span className="inline-block px-3 py-0.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded">
                  {ticket.category}
                </span>
              </div>
            </div>

            {/* Description Card */}
            <div className="space-y-1.5 border border-slate-100 rounded-xl p-4 bg-white shadow-3xs">
              <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 font-mono">Detail Deskripsi Masalah</h4>
              <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal whitespace-pre-wrap select-text">
                {ticket.description}
              </p>
            </div>

            {/* Evidence Attachment Section */}
            {ticket.evidence && (
              <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-3xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                    <FileText size={12} className="text-slate-500" />
                    Lampiran Bukti Gambar Insiden
                  </h4>
                  {ticket.evidenceName && (
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">
                      {ticket.evidenceName}
                    </span>
                  )}
                </div>
                {(() => {
                  const isSysAdmin = session.role === 'admin';
                  const isAssignedAgent = !!(ticket.assignedAgent && ticket.assignedAgent.toLowerCase() !== 'unassigned' && ticket.assignedAgent.toLowerCase().includes(session.name.toLowerCase()));
                  const isRequester = ticket.requester === session.name || ticket.requesterEmail === session.email;
                  
                  if (isSysAdmin || isAssignedAgent || isRequester) {
                    return (
                      <div className="space-y-3">
                        <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50 inline-block overflow-hidden max-w-full">
                          <img 
                            src={ticket.evidence} 
                            alt={ticket.evidenceName || "Bukti Gambar"} 
                            referrerPolicy="no-referrer"
                            className="max-h-[300px] w-auto h-auto rounded-lg object-contain cursor-zoom-in hover:opacity-95 transition"
                            onClick={() => {
                              try {
                                const win = window.open();
                                if (win) {
                                  win.document.write(`<img src="${ticket.evidence}" style="max-width:100%; height:auto;" />`);
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-450 italic font-mono">
                          * Diperlihatkan kepada Anda berdasarkan otorisasi ({isSysAdmin ? 'Sys Admin' : isAssignedAgent ? 'IT Agent Penanggung Jawab' : 'Pemilik Tiket'}).
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold font-mono">
                        <Lock size={14} className="text-rose-500 shrink-0 animate-bounce" />
                        Akses Terbatas: Hanya Sys Admin atau IT Agent Penanggung Jawab yang diizinkan melihat lampiran gambar ini.
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            {/* SLA Info section */}
            <div className="space-y-2 border border-slate-150/75 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                  <Clock size={12} />
                  SLA Komitmen Waktu & Penyelesaian
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Target: {new Date(ticket.slaDeadline).toLocaleDateString('id-ID')}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Batas resolusi maksimal sesuai model ITIL v4: <span className="font-extrabold text-indigo-700">{new Date(ticket.slaDeadline).toLocaleString('id-ID')}</span>. Evaluasi status kepatuhan SLA dilakukan secara otomatis oleh sistem saat insiden diselesaikan.
              </p>
            </div>

            {/* Admin State Change Controls */}
            {isTechnical && (
              <div className="border border-slate-150 rounded-xl p-4 bg-indigo-50/5 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100/40 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
                    <Cpu size={14} className="text-indigo-600 animate-pulse" />
                    Menu Kontrol Alur Kerja Admin & ITIL v4
                  </div>
                  <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                    Status: {ticket.status}
                  </span>
                </div>

                {/* 1. TINGKAT SEVERITAS / PRIORITAS (LOCK / READ-ONLY TO PRESERVE SLA) */}
                {ticket.status !== 'Selesai' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    <div>
                      <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider mb-1.5 font-mono">Prioritas Insiden (SLA Tetap)</label>
                      <div className="w-full bg-slate-100/60 border border-slate-205 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 select-none flex items-center justify-between">
                        <span>
                          {ticket.priority === 'Urgent' && '🚗 Urgent (P1 - Target 2/4 Jam)'}
                          {ticket.priority === 'Tinggi' && '⚡ Tinggi (P2 - Target 6/8 Jam)'}
                          {ticket.priority === 'Sedang' && '☕ Sedang (P3 - Target 12/24 Jam)'}
                          {ticket.priority === 'Rendah' && '💤 Rendah (P4 - Target 48 Jam)'}
                        </span>
                        <span className="text-[10px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-black animate-pulse">
                          SLA DIKUNCI
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end text-[10.5px] text-slate-500 leading-snug font-medium italic">
                      Komitmen resolusi penyelesaian SLA dihitung berdasarkan laporan pengajuan awal klien dan dikunci untuk audit TI objektif.
                    </div>
                  </div>
                )}

                {/* 2. ALUR PENUGASAN (ASSIGNMENT LIFE-CYCLE) */}
                {ticket.status !== 'Selesai' && (
                  <div className="border-t border-slate-100/80 pt-3 space-y-2.5">
                    <div>
                      <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono mb-1 flex items-center justify-between">
                        <span>Pilih Agen Spesialis TI</span>
                        {session.role === 'admin' ? (
                          <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            🛡️ Akses Administrator Aktif
                          </span>
                        ) : session.role === 'agent' ? (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            ⚡ Akses IT Agent Aktif
                          </span>
                        ) : null}
                      </span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedAgentForAssign}
                          onChange={(e) => setSelectedAgentForAssign(e.target.value)}
                          disabled={!canAssignOrForward}
                          className="flex-1 bg-white border border-slate-205 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-755 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          {IT_AGENTS.map((agent) => (
                            <option key={agent} value={agent}>{agent}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignAgent(selectedAgentForAssign)}
                          disabled={!canAssignOrForward}
                          className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-3xs ${
                            canAssignOrForward
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Send size={12} />
                          {ticket.status === 'Baru' ? 'Tugaskan Tiket' : 'Alihkan Agen'}
                        </button>
                      </div>
                      <div className="text-[11px] text-indigo-750 font-medium italic mt-2 flex items-center gap-1.5">
                        <span className="font-bold text-slate-400">Aktif Saat Ini:</span>
                        {ticket.assignedAgent || 'Menunggu Penugasan'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ALUR OPERASIONAL STATUS (OPERATIONAL TRANSITIONS) */}
                {ticket.status !== 'Selesai' && (
                  <div className="border-t border-slate-100/80 pt-3 space-y-3">
                    <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono flex items-center justify-between">
                      <span>Tindakan Operasional & Penyelidikan</span>
                      {!isAssignedToMe && ticket.assignedAgent && (
                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          🔒 Khusus Agen Pelaksana
                        </span>
                      )}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {ticket.status === 'Ditugaskan' && (
                        isAssignedToMe ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange('Sedang Diproses')}
                            className="flex-1 min-w-[140px] bg-slate-900 hover:bg-slate-800 text-white border border-transparent rounded-lg py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                          >
                            <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '6s' }} />
                            Mulai Kerja (Proses)
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 min-w-[140px] bg-slate-100 text-slate-400 border border-slate-200/60 rounded-lg py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-not-allowed"
                            title="Hanya dapat diaktifkan oleh IT yang ditugaskan."
                          >
                            <Lock size={12} />
                            Mulai Kerja (Hanya Untuk Agen)
                          </button>
                        )
                      )}

                      {ticket.status === 'Sedang Diproses' && (
                        isAssignedToMe ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange('Ditangguhkan')}
                            className="flex-1 min-w-[140px] bg-amber-500 hover:bg-amber-450 border border-transparent text-white rounded-lg py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                          >
                            <AlertCircle size={13} />
                            Tangguhkan (On Hold)
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 min-w-[140px] bg-slate-100 text-slate-400 border border-slate-200/60 rounded-lg py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <Lock size={12} />
                            Tangguhkan (On Hold)
                          </button>
                        )
                      )}

                      {ticket.status === 'Ditangguhkan' && (
                        isAssignedToMe ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange('Sedang Diproses')}
                            className="flex-1 min-w-[140px] bg-indigo-650 hover:bg-indigo-600 border border-transparent text-white rounded-lg py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                          >
                            <RefreshCw size={13} />
                            Lanjutkan Proses
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 min-w-[140px] bg-slate-100 text-slate-400 border border-slate-200/60 rounded-lg py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <Lock size={12} />
                            Lanjutkan Proses
                          </button>
                        )
                      )}
                    </div>

                    {/* Selesaikan Tiket Section (Hanya saat status: Sedang Diproses & khusus untuk agen pelaksana/resolver saja) */}
                    {ticket.status === 'Sedang Diproses' && isAssignedToMe && (
                      <div className="border-t border-slate-100/60 pt-3 space-y-2">
                        <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">
                          Tulis Solusi & Selesaikan Tiket
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Tulis draf petunjuk penyembuhan / resolusi troubleshooting..."
                            id="popup-resolution-input"
                            className="flex-1 bg-white border border-slate-205 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-lg text-xs px-3 py-2 text-slate-800 font-medium placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('popup-resolution-input') as HTMLInputElement;
                              if (input && input.value.trim()) {
                                handleResolveTicket(input.value);
                                input.value = '';
                              } else {
                                alert('Silakan tulis draf pesan perbaikan/solusi terlebih dahulu.');
                              }
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-3xs"
                          >
                            <CheckCircle2 size={13} />
                            Selesaikan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. REOPEN ACTION UNTUK SELESAI */}
                {ticket.status === 'Selesai' && (
                  <div className="space-y-2 text-center p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium font-sans">
                      Tiket ini telah berstatus <span className="font-bold text-emerald-700">Selesai</span>. Jika kendala terulang kembali atau belum teratasi secara penuh, silakan diaktifkan kembali.
                    </p>
                    <button
                      type="button"
                      onClick={handleReopenTicket}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 text-xs font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      Buka Kembali Tiket (Re-open)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Unified ITSM Lifecycle Timeline Tracker */}
            <div className="space-y-3 border border-slate-100 p-4 rounded-xl bg-white shadow-3xs text-left">
              <h4 className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-0.5 inline-block uppercase font-extrabold tracking-widest text-slate-500 font-mono">
                Peta Perjalanan Tiket (ITIL v4 Cycle)
              </h4>
              <div className="relative pt-3 pb-1">
                <div className="absolute h-0.5 bg-slate-200 left-[10%] right-[10%] top-[25px] -z-0"></div>
                <div 
                  className="absolute h-0.5 bg-indigo-600 left-[10%] top-[25px] transition-all duration-500 -z-0"
                  style={{
                    width: 
                      ticket.status === 'Baru' ? '0%' :
                      ticket.status === 'Ditugaskan' ? '27%' :
                      ticket.status === 'Sedang Diproses' ? '54%' :
                      ticket.status === 'Ditangguhkan' ? '54%' : '80%'
                  }}
                ></div>

                <div className="relative flex justify-between select-none z-10">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center w-[20%]">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold bg-indigo-600 text-white shadow-sm font-mono">
                      1
                    </span>
                    <span className="text-[10px] font-bold text-slate-800 mt-1.5">Baru</span>
                    <p className="text-[8px] text-slate-400 font-semibold leading-3 mt-0.5 text-center hidden sm:block">Tiket didaftarkan</p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center w-[20%]">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border transition-all font-mono ${
                      ['Ditugaskan', 'Sedang Diproses', 'Ditangguhkan', 'Selesai'].includes(ticket.status)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      2
                    </span>
                    <span className={`text-[10px] font-bold mt-1.5 ${
                      ['Ditugaskan', 'Sedang Diproses', 'Ditangguhkan', 'Selesai'].includes(ticket.status) ? 'text-slate-800' : 'text-slate-400'
                    }`}>Ditugaskan</span>
                    <p className="text-[8px] text-slate-400 font-semibold leading-3 mt-0.5 text-center hidden sm:block">Didelegasikan ke spesialis</p>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center w-[20%]">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border transition-all font-mono ${
                      ['Sedang Diproses', 'Ditangguhkan', 'Selesai'].includes(ticket.status)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm animate-pulse'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      3
                    </span>
                    <span className={`text-[10px] font-bold mt-1.5 ${
                      ['Sedang Diproses', 'Ditangguhkan', 'Selesai'].includes(ticket.status) ? 'text-slate-800' : 'text-slate-400'
                    }`}>Diproses</span>
                    <p className="text-[8px] text-slate-400 font-semibold leading-3 mt-0.5 text-center hidden sm:block">Tindakan pemulihan</p>
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-col items-center w-[20%]">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border transition-all font-mono ${
                      ticket.status === 'Selesai'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      4
                    </span>
                    <span className={`text-[10px] font-bold mt-1.5 ${
                      ticket.status === 'Selesai' ? 'text-emerald-700 font-black' : 'text-slate-400'
                    }`}>Selesai</span>
                    <p className="text-[8px] text-slate-400 font-semibold leading-3 mt-0.5 text-center hidden sm:block">Resolusi diposting</p>
                  </div>
                </div>
              </div>
              
              {ticket.status === 'Ditangguhkan' && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-600 animate-bounce" />
                  <p className="text-[10.5px] text-amber-800 font-semibold leading-snug">
                    Status saat ini ditangguhkan (On Hold). Tim IT sedang menunggu respon/data eksternal sebelum melanjutkan investigasi.
                  </p>
                </div>
              )}
            </div>

            {/* Gemini AI Smart Assistant Block inside Popup Modal */}
            {isTechnical && (
              <div className="border border-slate-200/60 rounded-xl p-4 bg-teal-50/10 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#113115]">
                    <Sparkles className="text-teal-600 shrink-0 fill-teal-100" size={16} />
                    Gemini AI Triage Assistant
                  </div>
                  <button
                    onClick={handleAiAnalyze}
                    disabled={isAiLoading}
                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-150/40 transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {isAiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiAnalysis ? 'Analisis Ulang' : 'Picu Analisis AI'}
                  </button>
                </div>

                {isAiLoading && (
                  <div className="space-y-2 text-center py-4">
                    <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 font-sans">Gemini sedang meninjau keluhan sistem, merumuskan kategori, dan menulis draf penanganan...</p>
                  </div>
                )}

                {aiError && (
                  <div className="bg-red-50 border border-red-105 p-3 rounded-lg text-xs text-red-700 space-y-1">
                    <p className="font-extrabold flex items-center gap-1">
                      <AlertCircle size={14} />
                      Analisis AI Gagal
                    </p>
                    <p className="font-medium">{aiError}</p>
                  </div>
                )}

                {aiAnalysis && !isAiLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-3.5 text-xs text-slate-700"
                  >
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-100 shadow-3xs">
                      <div>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase font-mono">REKOMENDASI KATEGORI</p>
                        <p className="font-bold text-slate-800 text-[11.5px] mt-0.5">{aiAnalysis.recommendedCategory}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase font-mono">REKOMENDASI PRIORITAS</p>
                        <p className="font-bold text-slate-800 text-[11.5px] mt-0.5">{aiAnalysis.recommendedPriority}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase mb-0.5 font-mono">PERKIRAAN AKAR PENYEBAB (ROOT CAUSE)</p>
                      <p className="font-bold text-slate-800 italic bg-white p-2 border border-slate-100 rounded-lg">"{aiAnalysis.estimatedRootCause}"</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase font-mono">LANGKAH DISPOSISI / TROUBLESHOOTING</p>
                      <ul className="list-decimal list-inside space-y-1 text-slate-600 font-sans pl-1">
                        {aiAnalysis.suggestedSteps.map((step, idx) => (
                          <li key={idx} className="font-semibold text-slate-700">{step}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-slate-150 rounded-lg p-3 bg-white space-y-1.5 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase flex items-center gap-1 font-mono">
                          <FileText size={12} />
                          Draf Teks Jawaban / Tanggapan Kepada Klien
                        </span>
                        <button
                          type="button"
                          onClick={applyAiResolutionNotes}
                          className="text-[10px] font-extrabold text-indigo-705 bg-indigo-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-indigo-100 transition whitespace-nowrap cursor-pointer"
                        >
                          Salin Ke Draf Komentar &darr;
                        </button>
                      </div>
                      <p className="text-[11px]/[15px] text-slate-600 font-sans italic p-2 bg-slate-50 border border-slate-100 rounded-md">
                        {aiAnalysis.draftResolutionText}
                      </p>
                    </div>
                  </motion.div>
                )}

                {!aiAnalysis && !isAiLoading && !aiError && (
                  <p className="text-xs text-slate-405 italic text-center py-1 bg-white rounded border border-slate-100">
                    Sistem dapat memicu analitik model Gemini untuk membaca keluhan, mengidentifikasi root-cause, merekomendasikan parameter, dan merancang perbaikan otomatis.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 2 COLS: Contact details, ticket notes/chat history and comment input */}
          <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 flex flex-col justify-between max-h-[60vh] md:max-h-[70vh]">
            
            {/* Requester Profile */}
            <div className="space-y-2 border-b border-slate-100 pb-4 shrink-0">
              <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 font-mono">Informasi Pelapor Kartu Identitas</h4>
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold border border-slate-205">
                  {ticket.requester.charAt(0)}
                </div>
                <div className="text-xs space-y-0.5 min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{ticket.requester}</p>
                  <p className="text-slate-405 font-semibold text-[10.5px] truncate">{ticket.department}</p>
                  <p className="text-slate-400 font-mono text-[10px] truncate">{ticket.requesterEmail}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Asisten TI:</span>
                  <span className="font-bold text-slate-800">{ticket.assignedAgent || 'Menunggu Agen'}</span>
                </div>
                {ticket.linkedAssetId && (
                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                    <span>Aset Terkait:</span>
                    <span className="font-mono text-[9px] font-bold bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-700">
                      {ticket.linkedAssetId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Chronological Chat/Notes display */}
            <div className="flex-1 overflow-y-auto space-y-3.5 py-4 min-h-[150px] max-h-[300px]">
              <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 font-mono flex items-center gap-1.5 sticky top-0 bg-white py-1">
                <MessageSquare size={12} />
                Riwayat Aktivitas & Catatan ({ticket.workNotes.length})
              </h4>

              <div className="space-y-2.5 pr-1">
                {ticket.workNotes.map((note) => {
                  const dateVal = new Date(note.createdAt);
                  const isSystem = note.type === 'system' || note.type === 'status_change';
                  const noteBg = isSystem 
                    ? 'bg-amber-50/20 border border-amber-100/50 text-[10px]' 
                    : note.author === session.name 
                      ? 'bg-indigo-50/50 border border-indigo-100/50' 
                      : 'bg-slate-50/80 border border-slate-100';

                  return (
                    <div key={note.id} className={`p-2.5 rounded-lg text-xs space-y-1 ${noteBg}`}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>{note.author}</span>
                        <span>
                          {dateVal.toLocaleDateString('id-ID')} {dateVal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-slate-700 leading-normal whitespace-pre-wrap ${isSystem ? 'italic text-slate-455 font-medium' : 'font-normal'}`}>
                        {note.text}
                      </p>
                    </div>
                  );
                })}

                {ticket.workNotes.length === 0 && (
                  <p className="text-xs text-slate-350 italic text-center py-6">
                    Belum ada catatan aktivitas pada tiket ini.
                  </p>
                )}
              </div>
            </div>

            {/* Input Form Footer inside Popup Modal (Right side bottom) */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-100 bg-white flex gap-2 items-center shrink-0">
              <input 
                type="text" 
                placeholder="Komentar / Tulis tanggapan..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-slate-50 text-xs border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 focus:outline-none font-medium text-slate-800 placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg cursor-pointer transition flex items-center justify-center text-xs font-bold shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

        {/* Resolution Notes Display if Solved */}
        {ticket.status === 'Selesai' && ticket.resolutionNotes && (
          <div className="px-6 py-3 border-t border-emerald-100 bg-emerald-50/30 text-xs shrink-0 text-left">
            <span className="font-bold text-emerald-850 block mb-0.5">Catatan Perbaikan Resolusi Layanan TI:</span>
            <p className="text-slate-700 font-medium italic">"{ticket.resolutionNotes}"</p>
          </div>
        )}

      </motion.div>
    </div>
  );
}
