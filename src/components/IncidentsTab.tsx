/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Ticket, TicketPriority, TicketStatus, TicketCategory, TicketType, Asset, KBArticle, UserSession, SlaPolicy, DatabaseUser } from '../types';
import { 
  Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, User, 
  MapPin, Notebook, ArrowRight, ShieldAlert, Check, RefreshCw, Send,
  Cpu, FileText, Mail, Sparkles, HelpCircle, Flame, Wrench, LifeBuoy,
  GitBranch, Key, Info, MessageSquare, Briefcase, ChevronLeft, X, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IncidentsTabProps {
  tickets: Ticket[];
  assets: Asset[];
  kbArticles: KBArticle[];
  onAddTicket: (ticket: Ticket) => void;
  onUpdateTicket: (ticket: Ticket) => void;
  session: UserSession;
  onViewTicketDetail?: (ticket: Ticket) => void;
  slaPolicies?: SlaPolicy[];
  users?: DatabaseUser[];
}

// Full specifications of Ticket Types based on the User's guidelines Table
export const TICKET_TYPES_DATA = [
  {
    type: 'Incident' as TicketType,
    definition: 'Gangguan atau penurunan layanan yang tidak direncanakan dan harus segera dipulihkan.',
    example: 'Email tidak bisa diakses, Oracle EBS error, server down, VPN putus.',
    colorClass: 'border-red-200 hover:border-red-400 bg-red-50/20 text-red-700',
    iconColor: 'text-red-600',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: Flame
  },
  {
    type: 'Service Request' as TicketType,
    definition: 'Permintaan layanan standar dari pengguna, bukan karena gangguan.',
    example: 'Minta akses aplikasi, reset password, pembuatan email baru, instalasi software.',
    colorClass: 'border-blue-200 hover:border-blue-400 bg-blue-50/20 text-blue-700',
    iconColor: 'text-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Wrench
  },
  {
    type: 'Problem' as TicketType,
    definition: 'Investigasi akar penyebab dari incident yang berulang atau berdampak besar.',
    example: 'Oracle EBS sering hang setiap akhir bulan, jaringan sering putus di kantor tertentu.',
    colorClass: 'border-amber-200 hover:border-amber-400 bg-amber-50/20 text-amber-700',
    iconColor: 'text-amber-600',
    badgeClass: 'bg-amber-50 text-amber-705 border-amber-200',
    icon: LifeBooyIcon
  },
  {
    type: 'Change Request (RFC)' as TicketType,
    definition: 'Permintaan perubahan terhadap sistem atau infrastruktur yang sudah berjalan.',
    example: 'Patching server, perubahan workflow approval, upgrade database, penambahan storage.',
    colorClass: 'border-purple-200 hover:border-purple-400 bg-purple-50/20 text-purple-700',
    iconColor: 'text-purple-600',
    badgeClass: 'bg-purple-50 text-purple-707 border-purple-200',
    icon: GitBranch
  },
  {
    type: 'Access Request' as TicketType,
    definition: 'Permintaan pemberian, perubahan, atau pencabutan hak akses. Kadang dipisahkan dari Service Request.',
    example: 'Tambah responsibility Oracle EBS, akses VPN, akses folder shared.',
    colorClass: 'border-teal-200 hover:border-teal-400 bg-teal-50/20 text-teal-700',
    iconColor: 'text-teal-600',
    badgeClass: 'bg-teal-50 text-teal-705 border-teal-200',
    icon: Key
  },
  {
    type: 'Information Request' as TicketType,
    definition: 'Permintaan informasi atau konsultasi.',
    example: 'Minta panduan penggunaan aplikasi, menanyakan prosedur backup, meminta dokumentasi.',
    colorClass: 'border-cyan-200 hover:border-cyan-400 bg-cyan-50/20 text-cyan-700',
    iconColor: 'text-cyan-600',
    badgeClass: 'bg-cyan-50 text-cyan-710 border-cyan-200',
    icon: Info
  },
  {
    type: 'Complaint / Feedback' as TicketType,
    definition: 'Keluhan atau masukan terhadap layanan TI.',
    example: 'Respons helpdesk lambat, kualitas jaringan kurang baik.',
    colorClass: 'border-pink-200 hover:border-pink-400 bg-pink-50/20 text-pink-700',
    iconColor: 'text-pink-600',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
    icon: MessageSquare
  },
  {
    type: 'Project Request' as TicketType,
    definition: 'Permintaan pekerjaan yang sifatnya pengembangan atau implementasi baru.',
    example: 'Pembuatan aplikasi baru, integrasi sistem, dashboard BI baru.',
    colorClass: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/20 text-emerald-700',
    iconColor: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Briefcase
  }
];

// Fallback icon helper to avoid missing references
function LifeBooyIcon(props: any) {
  return <LifeBuoy {...props} />;
}

export default function IncidentsTab({ tickets, assets, kbArticles, onAddTicket, onUpdateTicket, session, onViewTicketDetail, slaPolicies = [], users = [] }: IncidentsTabProps) {
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Modal step for wizard: Step 1 (Classification selector), Step 2 (Form details)
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [formTicketType, setFormTicketType] = useState<TicketType>('Incident');

  // WorkNote addition
  const [newNote, setNewNote] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  // Compute IT_AGENTS list dynamically based on registered users with agent or admin role
  const IT_AGENTS = React.useMemo(() => {
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

  const [sidebarAgentAssign, setSidebarAgentAssign] = useState('');

  React.useEffect(() => {
    if (selectedTicket) {
      setSidebarAgentAssign(selectedTicket.assignedAgent || (IT_AGENTS[0] || ''));
    }
  }, [selectedTicket?.id, IT_AGENTS]);
  
  // AI Analysis loading & state
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

  // New Ticket Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<TicketPriority>('Sedang');
  const [formCategory, setFormCategory] = useState<TicketCategory>('Software');
  const [formRequester, setFormRequester] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formLinkedAsset, setFormLinkedAsset] = useState('');

  // Helper styles for Ticket Types badge list
  const getTypeBadgeStyle = (type: TicketType) => {
    switch (type) {
      case 'Incident':
        return 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]';
      case 'Service Request':
        return 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]';
      case 'Problem':
        return 'bg-amber-50 text-amber-705 border-amber-200 text-[10px]';
      case 'Change Request (RFC)':
        return 'bg-purple-50 text-purple-700 border-purple-200 text-[10px]';
      case 'Access Request':
        return 'bg-teal-50 text-teal-700 border-teal-200 text-[10px]';
      case 'Information Request':
        return 'bg-cyan-50 text-cyan-710 border-cyan-200 text-[10px]';
      case 'Complaint / Feedback':
        return 'bg-pink-50 text-pink-700 border-pink-200 text-[10px]';
      case 'Project Request':
        return 'bg-emerald-50 text-emerald-705 border-emerald-200 text-[10px]';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 text-[10px]';
    }
  };

  // Role-based filtering:
  // - Admin Support (dispatcher) sees all tickets.
  // - Specialist Agent (Resolver, e.g. Budi Santoso) sees ONLY assigned tickets.
  // - Standard User (client) sees only their own requested bookings.
  const roleFilteredTickets = session.role === 'admin'
    ? (session.name === 'Admin Support'
        ? tickets
        : tickets.filter(t => t.assignedAgent && t.assignedAgent.toLowerCase().includes(session.name.toLowerCase())))
    : session.role === 'agent'
    ? tickets.filter(t => t.assignedAgent && t.assignedAgent.toLowerCase().includes(session.name.toLowerCase()))
    : tickets.filter(t => t.requester === session.name);

  // Filtering Tickets
  const filteredTickets = roleFilteredTickets.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.requester.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesType = ticketTypeFilter === 'all' || t.ticketType === ticketTypeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesType;
  });

  // Handle Create Ticket
  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRequester = session.role === 'user' ? session.name : formRequester;
    const finalEmail = session.role === 'user' ? session.email : (formEmail || `${finalRequester.toLowerCase().replace(/\s+/g, '.')}@company.com`);
    const finalDept = session.role === 'user' ? session.department : (formDept || 'Umum');

    if (!formTitle.trim() || !formDesc.trim() || !finalRequester.trim()) {
      alert('Sila isi semua bidang wajib (Judul, Deskripsi, Nama Pelapor)');
      return;
    }

    const nextIdNum = tickets.length + 1;
    const newId = `INC-2026-${String(nextIdNum).padStart(3, '0')}`;
    const now = new Date().toISOString();
    
    // Set SLA Target Date looking up master policies if possible, falling back to standard presets
    const currentYear = new Date().getFullYear();
    const resolvedPriorityCode = (
      formPriority === 'Urgent' ? 'p1' : 
      formPriority === 'Tinggi' ? 'p2' : 
      formPriority === 'Sedang' ? 'p3' : 'p4'
    );

    const matchedPolicy = 
      slaPolicies.find(p => p.effectiveYear === currentYear && p.priorityCode.toLowerCase() === resolvedPriorityCode) ||
      slaPolicies.find(p => p.category.toLowerCase() === formCategory.toLowerCase() && p.priorityCode.toLowerCase() === resolvedPriorityCode) ||
      slaPolicies.find(p => p.priorityCode.toLowerCase() === resolvedPriorityCode);

    const hoursToTarget = matchedPolicy 
      ? matchedPolicy.targetResolutionHours 
      : (formPriority === 'Urgent' ? 2 : 
         formPriority === 'Tinggi' ? 4 : 
         formPriority === 'Sedang' ? 8 : 24);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hoursToTarget);

    const newInc: Ticket = {
      id: newId,
      title: formTitle,
      description: formDesc,
      priority: formPriority,
      status: 'Baru',
      category: formCategory,
      ticketType: formTicketType,
      requester: finalRequester,
      requesterEmail: finalEmail,
      department: finalDept,
      assignedAgent: '',
      createdAt: now,
      updatedAt: now,
      slaDeadline: deadline.toISOString(),
      linkedAssetId: formLinkedAsset || undefined,
      workNotes: [
        {
          id: `system-${Date.now()}`,
          author: 'Sistem Portal',
          text: `Tiket baru dengan tipe "${formTicketType}" berhasil diajukan dengan prioritas ${formPriority}. SLA waktu respons dimulai di target ${hoursToTarget} jam.`,
          createdAt: now,
          type: 'system'
        }
      ]
    };

    onAddTicket(newInc);
    setShowAddModal(false);
    setModalStep(1); // reset step for next open
    
    // Reset Form
    setFormTitle('');
    setFormDesc('');
    setFormPriority('Sedang');
    setFormCategory('Software');
    setFormRequester('');
    setFormEmail('');
    setFormDept('');
    setFormLinkedAsset('');
  };

  // Add Comment/WorkNote
  const handleAddNote = (type: 'comment' | 'status_change') => {
    if (!selectedTicket || !newNote.trim()) return;

    const updatedInc: Ticket = { ...selectedTicket };
    const now = new Date().toISOString();
    
    const noteObj = {
      id: `note-${Date.now()}`,
      author: 'Agen Helpdesk TI',
      text: newNote,
      createdAt: now,
      type
    };

    updatedInc.workNotes = [...updatedInc.workNotes, noteObj];
    updatedInc.updatedAt = now;

    onUpdateTicket(updatedInc);
    setSelectedTicket(updatedInc);
    setNewNote('');
  };

  // Update Status Transition
  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    const updatedInc: Ticket = { ...selectedTicket };
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
      !selectedTicket.assignedAgent ? ` Tiket dialokasikan ke agen ${defaultAgent}.` : ''
    }`;

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-${Date.now()}`,
        author: 'Sistem Portal',
        text: noteText,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
    setSelectedTicket(updatedInc);
  };

  // Assign agent explicitly inside IncidentsTab
  const handleAssignAgent = (agentName: string) => {
    if (!selectedTicket) return;

    const updatedInc: Ticket = { ...selectedTicket };
    const now = new Date().toISOString();
    const prevStatus = updatedInc.status;
    const prevAgent = updatedInc.assignedAgent;

    updatedInc.assignedAgent = agentName;
    updatedInc.status = 'Ditugaskan';
    updatedInc.updatedAt = now;

    let logText = `Tiket ditugaskan ke agen spesialis: ${agentName}.`;
    if (prevStatus === 'Baru') {
      logText = `Tiket baru berhasil diverifikasi dan dialokasikan ke agen spesialis: ${agentName}. Status berpindah dari "Baru" menjadi "Ditugaskan".`;
    } else if (prevAgent && prevAgent !== agentName) {
      logText = `Tiket dialihkan (re-assigned) dari "${prevAgent}" ke agen spesialis baru: ${agentName}. Status diatur ulang ke "Ditugaskan".`;
    }

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-assign-${Date.now()}`,
        author: 'Sistem Portal',
        text: logText,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
    setSelectedTicket(updatedInc);
  };

  // Reopen ticket inside IncidentsTab
  const handleReopenTicket = () => {
    if (!selectedTicket) return;

    const updatedInc: Ticket = { ...selectedTicket };
    const now = new Date().toISOString();

    updatedInc.status = 'Sedang Diproses';
    updatedInc.updatedAt = now;

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-reopen-${Date.now()}`,
        author: 'Sistem Portal',
        text: `Tiket insiden dibuka kembali (Re-opened) oleh administrator agar ditinjau kembali.`,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
    setSelectedTicket(updatedInc);
  };

  // Update Ticket Priority
  const handlePriorityChange = (newPriority: TicketPriority) => {
    if (!selectedTicket) return;

    const updatedInc: Ticket = { ...selectedTicket };
    const now = new Date().toISOString();
    const prevPriority = updatedInc.priority;

    updatedInc.priority = newPriority;
    updatedInc.updatedAt = now;

    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-prio-${Date.now()}`,
        author: 'Sistem Portal',
        text: `Prioritas tingkat urgensi diubah dari "${prevPriority}" menjadi "${newPriority}".`,
        createdAt: now,
        type: 'system'
      }
    ];

    onUpdateTicket(updatedInc);
    setSelectedTicket(updatedInc);
  };

  // Submit Resolution
  const handleResolveTicket = (resolutionText: string) => {
    if (!selectedTicket) return;
    if (!resolutionText.trim()) {
      alert('Sila isi teks resolusi sebelum menyelesaikan tiket.');
      return;
    }

    const updatedInc: Ticket = { ...selectedTicket };
    const now = new Date().toISOString();

    updatedInc.status = 'Selesai';
    updatedInc.resolutionNotes = resolutionText;
    updatedInc.updatedAt = now;
    updatedInc.workNotes = [
      ...updatedInc.workNotes,
      {
        id: `sys-res-${Date.now()}`,
        author: 'Sistem Portal',
        text: `Insiden telah ditandai Selesai. Catatan resolusi diposting.`,
        createdAt: now,
        type: 'status_change'
      }
    ];

    onUpdateTicket(updatedInc);
    setSelectedTicket(updatedInc);
    setNewNote('');
    setAiAnalysis(null);
  };

  // Trigger Gemini AI Smart Analysis
  const handleAiAnalyze = async () => {
    if (!selectedTicket) return;
    
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
          title: selectedTicket.title,
          description: selectedTicket.description,
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
        setAiError('Kunci API Gemini terdeteksi kosong. Aktifkan Gemini API Key Anda dari panel Secrets/Setelan AI Studio.');
      } else {
        setAiError(err.message || 'Sistem gagal menghubungi Co-pilot analisis Gemini. Pastikan koneksi server aktif.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quick Apply AI Resolution Draft
  const applyAiResolutionNotes = () => {
    if (!aiAnalysis) return;
    setNewNote(`Resolusi Rekomendasi AI:\n\n${aiAnalysis.draftResolutionText}`);
  };

  return (
    <div className="space-y-6" id="tickets-tab-interface">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari ID, judul insiden, penjelasan, atau nama pelapor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-400"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Ticket Type Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-600">
            <span className="hidden sm:inline">Jenis:</span>
            <select
              value={ticketTypeFilter}
              onChange={(e) => setTicketTypeFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1 cursor-pointer font-bold"
            >
              <option value="all">Semua Jenis</option>
              <option value="Incident">Incident</option>
              <option value="Service Request">Service Request</option>
              <option value="Problem">Problem</option>
              <option value="Change Request (RFC)">Change Request (RFC)</option>
              <option value="Access Request">Access Request</option>
              <option value="Information Request">Information Request</option>
              <option value="Complaint / Feedback">Complaint / Feedback</option>
              <option value="Project Request">Project Request</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-600">
            <span className="hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Baru">Baru</option>
              <option value="Ditugaskan">Ditugaskan</option>
              <option value="Sedang Diproses">Sedang Diproses</option>
              <option value="Ditangguhkan">Ditangguhkan</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-600">
            <span className="hidden sm:inline">Prioritas:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Urgent">Urgent</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-600">
            <span className="hidden sm:inline">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Jaringan">Jaringan</option>
              <option value="Akses & Akun">Akses & Akun</option>
              <option value="Sistem & Cloud">Sistem & Cloud</option>
            </select>
          </div>

          {/* New Ticket Button */}
          <button
            onClick={() => {
              setModalStep(1);
              setShowAddModal(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center shadow-sm cursor-pointer ml-auto"
          >
            <Plus size={16} />
            Mulai Melaporkan
          </button>
        </div>
      </div>

      {/* Main Container: Incident Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Incident Table/Cards List (Left 2 Col or Full Width) */}
        <div className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 ${
          showSidebar ? 'lg:col-span-2' : 'lg:col-span-3'
        }`}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {session.role === 'agent' || (session.role === 'admin' && session.name !== 'Admin Support') ? 'Tiket Tugas Saya' : 'Daftar Penanganan Insiden TI'} ({filteredTickets.length})
              </h3>
              {(session.role === 'agent' || (session.role === 'admin' && session.name !== 'Admin Support')) && (
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider">
                  ⚠️ Mode Agen: {session.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSidebar(prev => !prev)}
                className="text-[11px] font-bold text-slate-600 bg-slate-105 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                {showSidebar ? (
                  <>
                    <X size={12} className="text-slate-500" />
                    Sembunyikan Panel Samping
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                    Tampilkan Panel Samping (Ringkas)
                  </>
                )}
              </button>
              <span className="hidden md:inline text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">
                &bull; Klick Baris Untuk Detail
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {filteredTickets.map((t) => {
              const dateObj = new Date(t.createdAt);
              const isResolved = t.status === 'Selesai';
              
              // Priority badge custom colors
              const prioColor = 
                t.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-100' :
                t.priority === 'Tinggi' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                t.priority === 'Sedang' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                'bg-slate-50 text-slate-600 border-slate-100';

              // Status badge custom colors
              const statusColor = 
                t.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                t.status === 'Sedang Diproses' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse' :
                t.status === 'Baru' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                'bg-slate-50 text-slate-600 border-slate-100';

              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    setSelectedTicket(t);
                    setAiAnalysis(null);
                    setAiError(null);
                    // Open popup directly if sidebar is closed (default)
                    if (!showSidebar) {
                      onViewTicketDetail?.(t);
                    }
                  }}
                  onDoubleClick={() => onViewTicketDetail?.(t)}
                  title="Klik untuk detail tiket"
                  className={`px-5 py-4 hover:bg-slate-50/70 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${
                    selectedTicket?.id === t.id ? 'bg-indigo-50/40 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap pb-1">
                      <span className="font-mono text-[11px] font-bold text-slate-500 mr-1">{t.id}</span>
                      <span className={`text-[10px] uppercase font-bold border rounded-md px-2 py-0.5 ${getTypeBadgeStyle(t.ticketType || 'Incident')}`}>
                        {t.ticketType || 'Incident'}
                      </span>
                      <span className={`text-[10px] uppercase font-bold border rounded-md px-2 py-0.5 ${prioColor}`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 font-medium">
                        {t.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {t.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {t.requester} ({t.department})
                      </span>
                      <span>•</span>
                      <span>{dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusColor}`}>
                      {t.status}
                    </span>
                    <ArrowRight size={14} className="text-slate-300" />
                  </div>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="px-5 py-12 text-center text-slate-400">
                <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-medium">Tiket insiden tidak ditemukan.</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau tipe filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Peak Drawer / Intelligent Copilot (Right 1 Col) */}
        {showSidebar && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between transition-all">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-sans text-left">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu size={18} className="text-indigo-600 animate-pulse" />
                Ringkasan Informasi Utama
              </h3>
              {selectedTicket && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                  {selectedTicket.id}
                </span>
              )}
            </div>

            {selectedTicket ? (
              <div className="p-5 space-y-4 flex-1">
                {/* Primary CTA button to open full Popup */}
                <button
                  type="button"
                  onClick={() => onViewTicketDetail?.(selectedTicket)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer border border-indigo-700/10 active:scale-98"
                >
                  <Sparkles size={14} className="animate-spin text-indigo-150" style={{ animationDuration: '4s' }} />
                  Interaksi & Detail Lengkap (Popup)
                </button>

                {/* Simplified Card */}
                <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-gradient-to-b from-indigo-50/10 to-transparent shadow-3xs text-left">
                  <div className="border-b border-slate-105/60 pb-2 flex justify-between items-center gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">ID & Jenis</p>
                      <p className="text-[11px] font-bold text-slate-800">{selectedTicket.id} • {selectedTicket.ticketType || 'Incident'}</p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold border rounded-md px-2 py-0.5 whitespace-nowrap ${
                      selectedTicket.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      selectedTicket.priority === 'Tinggi' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      selectedTicket.priority === 'Sedang' ? 'bg-slate-105 text-slate-705 border-slate-205' :
                      'bg-slate-50 text-slate-505 border-slate-105'
                    }`}>
                      {selectedTicket.priority}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">Judul Pelaporan</p>
                    <h4 className="text-xs font-black text-slate-900 leading-snug">{selectedTicket.title}</h4>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">Ringkasan Deskripsi Masalah</p>
                    <p className="text-xs text-slate-600 leading-relaxed max-h-18 overflow-y-auto font-sans pr-1">
                      {selectedTicket.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/60 text-[11px] font-semibold">
                    <div>
                      <p className="text-[10px] text-slate-450 font-extrabold uppercase font-mono">PELAPOR</p>
                      <p className="font-extrabold text-slate-800 truncate">{selectedTicket.requester}</p>
                      <p className="text-[10px] text-slate-400 truncate font-normal">{selectedTicket.department}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-455 font-extrabold uppercase font-mono">ASISTEN TI</p>
                      <p className="font-extrabold text-slate-855 truncate">{selectedTicket.assignedAgent || 'Menunggu Agen'}</p>
                    </div>
                  </div>
                </div>

                {/* Quick SLA Status */}
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-xs space-y-1 text-left">
                  <p className="text-[10px] text-slate-450 font-extrabold uppercase font-mono flex items-center gap-1">
                    <Clock size={11} />
                    SLA Deadline Limit
                  </p>
                  <p className="font-bold text-slate-750">
                    {new Date(selectedTicket.slaDeadline).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <HelpCircle className="text-slate-350 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-600">Belum Ada Tiket Terpilih</p>
                <p className="text-[10.5px]/[14px] text-slate-400 mt-1 max-w-xs font-medium font-sans">
                  Silakan pilih salah satu tiket insiden di sebelah kiri untuk melihat ringkasan singkat parameter di sini atau membukanya di popup.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Original Verbose Detailed View (Deactivated/Hidden to avoid clutter) */}
        {false && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-sans">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu size={18} className="text-indigo-600" />
              {session.role === 'admin' || session.role === 'agent' ? 'Tindakan Agen & AI Co-pilot' : 'Status Pelaporan & Interaksi'}
            </h3>
            {selectedTicket && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                {selectedTicket.id}
              </span>
            )}
          </div>

          {selectedTicket ? (
            <div className="p-5 space-y-6 flex-1 overflow-y-auto max-h-[600px]">
              
              {/* Ticket Summary Card */}
              <div className="border border-slate-100 rounded-lg p-3.5 space-y-3 bg-indigo-50/10">
                <div className="flex items-center justify-between border-b border-slate-100/50 pb-2 flex-wrap gap-2">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Judul Pelaporan</p>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{selectedTicket.title}</h4>
                  </div>
                  <span className={`text-[10px] uppercase font-bold border rounded-md px-2 py-0.5 self-start ${getTypeBadgeStyle(selectedTicket.ticketType || 'Incident')}`}>
                    {selectedTicket.ticketType || 'Incident'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Deskripsi</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap mt-0.5 leading-relaxed">{selectedTicket.description}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Pelapor & Kontak</p>
                  <p className="text-xs text-slate-700 font-semibold">{selectedTicket.requester} [ {selectedTicket.department} ] • <span className="font-mono text-slate-500 font-normal">{selectedTicket.requesterEmail}</span></p>
                </div>
                {selectedTicket.linkedAssetId && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">CI Aset Terkait: </span>
                    <span className="text-xs font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      {selectedTicket.linkedAssetId}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Update Controls */}
              <div className="space-y-4 border-t border-slate-105 pt-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Cpu size={14} className="text-indigo-600 animate-pulse" />
                  Alur Kerja & Kontrol TI
                </h4>
                {(session.role === 'admin' || session.role === 'agent') ? (
                  <div className="space-y-3.5 text-left border border-slate-100 p-3 rounded-lg bg-indigo-50/5">
                    {(() => {
                      const isAdmin = session.role === 'admin';
                      const isDispatcher = session.name === 'Admin Support';
                      const isDirectlyAssigned = !!(selectedTicket.assignedAgent && selectedTicket.assignedAgent.toLowerCase() !== 'unassigned' && selectedTicket.assignedAgent.toLowerCase().includes(session.name.toLowerCase()));
                      const isUnassigned = !selectedTicket.assignedAgent || selectedTicket.assignedAgent.trim() === '' || selectedTicket.assignedAgent.toLowerCase() === 'unassigned';
                      const isITStaff = session.role === 'admin' || session.role === 'agent';
                      const isAssignedToMe = isDirectlyAssigned || isITStaff;
                      const canAssignOrForward = isAdmin || isUnassigned || isITStaff;
                      
                      return (
                        <>
                          {/* A. PRIORITAS - READ-ONLY TO PRESERVE USER SLA */}
                          <div>
                            <label className="block text-[10px] text-slate-400 font-extrabold uppercase font-mono mb-1">
                              Prioritas Insiden (SLA Tetap)
                            </label>
                            <div className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 select-none flex items-center justify-between">
                              <span>
                                {selectedTicket.priority === 'Urgent' && '🚗 Urgent (P1)'}
                                {selectedTicket.priority === 'Tinggi' && '⚡ Tinggi (P2)'}
                                {selectedTicket.priority === 'Sedang' && '☕ Sedang (P3)'}
                                {selectedTicket.priority === 'Rendah' && '💤 Rendah (P4)'}
                              </span>
                              <span className="text-[10px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-black">
                                SLA DIKUNCI
                              </span>
                            </div>
                          </div>

                          {/* B. DETIL PENUGASAN (ASSIGN AGENT BLOCK) */}
                          {selectedTicket.status !== 'Selesai' && (
                            <div className="border-t border-slate-100/50 pt-2.5">
                              <label className="block text-[10px] text-slate-400 font-extrabold uppercase font-mono mb-1 flex items-center justify-between">
                                <span>Tim / Agen IT Penanggungjawab</span>
                                {isAdmin && (
                                  <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1 rounded font-bold lowercase">
                                    akses admin aktif
                                  </span>
                                )}
                              </label>
                              <div className="flex gap-1.5 flex-nowrap">
                                <select
                                  value={sidebarAgentAssign}
                                  onChange={(e) => setSidebarAgentAssign(e.target.value)}
                                  disabled={!canAssignOrForward}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 focus:border-indigo-500 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                >
                                  {IT_AGENTS.map((agent) => (
                                    <option key={agent} value={agent}>{agent}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAssignAgent(sidebarAgentAssign)}
                                  disabled={!canAssignOrForward}
                                  className={`font-extrabold text-[11px] px-2.5 py-1.5 rounded transition whitespace-nowrap flex items-center justify-center gap-1 shadow-3xs ${
                                    canAssignOrForward
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  <Send size={11} />
                                  {selectedTicket.status === 'Baru' ? 'Tugaskan' : 'Sapa/Alih'}
                                </button>
                              </div>
                              <div className="text-[10px] text-indigo-700 font-medium italic mt-1 flex items-center gap-1">
                                <span className="font-bold text-slate-400">Aktif:</span>
                                {selectedTicket.assignedAgent || 'Menunggu Penugasan'}
                              </div>
                            </div>
                          )}

                          {/* C. STATUS TRANSITIONS OPERATIONAL */}
                          {selectedTicket.status !== 'Selesai' && (
                            <div className="border-t border-slate-100/50 pt-2.5 space-y-2">
                              <label className="block text-[10px] text-slate-400 font-extrabold uppercase font-mono flex items-center justify-between">
                                <span>Tindakan Operasional</span>
                                {!isAssignedToMe && selectedTicket.assignedAgent && (
                                  <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded font-bold lowercase">
                                    khusus agen penugasan
                                  </span>
                                )}
                              </label>
                              
                              <div className="flex gap-2">
                                {selectedTicket.status === 'Ditugaskan' && (
                                  isAssignedToMe ? (
                                    <button
                                      onClick={() => handleStatusChange('Sedang Diproses')}
                                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded text-xs py-1.5 px-2.5 font-bold transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                                    >
                                      <RefreshCw size={11} className="animate-spin" />
                                      Mulai Kerja (Proses)
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="w-full bg-slate-100 text-slate-400 border border-slate-200/60 rounded text-xs py-1.5 px-2.5 font-bold transition flex items-center justify-center gap-1.5 cursor-not-allowed"
                                      title="Tombol mulai kerja hanya dapat diaktifkan oleh IT yang mendapatkan tugas."
                                    >
                                      <Lock size={11} />
                                      Mulai Kerja (Hanya Untuk Agen)
                                    </button>
                                  )
                                )}

                                {selectedTicket.status === 'Sedang Diproses' && (
                                  isAssignedToMe ? (
                                    <button
                                      onClick={() => handleStatusChange('Ditangguhkan')}
                                      className="w-full bg-amber-500 hover:bg-amber-450 border border-transparent text-white rounded text-xs py-1.5 px-2.5 font-bold transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                                    >
                                      <AlertCircle size={11} />
                                      Tangguhkan (On Hold)
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="w-full bg-slate-100 text-slate-400 border border-slate-200/60 rounded text-xs py-1.5 px-2.5 font-bold transition flex items-center justify-center gap-1.5 cursor-not-allowed"
                                    >
                                      <Lock size={11} />
                                      Tangguhkan (On Hold)
                                    </button>
                                  )
                                )}

                                {selectedTicket.status === 'Ditangguhkan' && (
                                  isAssignedToMe ? (
                                    <button
                                      onClick={() => handleStatusChange('Sedang Diproses')}
                                      className="w-full bg-indigo-600 hover:bg-indigo-550 text-white rounded text-xs py-1.5 px-2.5 font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                                    >
                                      <RefreshCw size={11} />
                                      Lanjutkan Proses
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="w-full bg-slate-100 text-slate-400 border border-slate-200/60 rounded text-xs py-1.5 px-2.5 font-bold transition flex items-center justify-center gap-1.5 cursor-not-allowed"
                                    >
                                      <Lock size={11} />
                                      Lanjutkan Proses
                                    </button>
                                  )
                                )}
                              </div>

                              {/* Selesaikan Tiket Section inside Sidebar */}
                              {selectedTicket.status === 'Sedang Diproses' && (
                                <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 font-bold uppercase font-mono flex items-center justify-between">
                                    <span>Penyelesaian Solusi (Resolusi)</span>
                                    {!isAssignedToMe && (
                                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded font-bold lowercase">
                                        khusus agen
                                      </span>
                                    )}
                                  </label>
                                  <div className="flex flex-col gap-1.5">
                                    <textarea
                                      placeholder={
                                        isAssignedToMe 
                                          ? "Tulis solusi troubleshooting perbaikan..."
                                          : "Hanya Agen Ditugaskan yang dapat menerbitkan resolusi."
                                      }
                                      disabled={!isAssignedToMe}
                                      id="sidebar-resolution-input"
                                      rows={2}
                                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:outline-none rounded text-xs p-1.5 text-slate-800 font-medium placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const textEl = document.getElementById('sidebar-resolution-input') as HTMLTextAreaElement;
                                        if (textEl && textEl.value.trim()) {
                                          handleResolveTicket(textEl.value);
                                          textEl.value = '';
                                        } else {
                                          alert('Sila isi teks resolusi sebelum menyelesaikan tiket.');
                                        }
                                      }}
                                      disabled={!isAssignedToMe}
                                      className={`w-full font-extrabold text-xs py-1.5 rounded transition flex items-center justify-center gap-1 shadow-3xs ${
                                        isAssignedToMe
                                          ? 'bg-emerald-600 hover:bg-emerald-555 text-white cursor-pointer'
                                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      }`}
                                    >
                                      <CheckCircle2 size={12} />
                                      Selesaikan & Tutup Tiket
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* D. REOPEN ACTION */}
                          {selectedTicket.status === 'Selesai' && (
                            <div className="space-y-2 text-center p-2 bg-emerald-50/50 border border-emerald-100 rounded">
                              <p className="text-[11px] text-slate-600 leading-snug">
                                Tiket telah bertanda <span className="font-bold text-emerald-700">Selesai</span>. Klik tombol di bawah jika perlu dibuka kembali.
                              </p>
                              <button
                                type="button"
                                onClick={handleReopenTicket}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-2 rounded text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <RefreshCw size={11} />
                                Buka Kembali Tiket (Re-open)
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Progress Tracker Timeline */}
                    <div className="relative pt-2 pb-1">
                      <div className="absolute top-[21px] left-3 right-3 h-0.5 bg-slate-150"></div>
                      <div className="absolute top-[21px] left-3 h-0.5 bg-indigo-600 transition-all duration-500" style={{
                        width: 
                          selectedTicket.status === 'Baru' ? '0%' :
                          selectedTicket.status === 'Ditugaskan' ? '33%' :
                          selectedTicket.status === 'Sedang Diproses' ? '66%' :
                          selectedTicket.status === 'Ditangguhkan' ? '50%' : '100%'
                      }}></div>
                      
                      <div className="relative flex justify-between text-center">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                            ['Baru', 'Ditugaskan', 'Sedang Diproses', 'Ditangguhkan', 'Selesai'].includes(selectedTicket.status)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-black'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}>1</span>
                          <span className="text-[10px] font-bold text-slate-600 mt-1">Baru</span>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                            ['Ditugaskan', 'Sedang Diproses', 'Ditangguhkan', 'Selesai'].includes(selectedTicket.status)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-black'
                              : selectedTicket.status === 'Ditangguhkan' ? 'bg-amber-500 border-amber-500 text-white font-black' : 'bg-white border-slate-200 text-slate-400'
                          }`}>2</span>
                          <span className="text-[10px] font-bold text-slate-600 mt-1">Diproses</span>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                            selectedTicket.status === 'Selesai'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-black'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}>3</span>
                          <span className="text-[10px] font-bold text-slate-600 mt-1">Selesai</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata indicators */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-left">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Severitas Masalah</p>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          {selectedTicket.priority === 'Urgent' ? '🚗 Urgent' :
                           selectedTicket.priority === 'Tinggi' ? '⚡ Tinggi' :
                           selectedTicket.priority === 'Sedang' ? '☕ Sedang' : '💤 Rendah'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Petugas Penjawab TI</p>
                        <p className="text-xs font-bold text-slate-800 mt-[3px]">
                          {selectedTicket.assignedAgent || 'Menunggu Penugasan'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Gemini Co-pilot Triage Integration */}
              {(session.role === 'admin' || session.role === 'agent') && (
                <div className="border border-slate-200/60 rounded-xl p-4 bg-teal-50/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#113115]">
                      <Sparkles className="text-teal-600 shrink-0 fill-teal-100" size={16} />
                      Gemini AI Triage & Suggestion
                    </div>
                    <button
                      onClick={handleAiAnalyze}
                      disabled={isAiLoading}
                      className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {isAiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {aiAnalysis ? 'Ulang Cerita' : 'Analisis AI'}
                    </button>
                  </div>

                  {isAiLoading && (
                    <div className="space-y-2 text-center py-4">
                      <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Gemini sedang merumuskan draf pemecahan masalah...</p>
                    </div>
                  )}

                  {aiError && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded text-xs text-red-700 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <AlertCircle size={14} />
                        Analisis AI Gagal
                      </p>
                      <p>{aiError}</p>
                    </div>
                  )}

                  {aiAnalysis && !isAiLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="space-y-3.5 text-xs leading-relaxed text-slate-700"
                    >
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">REKOMENDASI KATEGORI</p>
                          <p className="font-bold text-slate-800">{aiAnalysis.recommendedCategory}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">REKOMENDASI PRIORITAS</p>
                          <p className="font-bold text-slate-800">{aiAnalysis.recommendedPriority}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">PERKIRAAN PENYEBAB (ROOT CAUSE)</p>
                        <p className="font-semibold text-slate-800 italic">"{aiAnalysis.estimatedRootCause}"</p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">LANGKAH TROUBLESHOOTING</p>
                        <ul className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                          {aiAnalysis.suggestedSteps.map((step, idx) => (
                            <li key={idx} className="font-medium">{step}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                            <Mail size={12} />
                            Draf Teks Tanggapan Klien
                          </span>
                          <button
                            onClick={applyAiResolutionNotes}
                            className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                          >
                            Terapkan Draf
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 select-all font-sans italic line-clamp-4">
                          {aiAnalysis.draftResolutionText}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {!aiAnalysis && !isAiLoading && !aiError && (
                    <p className="text-xs text-slate-400 italic text-center py-2">
                      Gunakan kecerdasan buatan Gemini untuk auto-kategori, menemukan akar masalah, dan menulis draf perbaikan.
                    </p>
                  )}
                </div>
              )}

              {/* WorkNotes Timeline History */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Linimasa & Log Kejadian</h4>
                
                <div className="space-y-3">
                  {selectedTicket.workNotes.map((note) => {
                    const noteDate = new Date(note.createdAt);
                    
                    let cardBg = 'bg-slate-50';
                    let label = note.author;
                    if (note.type === 'system') { cardBg = 'bg-slate-100/50'; }
                    if (note.type === 'status_change') { cardBg = 'bg-yellow-50/20 border border-yellow-100/40'; }

                    return (
                      <div key={note.id} className={`p-2.5 rounded-lg text-xs ${cardBg} space-y-1`}>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{label}</span>
                          <span>{noteDate.toLocaleDateString('id-ID')} {noteDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{note.text}</p>
                      </div>
                    );
                  })}
                  
                  {selectedTicket.workNotes.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">Belum ada aktivitas terekam.</p>
                  )}
                </div>
              </div>

              {/* Add Note & Resolution Editor */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <textarea
                  placeholder={session.role === 'admin' || session.role === 'agent' ? "Ketik catatan teknis internal atau masukkan teks resolusi di sini..." : "Ketik pesan balasan atau tanggapan Anda di sini..."}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 p-2.5 rounded-lg text-xs border border-slate-100 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => handleAddNote('comment')}
                    disabled={!newNote.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded flex-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    Kirim Catatan
                  </button>
                  {(session.role === 'admin' || session.role === 'agent') && (
                    <button
                      onClick={() => handleResolveTicket(newNote)}
                      disabled={!newNote.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex-1 transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      Selesaikan Tiket
                    </button>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <HelpCircle className="text-slate-300 mb-2" size={36} />
              <p className="text-sm font-semibold text-slate-600">Tidak ada tiket terpilih</p>
              <p className="text-xs text-slate-400 mt-1">Silakan pilih salah satu tiket di sebelah kiri untuk menelaah isinya, menambah catatan teknis, atau memicu optimasi asisten AI.</p>
            </div>
          )}
        </div>
        )}

      </div>

      {/* --- ADD TICKET MODAL (HIGH FIDELITY MULTI-STEP WIZARD) --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden border border-slate-150 transition-all ${
                modalStep === 1 ? 'max-w-4xl' : 'max-w-2xl'
              }`}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="text-indigo-600" size={18} />
                    {modalStep === 1 
                      ? 'Portal Pelaporan & Permintaan Layanan TI Mandiri' 
                      : `Detail Pengisian: ${formTicketType}`
                    }
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {modalStep === 1 
                      ? 'Klasifikasikan tujuan pelaporan Anda sesuai panduan standard ITIL v4 di bawah ini' 
                      : `Langkah 2 dari 2: Lengkapi seluruh kolom wajib untuk pengajuan ${formTicketType}`
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 hover:bg-slate-100 rounded-lg transition"
                >
                  &times;
                </button>
              </div>

              {/* STEP 1: SELECT CLASSIFICATION TYPE */}
              {modalStep === 1 && (
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-[11px] text-slate-600 leading-normal">
                    <span className="font-bold text-slate-800">💡 Mengapa langkah ini penting?</span> Pemilihan jenis pengajuan yang tepat memastikan laporan Anda langsung terkirim ke tim helpdesk ahli yang tepat, menghemat waktu eskalasi, dan menetapkan SLA (Service Level Agreement) penyelesaian masalah dengan akurat.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {TICKET_TYPES_DATA.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <div
                          key={item.type}
                          onClick={() => {
                            setFormTicketType(item.type);
                            setModalStep(2);
                            // Preselect smart categories based on type
                            if (item.type === 'Access Request') {
                              setFormCategory('Akses & Akun');
                            } else if (item.type === 'Incident') {
                              setFormCategory('Software');
                            } else if (item.type === 'Change Request (RFC)') {
                              setFormCategory('Sistem & Cloud');
                              setFormPriority('Sedang');
                            }
                          }}
                          className={`p-3.5 border rounded-xl transition text-left cursor-pointer flex flex-col justify-between h-full bg-white hover:bg-indigo-50/5 hover:shadow-md ${item.colorClass}`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg bg-white shadow-xs shrink-0 border border-slate-100 ${item.iconColor}`}>
                                <IconComp size={16} />
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                                {item.type}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                              {item.definition}
                            </p>
                          </div>
                          <div className="mt-4 pt-2 border-t border-slate-100/40 text-[10.5px] text-slate-500">
                            <span className="font-semibold text-slate-700 block mb-0.5">Contoh Layanan/Masalah:</span>
                            <span className="italic leading-normal">{item.example}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS FORM FOR THE SELECTED TYPE */}
              {modalStep === 2 && (
                <form onSubmit={handleSubmitTicket} className="flex flex-col">
                  {/* Back Navigation Banner */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      Kembali Pilih Jenis Pengajuan
                    </button>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-120 font-extrabold px-2 py-0.5 rounded font-mono">
                      {formTicketType}
                    </span>
                  </div>

                  {/* Form fields with custom labels and helper variables */}
                  {(() => {
                    // Helper logic to get current contextual text details
                    const formLabels = (() => {
                      switch (formTicketType) {
                        case 'Incident':
                          return {
                            titleLabel: 'Judul Insiden TI',
                            titlePlaceholder: 'Contoh: Gagal login ke Oracle EBS atau VPN mati',
                            descLabel: 'Kronologi Kendala & Gejala yang Terdeteksi',
                            descPlaceholder: 'Jelaskan pesan error yang muncul, sejak kapan terjadi, dan berapa staf yang terdampak...',
                          };
                        case 'Service Request':
                          return {
                            titleLabel: 'Subjek Permintaan Layanan',
                            titlePlaceholder: 'Contoh: Instalasi Figma Enterprise atau upgrade RAM laptop',
                            descLabel: 'Kelengkapan Spesifikasi / Persyaratan',
                            descPlaceholder: 'Sebutkan software/hardware yang diminta secara spesifik, alokasi anggaran (bila ada), dsb...',
                          };
                        case 'Problem':
                          return {
                            titleLabel: 'Identitas Kasus Investigasi (Problem)',
                            titlePlaceholder: 'Contoh: Koneksi internet sering putus-nyambung tiap jam 10 pagi',
                            descLabel: 'Ringkasan Gejala Masalah Berulang',
                            descPlaceholder: 'Jelaskan ringkasan log/insiden berulang yang memicu perlunya pelacakan akar masalah (root cause analysis) ini...',
                          };
                        case 'Change Request (RFC)':
                          return {
                            titleLabel: 'Judul Rencana Perubahan (RFC)',
                            titlePlaceholder: 'Contoh: Migrasi server database ke Kubernetes v1.28',
                            descLabel: 'Rencana Detail Langkah & Mitigasi Downtime',
                            descPlaceholder: 'Gambarkan rute eksekusi (rollback plan), jadwal jendela pemeliharaan, serta dampak downtime bisnis...',
                          };
                        case 'Access Request':
                          return {
                            titleLabel: 'Sistem yang Diminta Hak Aksesnya',
                            titlePlaceholder: 'Contoh: Otorisasi folder Sharepoint divisi Finance',
                            descLabel: 'Justifikasi Penggunaan Bisnis',
                            descPlaceholder: 'Tulis hak akses yang dibutuhkan (Read/Write/Admin), nama supervisor pemberi izin, serta alasan kebutuhan...',
                          };
                        case 'Information Request':
                          return {
                            titleLabel: 'Konsultasi / Informasi yang Dibutuhkan',
                            titlePlaceholder: 'Contoh: Menanyakan panduan backup NAS server lokal',
                            descLabel: 'Detail Pertanyaan / Konsultasi',
                            descPlaceholder: 'Uraikan secara jelas panduan atau dokumentasi sistem informasi apa yang Anda inginkan...',
                          };
                        case 'Complaint / Feedback':
                          return {
                            titleLabel: 'Subjek Keluhan / Saran Perbaikan',
                            titlePlaceholder: 'Contoh: Koneksi Wi-Fi Guest di ruang meeting sering lamban',
                            descLabel: 'Detail Kritik atau Masukan Konstruktif',
                            descPlaceholder: 'Silakan jembatani saran atau komplain Anda agar kami dapat terus memperbaiki standar pelayanan TI...',
                          };
                        case 'Project Request':
                          return {
                            titleLabel: 'Nama Inisiatif Pengembangan Sistem Baru',
                            titlePlaceholder: 'Contoh: Pembuatan modul absensi mandiri karyawan berbasis GPS',
                            descLabel: 'Gambaran Bisnis & Target Akhir Proyek',
                            descPlaceholder: 'Deskripsikan alur bisnis, target peluncuran, departemen utama pemakai, serta nilai tambah inisiatif tersebut...',
                          };
                        default:
                          return {
                            titleLabel: 'Judul Tiket Pelaporan',
                            titlePlaceholder: 'Tulis subjek laporan Anda...',
                            descLabel: 'Penjelasan Lengkap Masalah',
                            descPlaceholder: 'Tulis rincian deskripsi pengajuan Anda di sini...',
                          };
                      }
                    })();

                    return (
                      <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Title */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              {formLabels.titleLabel} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder={formLabels.titlePlaceholder}
                              value={formTitle}
                              onChange={(e) => setFormTitle(e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder-slate-400"
                            />
                          </div>

                          {/* Description */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              {formLabels.descLabel} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              placeholder={formLabels.descPlaceholder}
                              value={formDesc}
                              onChange={(e) => setFormDesc(e.target.value)}
                              required
                              rows={4}
                              className="w-full bg-slate-50 border border-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder-slate-400"
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Masalah</label>
                            <select
                              value={formCategory}
                              onChange={(e) => setFormCategory(e.target.value as TicketCategory)}
                              className="w-full bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="Hardware">Hardware</option>
                              <option value="Software">Software</option>
                              <option value="Jaringan">Jaringan</option>
                              <option value="Akses & Akun">Akses & Akun</option>
                              <option value="Sistem & Cloud">Sistem & Cloud</option>
                            </select>
                          </div>

                          {/* Priority */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Severitas / Urgensi</label>
                            <select
                              value={formPriority}
                              onChange={(e) => setFormPriority(e.target.value as TicketPriority)}
                              className="w-full bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="Urgent">Urgent (Sistem Lumpuh)</option>
                              <option value="Tinggi">Tinggi (Menghambat Kerja)</option>
                              <option value="Sedang">Sedang (Ada Alternatif)</option>
                              <option value="Rendah">Rendah (Kosmetik / Pertanyaan)</option>
                            </select>
                          </div>

                          {/* Requester */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              Nama Pelapor / Karyawan <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Kevin Sanjaya"
                              value={session.role === 'user' ? session.name : formRequester}
                              onChange={(e) => setFormRequester(e.target.value)}
                              disabled={session.role === 'user'}
                              required
                              className="w-full bg-slate-50 border border-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>

                          {/* Department */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Departemen / Divisi</label>
                            <input
                              type="text"
                              placeholder="Contoh: Finance, Operation, HRD"
                              value={session.role === 'user' ? session.department : formDept}
                              onChange={(e) => setFormDept(e.target.value)}
                              disabled={session.role === 'user'}
                              className="w-full bg-slate-50 border border-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Email Kantor</label>
                            <input
                              type="email"
                              placeholder="nama@company.com"
                              value={session.role === 'user' ? session.email : formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              disabled={session.role === 'user'}
                              className="w-full bg-slate-50 border border-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>

                          {/* Link Asset CMDB */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Kaitkan Aset CMDB</label>
                            <select
                              value={formLinkedAsset}
                              onChange={(e) => setFormLinkedAsset(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-700 cursor-pointer"
                            >
                              <option value="">-- Tanpa Aset --</option>
                              {assets.map(a => (
                                <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Submit Actions Button view */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddModal(false);
                              setModalStep(1);
                            }}
                            className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                          >
                            Kirim {formTicketType}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
