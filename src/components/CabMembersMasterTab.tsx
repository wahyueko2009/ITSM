import React, { useState } from 'react';
import { CabMember, DatabaseUser, UserSession } from '../types';
import { 
  Users, UserPlus, Search, Edit2, Trash2, 
  Check, X, ShieldAlert, Award, Star, Mail, Briefcase, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CabMembersMasterTabProps {
  cabMembers: CabMember[];
  users: DatabaseUser[];
  session: UserSession;
  onAddCabMember: (name: string, role: string, email: string) => Promise<any>;
  onUpdateCabMember: (id: number, fields: any) => Promise<any>;
  onDeleteCabMember: (id: number) => Promise<any>;
}

export default function CabMembersMasterTab({
  cabMembers = [],
  users = [],
  session,
  onAddCabMember,
  onUpdateCabMember,
  onDeleteCabMember
}: CabMembersMasterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Create / Edit State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form Values
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [activeState, setActiveState] = useState('Aktif');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const isAdmin = session.role === 'admin';

  // Filter user with role 'agent' or 'admin' (IT staff) who can be added as CAB members
  const itAgents = users.filter(u => u.role === 'agent' || u.role === 'admin');

  // Handle agent selection change to pre-fill form
  const handleAgentSelect = (agentIdStr: string) => {
    setSelectedAgentId(agentIdStr);
    if (!agentIdStr) {
      setCustomName('');
      setCustomEmail('');
      return;
    }
    const selectedAgent = itAgents.find(u => u.id.toString() === agentIdStr);
    if (selectedAgent) {
      setCustomName(selectedAgent.name);
      setCustomEmail(selectedAgent.email);
      // Auto prefill role with their department or generic specialized title if blank
      if (!customRole) {
        setCustomRole(selectedAgent.department || 'IT Specialist Agent');
      }
    }
  };

  const handleStartAdd = () => {
    if (!isAdmin) {
      alert('Hanya Administrator dengan role admin yang diizinkan mengelola master data CAB.');
      return;
    }
    setEditId(null);
    setSelectedAgentId('');
    setCustomName('');
    setCustomRole('');
    setCustomEmail('');
    setActiveState('Aktif');
    setShowForm(true);
  };

  const handleStartEdit = (m: CabMember) => {
    if (!isAdmin) {
      alert('Hanya Administrator dengan role admin yang diizinkan mengelola master data CAB.');
      return;
    }
    setEditId(m.id);
    
    // Check if we can map this member name to an existing IT Agent user
    const matchedAgent = itAgents.find(u => u.name === m.name);
    if (matchedAgent) {
      setSelectedAgentId(matchedAgent.id.toString());
    } else {
      setSelectedAgentId('manual'); // manually inputting / older entry
    }

    setCustomName(m.name);
    setCustomRole(m.role);
    setCustomEmail(m.email || '');
    setActiveState(m.active || 'Aktif');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Maaf, tipe otorisasi Anda ditolak. Hanya Administrator yang dapat mengubah data.');
      return;
    }

    if (!customName || !customRole) {
      alert('Harap pilih Agen IT dan masukkan Jabatan CAB terkait!');
      return;
    }

    try {
      if (editId !== null) {
        await onUpdateCabMember(editId, {
          name: customName,
          role: customRole,
          email: customEmail,
          active: activeState
        });
        showFeedback(`Anggota CAB "${customName}" berhasil diperbarui.`);
      } else {
        // Double check duplication in active CAB list
        const exists = cabMembers.some(m => m.name.toLowerCase() === customName.toLowerCase());
        if (exists) {
          alert(`Koreksi: "${customName}" sudah terdaftar sebagai anggota CAB!`);
          return;
        }

        await onAddCabMember(customName, customRole, customEmail);
        showFeedback(`Anggota CAB "${customName}" berhasil ditambahkan.`);
      }
      setShowForm(false);
      setEditId(null);
      setSelectedAgentId('');
      setCustomName('');
      setCustomRole('');
      setCustomEmail('');
    } catch (err: any) {
      console.error(err);
      alert('Kesalahan memproses penyimpanan anggota CAB: ' + err.message);
    }
  };

  const handleDelete = async (m: CabMember) => {
    if (!isAdmin) {
      alert('Maaf, tindakan ditolak. Hanya Administrator yang dapat mengapus anggota CAB.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus hak suara CAB dari "${m.name}"?`)) {
      try {
        await onDeleteCabMember(m.id);
        showFeedback(`Anggota CAB "${m.name}" berhasil dihapus.`);
      } catch (err: any) {
        console.error(err);
        alert('Gagal menghapus anggota CAB: ' + (err.message || 'Terjadi kesalahan sistem.'));
      }
    }
  };

  // Search and filter logic
  const filteredMembers = cabMembers.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'aktif' && m.active === 'Aktif') ||
      (statusFilter === 'nonaktif' && m.active === 'Nonaktif');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="cab-members-master-view">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs text-left">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={20} />
            </span>
            Master Anggota CAB (ITIL V4)
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-2xl leading-relaxed">
            Dewan Penasihat Perubahan atau <b className="text-indigo-600">Change Advisory Board (CAB)</b> bertanggung jawab atas persetujuan perubahan sistem tinggi (RFC). 
            Hanya user dengan role <b className="text-slate-700">IT Agen</b> yang dapat didaftarkan sebagai Anggota CAB.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleStartAdd}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <UserPlus size={15} />
            Daftarkan Anggota CAB
          </button>
        )}
      </div>

      {feedback && (
        <div className="bg-emerald-600 text-white text-xs font-bold p-3 rounded-lg flex items-center gap-2 shadow-xs transition-all">
          <Check size={14} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid containing forms and list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editor Form Panel */}
        <div className="lg:col-span-1 space-y-4">
          {showForm ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Award size={14} className="text-indigo-600" />
                  {editId !== null ? 'Sunting Anggota' : 'Daftar Anggota CAB'}
                </span>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded"
                >
                  <X size={15} />
                </button>
              </div>

              {!isAdmin && (
                <div className="bg-amber-50 text-amber-800 text-[11px] p-3 rounded-xl border border-amber-100 font-semibold leading-relaxed flex items-start gap-1.5">
                  <ShieldAlert size={14} className="shrink-0 text-amber-600 mt-0.5" />
                  <span>Hanya user bertipe <b>Administrator</b> yang punya otoritas menyimpan perubahan atau menghapus data di sini.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. SELECT IT AGENT */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Pilih User (Wajib IT Agen) <span className="text-red-500">*</span>
                  </label>
                  {editId !== null ? (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Star size={13} className="text-amber-500" />
                      <span>{customName}</span>
                    </div>
                  ) : (
                    <select
                      value={selectedAgentId}
                      onChange={(e) => handleAgentSelect(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih IT Agen Terdaftar --</option>
                      {itAgents.map((u) => (
                        <option key={u.id} value={u.id.toString()}>
                          🧑‍💻 {u.name} ({u.department || 'Spesialis'}) - {u.email}
                        </option>
                      ))}
                      {itAgents.length === 0 && (
                        <option disabled>Tidak ada IT Agen yang terdaftar di sistem.</option>
                      )}
                    </select>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">
                    Hanya pengguna master yang memiliki departemen IT / role Agen IT yang dimungkinkan masuk dalam voting CAB.
                  </p>
                </div>

                {/* 2. PREFILLED / EDITABLE PROPS */}
                {customName && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">
                        Nama Lengkap
                      </label>
                      <input 
                        type="text" 
                        disabled 
                        value={customName}
                        className="w-full bg-slate-100 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1" title="Misalkan: IT Director, Security Officer, Infrastructure Manager">
                        Jabatan CAB Terpercaya <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Security Officer, Infra Manager, IT Director"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">Berikan gelar spesialis atau departemen peninjau audit ITIL mereka.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">
                        Surel / Email Kerja
                      </label>
                      <input 
                        type="email" 
                        disabled 
                        placeholder="Tidak ada email terdaftar"
                        value={customEmail}
                        className="w-full bg-slate-100 border border-slate-150 rounded-xl p-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">
                        Status Hak Suara
                      </label>
                      <select
                        value={activeState}
                        onChange={(e) => setActiveState(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-800 cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Aktif">Aktif (Korum Hak Suara Terbuka)</option>
                        <option value="Nonaktif">Nonaktif (Hak Suara Ditangguhkan)</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {isAdmin && customName && (
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditId(null);
                      }}
                      className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2 rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Simpan Anggota
                    </button>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 text-left space-y-3">
              <Star className="text-indigo-500 mx-auto" size={28} />
              <div className="text-center space-y-1">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Kelola Master ITIL CAB</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                  Silakan cari, perbarui status keaktifan, atau tambahkan anggota baru untuk meninjau status voting rilis perangkat lunak dan infrastruktur IFG.
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={handleStartAdd}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                >
                  <UserPlus size={14} />
                  Tambah Anggota Baru
                </button>
              )}
            </div>
          )}
        </div>

        {/* Members List Table Panel (Right Side, occupies 2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left">
            
            {/* Filter Search Section */}
            <div className="p-4 border-b border-slate-100 bg-slate-55/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Cari anggota CAB..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl py-1 px-3 border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer shrink-0"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">🟢 Status Aktif</option>
                  <option value="nonaktif">🔴 Status Nonaktif</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
                  title="Reset Filter"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Members table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    <th className="py-3 px-5">Nama / Kontak Karyawan</th>
                    <th className="py-3 px-5">Jabatan CAB ITIL</th>
                    <th className="py-3 px-5">Otoritas Korum</th>
                    <th className="py-3 px-5 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => (
                    <motion.tr 
                      layoutId={`cab-row-${member.id}`}
                      key={member.id} 
                      className="hover:bg-slate-50/50 transition whitespace-nowrap bg-white"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-800 leading-tight flex items-center gap-1">
                              {member.name}
                              {member.active === 'Aktif' && (
                                <Star size={11} className="text-amber-500 fill-amber-500" title="Hak Suara Aktif" />
                              )}
                            </div>
                            {member.email ? (
                              <div className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                                <Mail size={10} className="text-slate-300" />
                                {member.email}
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-350 italic">Tidak ada email</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                          <Briefcase size={12} className="text-slate-400" />
                          <span>{member.role}</span>
                        </div>
                      </td>

                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          member.active === 'Aktif' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.active === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {member.active || 'Aktif'}
                        </span>
                      </td>

                      <td className="py-3 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isAdmin ? (
                            deletingId === member.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-1 rounded-lg">
                                <span className="text-[9px] font-black text-rose-700 uppercase tracking-tight px-1 font-mono">Yakin?</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await onDeleteCabMember(member.id);
                                      showFeedback(`Anggota CAB "${member.name}" berhasil dihapus.`);
                                    } catch (err: any) {
                                      console.error(err);
                                      alert('Error: ' + (err.message || 'Gagal menghapus'));
                                    } finally {
                                      setDeletingId(null);
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded hover:bg-rose-700 transition cursor-pointer"
                                  title="Konfirmasi Hapus"
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-0.5 bg-slate-205 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-300 transition cursor-pointer"
                                  title="Batal"
                                >
                                  Tidak
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(member)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                  title="Sunting Anggota"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => setDeletingId(member.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                  title="Hapus Anggota"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Khusus Admin</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}

                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center bg-white text-slate-400 text-xs font-semibold">
                        Tidak ada kecocokan data anggota CAB yang terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table status footer count */}
            <div className="bg-slate-50/50 border-t border-slate-100 p-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Total Terdaftar: {cabMembers.length} Anggota</span>
              <span className="text-emerald-600">Aktif/Korum: {cabMembers.filter(m => m.active === 'Aktif').length} Karyawan</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
