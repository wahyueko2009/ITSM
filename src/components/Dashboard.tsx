import React, { useMemo } from 'react';
import { Ticket, ChangeRequest, Asset, UserSession, SlaPolicy } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Ticket as TicketIcon, GitBranch, ShieldAlert, Cpu, CheckCircle2, 
  Clock, AlertTriangle, BookOpen, Sparkles, Activity, ShieldCheck
} from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
  changes: ChangeRequest[];
  assets: Asset[];
  setActiveTab: (tab: string) => void;
  session: UserSession;
  onViewTicketDetail?: (ticket: Ticket) => void;
  slaPolicies?: SlaPolicy[];
}

export default function Dashboard({ tickets, changes, assets, setActiveTab, session, onViewTicketDetail, slaPolicies = [] }: DashboardProps) {
  const isTechnical = session.role === 'admin' || session.role === 'agent';
  const isAdmin = session.role === 'admin';

  // Dynamically filter data based on user perspective
  const filteredTickets = useMemo(() => {
    if (session.role === 'admin') {
      return tickets;
    } else if (session.role === 'agent') {
      return tickets.filter(t => 
        t.assignedAgent && 
        t.assignedAgent.toLowerCase().includes(session.name.toLowerCase())
      );
    }
    return tickets.filter(t => t.requester === session.name);
  }, [tickets, session]);

  // Compute Stats
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter(t => t.status !== 'Selesai').length;
    const closed = filteredTickets.filter(t => t.status === 'Selesai').length;
    const urgent = filteredTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Selesai').length;
    
    // SLA Compliance: check against actual slaDeadline
    const nowStr = new Date().toISOString();
    let breachedCount = 0;
    filteredTickets.forEach(t => {
      if (t.status === 'Selesai') {
        const isBreached = t.updatedAt > t.slaDeadline;
        if (isBreached) breachedCount++;
      } else {
        const isBreached = nowStr > t.slaDeadline;
        if (isBreached) breachedCount++;
      }
    });
    const metCount = total - breachedCount;
    const slaRate = total > 0 ? Math.round((metCount / total) * 100) : 100;
    const finalSlaRate = Math.min(100, Math.max(0, slaRate));
    
    const activeAssets = assets.filter(a => a.status === 'Aktif').length;
    const pendingChanges = changes.filter(c => c.status === 'Menunggu Persetujuan').length;

    return { total, open, closed, urgent, slaRate: finalSlaRate, activeAssets, pendingChanges, breachedCount };
  }, [filteredTickets, assets, changes]);

  // Recharts: Priority Data
  const priorityData = useMemo(() => {
    const counts = { Urgent: 0, Tinggi: 0, Sedang: 0, Rendah: 0 };
    filteredTickets.forEach(t => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Jumlah Tiket': counts[key as keyof typeof counts],
    }));
  }, [filteredTickets]);

  // Recharts: Category Data
  const categoryData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredTickets.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
    }));
  }, [filteredTickets]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

  return (
    <div className="space-y-6" id="dashboard-tab-view">
      
      {/* Welcome Elegant Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="max-w-2xl text-left space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[10.5px] font-bold leading-none">
            Portal Layanan TI Mandiri
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight leading-normal">
            Selamat Datang Kembali, {session.name}
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed font-normal">
            {session.role === 'admin' 
              ? 'Kelola permintaan pengguna, telusuri inventaris aset TI, verifikasi rencana rilis (RFC), serta pantau penyelesaian kendala sistem dengan praktis dan efisien.'
              : session.role === 'agent'
              ? 'Tindak lanjuti insidien dan tiket yang ditugaskan kepada Anda, perbarui catatan teknis internal, dan selesaikan kendala pelanggan sesuai komitmen SLA.'
              : 'Gunakan portal untuk melaporkan kendala workstation, mengajukan permintaan perangkat keras/lunak baru, serta memantau progres tiket Anda.'
            }
          </p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <button 
              onClick={() => setActiveTab('incidents')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white"
            >
              <TicketIcon size={13} />
              {isTechnical ? 'Kelola Tiket' : 'Lapor Kendala'}
            </button>
            <button 
              onClick={() => setActiveTab('kb')}
              className="px-3.5 py-1.5 bg-slate-805 hover:bg-slate-700/80 rounded-lg text-xs font-bold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer text-slate-300"
            >
              <BookOpen size={13} />
              Cari Solusi Mandiri
            </button>
          </div>
        </div>

        {/* Dynamic Badge */}
        <div className="bg-slate-950/30 p-3.5 rounded-lg border border-slate-800/80 flex items-center gap-3 self-start md:self-center">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            session.role === 'admin' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/50' : 
            session.role === 'agent' ? 'bg-amber-950 text-amber-400 border border-amber-900/50' : 'bg-slate-9af text-slate-400 border border-slate-805'
          }`}>
            {session.role === 'admin' ? <ShieldCheck size={18} /> : session.role === 'agent' ? <ShieldCheck size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="text-left">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Hak Akses</span>
            <p className="text-xs font-bold text-slate-200">
              {session.role === 'admin' ? 'Administrator' : session.role === 'agent' ? 'IT Support Agent' : 'Karyawan Umum'}
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{session.department}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isTechnical ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-counter-grid">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Tiket Aktif
              </p>
              <p className="text-2xl font-bold text-slate-950 leading-none">{stats.open}</p>
              <p className="text-[10.5px] text-slate-505">dari {stats.total} total laporan</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 border border-blue-100/50">
              <TicketIcon size={20} />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tiket Selesai</p>
              <p className="text-2xl font-bold text-slate-950 leading-none">{stats.closed}</p>
              <p className="text-[10.5px] text-slate-505">berhasil diselesaikan</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100/50">
              <CheckCircle2 size={20} />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Urgensi Tinggi</p>
              <p className={`text-2xl font-bold leading-none ${stats.urgent > 0 ? 'text-rose-600' : 'text-slate-950'}`}>
                {stats.urgent}
              </p>
              <p className="text-[10.5px] text-slate-505">perlu tindakan cepat</p>
            </div>
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0 border border-rose-100/50">
              <ShieldAlert size={20} />
            </div>
          </div>

          {/* Card 4 (Role Specific) */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono font-bold">Persetujuan Perubahan</p>
              <p className="text-2xl font-bold text-slate-950 leading-none">{stats.pendingChanges}</p>
              <p className="text-[10.5px] text-slate-505">rencana RFC tertunda</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0 border border-purple-100/50">
              <GitBranch size={20} />
            </div>
          </div>

          {/* Card 5 - SLA Compliance status */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">SLA Pemenuhan</p>
              <p className={`text-2xl font-bold leading-none ${stats.slaRate < 80 ? 'text-amber-600' : 'text-emerald-650'}`}>
                {stats.slaRate}%
              </p>
              <p className="text-[10.5px]/[14px] text-slate-550 line-clamp-1 truncate max-w-[150px]">
                {stats.breachedCount > 0 ? `${stats.breachedCount} tiket breached` : 'Semua aman \uD83C\uDF89'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              stats.slaRate < 80 ? 'bg-amber-50 text-amber-500 border-amber-100/40' : 'bg-emerald-50 text-emerald-600 border-emerald-100/40'
            }`}>
              <Clock size={20} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-counter-grid-user">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Tiket Aktif Saya
              </p>
              <p className="text-3xl font-black text-indigo-600 leading-none">{stats.open}</p>
              <p className="text-[11px] text-slate-505 font-medium">Sedang diproses oleh tim IT Support</p>
            </div>
            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/50">
              <TicketIcon size={22} />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tiket Selesai Saya</p>
              <p className="text-3xl font-black text-emerald-600 leading-none">{stats.closed}</p>
              <p className="text-[11px] text-slate-505 font-medium">Berhasil terselesaikan</p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/50">
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-4 border border-slate-150/70 shadow-sm flex items-center justify-between">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Pemenuhan SLA Saya</p>
              <p className="text-3xl font-black text-rose-600 leading-none">{stats.slaRate}%</p>
              <p className="text-[11px] text-slate-505 font-medium">Sesuai komitmen waktu SLA</p>
            </div>
            <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0 border border-rose-100/50">
              <Clock size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout section */}
      {isTechnical ? (
        <div className="space-y-6">
          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-visualizer">
            {/* Priority Bar Chart */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm lg:col-span-2 text-left">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity size={18} className="text-slate-500" id="barchart-label-act" />
                  Severitas Distribusi Insiden TI
                </h3>
                <span className="text-xs bg-slate-150 px-2 py-0.5 rounded text-slate-600 font-mono font-medium">Barchart</span>
              </div>
              <div className="h-64 sm:h-80">
                {filteredTickets.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                    Belum ada data prioritas tiket.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#64748b" tickLine={false} />
                      <YAxis fontSize={11} stroke="#64748b" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        labelStyle={{ fontWeight: '700', color: '#1e293b', fontSize: '12px' }}
                      />
                      <Bar dataKey="Jumlah Tiket" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                        {priorityData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.name === 'Urgent' ? '#ef4444' : 
                              entry.name === 'Tinggi' ? '#f59e0b' : 
                              entry.name === 'Sedang' ? '#3b82f6' : '#10b981'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Kategori Layanan Populer */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between text-left">
              <div className="mb-4 border-b border-slate-50 pb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Cpu size={18} className="text-slate-500" />
                  Kategori Kendala Yang Dialami
                </h3>
                <p className="text-xs text-slate-550 mt-1">Pariwisata pengajuan kendala sistem</p>
              </div>
              <div className="h-44 relative flex items-center justify-center">
                {categoryData.length === 0 ? (
                  <div className="text-xs text-slate-400 font-bold">Tidak ada data tiket masuk</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              {/* Custom Legends */}
              <div className="space-y-1.5 mt-2 overflow-y-auto max-h-36">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs text-slate-650 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="truncate max-w-[150px]">{entry.name}</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900 shrink-0">{entry.value} Tiket</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Insights and Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-insights-bento">
            {/* Anti-slop clean Ticket queue */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={18} />
                  Antrean Insiden Penting & Kritis (Semua Pengguna)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-650 rounded uppercase tracking-wider font-mono">
                  GLOBAL QUEUE
                </span>
              </div>
              <div className="space-y-3 divide-y divide-slate-50">
                {filteredTickets.filter(t => (t.priority === 'Urgent' || t.priority === 'Tinggi') && t.status !== 'Selesai').slice(0, 5).map((t) => (
                  <div 
                    key={t.id} 
                    className="pt-3 first:pt-0 group flex justify-between items-start gap-4 hover:bg-slate-50/70 p-2 rounded-lg transition-all duration-200 cursor-pointer select-none"
                    onDoubleClick={() => onViewTicketDetail?.(t)}
                    title="Double-klik untuk membuka detail"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs text-slate-400 font-extrabold">{t.id}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold text-white uppercase ${t.priority === 'Urgent' ? 'bg-red-500' : 'bg-amber-500'}`}>
                          {t.priority}
                        </span>
                        <span className="text-[10px] bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.2 rounded text-indigo-700 font-bold">
                          {t.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                        {t.title}
                      </h4>
                      <p className="text-[10.5px] text-slate-500">
                        Status: <span className="font-bold text-indigo-600">{t.status}</span> 
                        <span className="text-slate-350 ml-1.5">Pelapor: {t.requester}</span>
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewTicketDetail?.(t);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer shrink-0 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition border border-indigo-100/50"
                    >
                      Detail
                    </button>
                  </div>
                ))}
                {filteredTickets.filter(t => (t.priority === 'Urgent' || t.priority === 'Tinggi') && t.status !== 'Selesai').length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6 font-medium leading-relaxed">
                    ✓ Bersih! Tidak ada pelaporan aktif tingkat kritis tinggi saat ini.
                  </div>
                )}
              </div>
            </div>

            {/* Change Request Timeline RFC (Admin only) */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                  <GitBranch className="text-indigo-600" size={18} />
                  Rencana Perubahan Terkini (RFC)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-wider font-mono">CAB Board</span>
              </div>
              <div className="space-y-3">
                {changes.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                      c.status === 'Selesai' ? 'bg-emerald-500' :
                      c.status === 'Menunggu Persetujuan' ? 'bg-amber-400 animate-pulse' :
                      c.status === 'Disetujui' ? 'bg-indigo-500' : 'bg-slate-300'
                    }`}></div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="font-mono text-xs text-slate-400 font-bold">{c.id}</span>
                        <span className="text-[10px] text-slate-505 font-mono font-semibold">{new Date(c.targetDate).toLocaleDateString('id-ID')}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{c.title}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-505 truncate mt-0.5">Pengusul: {c.requester}</p>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {changes.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6 font-medium leading-relaxed">Belum ada pengajuan RFC.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PERSPECTIVE FOR REGULAR USERS: Highly Simplified view clean, focusing on their reports */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-insights-bento-user">
          {/* User Ticket Direct View - Lists ALL of their personal tickets, very scannable */}
          <div className="bg-white rounded-xl p-5 border border-slate-150/70 shadow-sm lg:col-span-2 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5" id="user-reports-title">
                  <TicketIcon className="text-indigo-600" size={17} />
                  Daftar Seluruh Laporan TI Saya
                </h3>
                <p className="text-[11px] text-slate-400 p-0 font-medium leading-relaxed">
                  Memantau progres penanganan kendala yang telah Anda ajukan
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-750 font-mono rounded-full font-black">
                {filteredTickets.length} Tiket
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredTickets.map((t) => {
                // Priority color badges
                let priorityCardBadge = 'bg-slate-105 text-slate-700 border-slate-200';
                if (t.priority === 'Urgent') priorityCardBadge = 'bg-rose-50 text-rose-700 border-rose-100';
                else if (t.priority === 'Tinggi') priorityCardBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                else if (t.priority === 'Sedang') priorityCardBadge = 'bg-indigo-50 text-indigo-700 border-indigo-100';

                // Status color badges
                let statusCardBadge = 'bg-slate-100 text-slate-605';
                if (t.status === 'Baru') statusCardBadge = 'bg-sky-50 text-sky-700 border border-sky-200';
                else if (t.status === 'Ditugaskan') statusCardBadge = 'bg-indigo-50 text-indigo-755 border border-indigo-200';
                else if (t.status === 'Diproses') statusCardBadge = 'bg-indigo-600 text-white font-extrabold';
                else if (t.status === 'Selesai') statusCardBadge = 'bg-emerald-100 text-emerald-800 font-extrabold';

                return (
                  <div 
                    key={t.id}
                    onClick={() => onViewTicketDetail?.(t)}
                    className="p-3.5 border border-slate-100 hover:border-slate-200 hover:bg-slate-50/40 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition cursor-pointer group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition">
                          {t.id}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-650 px-1.5 py-0.2 rounded font-bold">
                          {t.category}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 border rounded font-black font-mono uppercase ${priorityCardBadge}`}>
                          {t.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-850 truncate group-hover:text-indigo-600 transition">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Diajukan pada {new Date(t.createdAt).toLocaleDateString('id-ID')} - target SLA: <span className="font-semibold text-slate-755">{new Date(t.slaDeadline).toLocaleString('id-ID')}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${statusCardBadge}`}>
                        {t.status}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTicketDetail?.(t);
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-805 font-extrabold py-1 px-3 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg border border-indigo-100/50 transition whitespace-nowrap"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTickets.length === 0 && (
                <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                    <TicketIcon size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Belum ada laporan kendala</p>
                    <p className="text-[11px] text-slate-405 mt-0.5">Seluruh lingkungan layanan TI sistem Anda aman terkendali.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('incidents')}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition mx-auto cursor-pointer block border-none0"
                  >
                    Mulai Lapor Kendala
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Help and Knowledge Base Column */}
          <div className="space-y-6">
            {/* Quick action card inviting chatbot consultation */}
            <div className="bg-indigo-950 text-white rounded-xl p-5 border border-slate-800 text-left relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles size={100} />
              </div>
              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/20 text-indigo-300 text-[9.5px] font-mono tracking-wider font-extrabold uppercase animate-pulse">
                  <Sparkles size={11} className="text-indigo-300" />
                  Smart Helpdesk AI
                </div>
                <h4 className="text-sm font-extrabold">Konsultasi Kendala Mandiri</h4>
                <p className="text-[11px] text-slate-305 leading-relaxed font-semibold">
                  Mengalami kendala komputer lambat, printer error, atau akun terkunci? Konsultasikan langsung dengan asisten kecerdasan buatan kami di pojok kanan bawah untuk diagnosis cepat!
                </p>
                <button
                  onClick={() => {
                    if (typeof (window as any).openAiChatbot === 'function') {
                      (window as any).openAiChatbot();
                    } else {
                      const aiChatBtn = document.getElementById('ai-support-activator');
                      if (aiChatBtn) aiChatBtn.click();
                    }
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-950 font-black text-[10.5px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer mt-3"
                >
                  <span>Mulai Tanya AI</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Simple Knowledge Base lists */}
            <div className="bg-white rounded-xl p-5 border border-slate-150/70 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={17} />
                  Solusi Cepat Terpopuler
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-750 font-mono rounded uppercase tracking-wider font-bold">
                  Self Help
                </span>
              </div>
              <div className="space-y-2.5">
                <div 
                  className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl group transition cursor-pointer border border-transparent hover:border-indigo-100 flex justify-between items-center" 
                  onClick={() => setActiveTab('kb')}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition truncate">
                      Cara Reset Mandiri Kata Sandi Akun LDAP
                    </h4>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">Akses & Keamanan • SLA Mandiri</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono group-hover:text-indigo-600 shrink-0 ml-2">&rArr;</span>
                </div>

                <div 
                  className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl group transition cursor-pointer border border-transparent hover:border-indigo-100 flex justify-between items-center" 
                  onClick={() => setActiveTab('kb')}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition truncate">
                      Cara Terhubung ke Cisco AnyConnect VPN
                    </h4>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">Jaringan & VPN • Panduan Lengkap</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono group-hover:text-indigo-600 shrink-0 ml-2">&rArr;</span>
                </div>

                <div 
                  className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl group transition cursor-pointer border border-transparent hover:border-indigo-100 flex justify-between items-center" 
                  onClick={() => setActiveTab('kb')}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition truncate">
                      Mengatasi Kendala Outlook Sync Error #901
                    </h4>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">Software & Kolaborasi • Troubleshoot</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono group-hover:text-indigo-600 shrink-0 ml-2">&rArr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
