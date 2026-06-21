import React, { useState, useEffect } from 'react';
import { DatabaseUser, UserRole } from '../types';
import { 
  Users, UserPlus, Search, Shield, Filter, Edit, Trash2, 
  Check, X, Briefcase, Mail, Key, Sparkles, Building, ChevronDown,
  Eye, EyeOff, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UsersTabProps {
  token: string | null;
  currentUserEmail: string;
  onUsersChange?: () => void;
  assets?: any[];
}

export default function UsersTab({ token, currentUserEmail, onUsersChange, assets = [] }: UsersTabProps) {
  const [usersList, setUsersList] = useState<DatabaseUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'email' | 'department'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Reset pagination to page 1 on search or filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, deptFilter]);

  // States for Modals/Forms
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DatabaseUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editDept, setEditDept] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newDept, setNewDept] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password');

  // Settle user list
  const loadUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Gagal mengambil daftar pengguna');
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsersList(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  // Handle Add Submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          role: newRole,
          department: newDept || 'Hardware',
          password: newPassword
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Gagal menambahkan user baru');
      }

      setSuccess(`Pengguna uji coba baru "${newName}" berhasil didaftarkan ke Cloud SQL.`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewDept('');
      setNewPassword('password');
      setNewRole('user');
      loadUsers();
      onUsersChange?.();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan user baru.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Edit Submit
  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !token) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          department: editDept,
          email: editEmail,
          password: editPassword
        })
      });

      if (!response.ok) throw new Error('Gagal memperbarui pengguna');

      setSuccess(`Profil pengguna ${editName} berhasil diperbarui di Cloud SQL.`);
      setIsEditModalOpen(false);
      loadUsers();
      onUsersChange?.();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete operation
  const handleDeleteUser = async (id: number, name: string, email: string) => {
    if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
      setError('Anda tidak diperkenankan untuk menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${name}" dari sistem? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Gagal menghapus pengguna.');

      setSuccess(`Pengguna "${name}" berhasil dinonaktifkan & dihapus dari basis data.`);
      loadUsers();
      onUsersChange?.();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fill in form backends
  const openEditModal = (user: DatabaseUser) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditDept(user.department);
    setEditEmail(user.email);
    setEditPassword(user.password || 'password');
    setIsEditModalOpen(true);
  };

  // Filter logic
  const filteredUsers = usersList.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDept = deptFilter === 'all' || user.department === deptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  // Sort logic
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let valA: any = a[sortBy] ?? '';
    let valB: any = b[sortBy] ?? '';

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

  const toggleSort = (field: 'id' | 'name' | 'email' | 'department') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Extract unique departments for filtering
  const departments = Array.from(new Set(usersList.map(u => u.department))).filter(Boolean);

  return (
    <div className="space-y-6" id="users-tab-panel">
      {/* Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-4">
          <Users size={220} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full w-fit mb-3">
              <Sparkles size={10} />
              Cloud SQL Engine
            </div>
            <h3 className="text-xl font-bold tracking-tight">Kelola Hak Akses & Pengguna</h3>
            <p className="text-xs text-slate-300 max-w-xl mt-1.5 leading-relaxed">
              Otorisasi repositori pengguna IFG ITSM Portal. Konfigurasikan departemen, sinkronisasi token identitas Google SSO, dan ganti otorisasi Admin atau User di sini.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-3 text-center min-w-28">
              <span className="block text-xl font-black text-white">{usersList.length}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider uppercase">Live Users</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-3 text-center min-w-28">
              <span className="block text-xl font-black text-amber-400">
                {usersList.filter(u => u.role === 'agent').length}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider uppercase">IT Agents</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-3 text-center min-w-28">
              <span className="block text-xl font-black text-indigo-400">
                {usersList.filter(u => u.role === 'admin').length}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider uppercase">Administrators</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Notifikasi */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 justify-start shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-800 font-bold cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 justify-start shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-800 font-bold cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Controls & Search */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-10 pr-4 py-2 text-xs font-medium focus:outline-hidden transition"
            placeholder="Cari user berdasarkan nama, email, atau departemen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Role</span>
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden transition text-slate-700"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Semua Otoritas</option>
              <option value="admin">Administrator</option>
              <option value="agent">IT Agent</option>
              <option value="user">User Umum</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Dept</span>
            <select
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden transition text-slate-700"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="all">Semua Departemen</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Sync Trigger button */}
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-bold font-mono transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Reloading...' : 'Reload SQL'}
          </button>

          {/* Tambah User Button */}
          <button
            type="button"
            onClick={() => {
              setNewName('');
              setNewEmail('');
              setNewDept('');
              setNewRole('user');
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            id="btn-tambah-user-test"
          >
            <UserPlus size={14} />
            <span>Tambah User</span>
          </button>
        </div>
      </div>

      {/* Main Table Segment */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 select-none">
                <th 
                  onClick={() => toggleSort('name')}
                  className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Profil User</span>
                    <ArrowUpDown size={12} className={sortBy === 'name' ? 'text-indigo-600' : 'text-slate-400 opacity-60'} />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('email')}
                  className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Email Utama</span>
                    <ArrowUpDown size={12} className={sortBy === 'email' ? 'text-indigo-600' : 'text-slate-400 opacity-60'} />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('department')}
                  className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Departemen</span>
                    <ArrowUpDown size={12} className={sortBy === 'department' ? 'text-indigo-600' : 'text-slate-400 opacity-60'} />
                  </div>
                </th>
                <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kata Sandi</th>
                <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hak Otoritas</th>
                <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Aset IT Pegangan</th>
                <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">UID Google Auth</th>
                <th className="px-6 py-4.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        user.role === 'admin' ? 'bg-indigo-600 text-white' : 
                        user.role === 'agent' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {user.name ? user.name.slice(0, 2) : 'US'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          {user.name}
                          {user.email.toLowerCase() === currentUserEmail.toLowerCase() && (
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">Anda</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Database ID: #{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Mail size={12} className="text-slate-400" />
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                       <Building size={12} className="text-slate-400" />
                      <span>{user.department || 'Hardware'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Key size={12} className="text-indigo-400" />
                      <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold text-slate-600 font-mono">
                        {visiblePasswords[user.id] ? (user.password || '—') : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisiblePasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                        title={visiblePasswords[user.id] ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      >
                        {visiblePasswords[user.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                      user.role === 'admin' 
                        ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' 
                        : user.role === 'agent'
                        ? 'bg-amber-50 border border-amber-100 text-amber-705'
                        : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                    }`}>
                      <Shield size={10} />
                      {user.role === 'admin' ? 'SYSTEM ADMIN' : user.role === 'agent' ? 'IT AGENT' : 'USER UMUM'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const userAssets = assets.filter(a => a.owner && (
                        a.owner.toLowerCase() === user.name?.toLowerCase() ||
                        a.owner.toLowerCase() === user.email?.toLowerCase()
                      ));
                      if (userAssets.length === 0) {
                        return <span className="text-slate-400 font-medium text-[11px] font-mono">—</span>;
                      }
                      return (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {userAssets.map(a => (
                            <span 
                              key={a.id} 
                              className="inline-flex items-center gap-1 bg-indigo-55/90 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs shrink-0"
                              title={`${a.name} (${a.serialNumber}) - Status: ${a.status} - Lokasi: ${a.location}`}
                            >
                              <span className="text-[10px]" role="img" aria-label="asset icon">
                                {a.type === 'Workstation' ? '💻' : a.type === 'Server' ? '🖥️' : '🏷️'}
                              </span>
                              <span className="font-mono tracking-tight">{a.id}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono font-bold tracking-tight text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 select-all max-w-[150px] truncate" title={user.uid}>
                      {user.uid}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                        title="Sunting profil pengguna"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name, user.email)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Hapus user"
                        disabled={user.email.toLowerCase() === currentUserEmail.toLowerCase()}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Users className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-xs font-bold text-slate-500">Tidak ada pengguna yang sesuai.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau penyaring departemen di atas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {totalItems > 0 && (
          <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side: status details */}
            <div className="text-xs text-slate-500 font-medium select-none">
              Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span> sampai{' '}
              <span className="font-bold text-slate-800">{endIndex}</span> dari{' '}
              <span className="font-bold text-slate-800">{totalItems}</span> pengguna
              {filteredUsers.length !== usersList.length && (
                <span className="text-[10px] text-slate-400 font-normal"> (disaring dari {usersList.length} total)</span>
              )}
            </div>

            {/* Right side: controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Row per Page Selector */}
              <div className="flex items-center gap-2 select-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">Baris per hal:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold focus:outline-hidden text-slate-700 shadow-xs cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition cursor-pointer"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="text-xs font-bold text-slate-700 bg-slate-100/85 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200/50 select-none">
                  Halaman <span className="text-indigo-650 font-black">{currentPage}</span> dari <span className="text-slate-500">{totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition cursor-pointer"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden text-left"
            >
              {/* Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <Shield size={16} className="text-indigo-400" />
                    Sunting Profil Pengguna
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Database Sync: #{selectedUser?.id}</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleUpdateUserSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Alamat Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Departemen Kerja</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                    placeholder="Contoh: IT Support, Finansial, HR"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Kata Sandi (Untuk Login Lokal)</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      required
                      placeholder="Contoh: password"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-3 pr-10 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Tingkat Otoritas Sistem (Role)</label>
                  <div className="grid grid-cols-3 gap-2.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setEditRole('user')}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        editRole === 'user'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check size={12} className={editRole === 'user' ? 'opacity-100' : 'opacity-0'} />
                      <span>User Umum</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('agent')}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        editRole === 'agent'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check size={12} className={editRole === 'agent' ? 'opacity-100' : 'opacity-0'} />
                      <span>IT Agent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('admin')}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        editRole === 'admin'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-805'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check size={12} className={editRole === 'admin' ? 'opacity-100' : 'opacity-0'} />
                      <span>Sys Admin</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    * Perubahan level Admin akan otomatis membuka konfigurasi master SLA dan infrastruktur saat login ulang.
                  </p>
                </div>

                {/* Confirm actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden text-left"
            >
              {/* Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <UserPlus size={16} className="text-indigo-400" />
                    Tambah Pengguna Uji Coba (Dev/Test)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Daftarkan user langsung ke Cloud SQL PostgreSQL</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Alamat Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: budi.santoso@ifg.id"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Departemen Kerja</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IT Support, Keuangan, Kepatuhan SLA"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Kata Sandi (Untuk Login Lokal)</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Contoh: password"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-3 pr-10 py-2 text-xs font-semibold focus:outline-hidden transition text-slate-800"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Tingkat Otoritas Sistem (Role)</label>
                  <div className="grid grid-cols-3 gap-2.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setNewRole('user')}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        newRole === 'user'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-205 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check size={12} className={newRole === 'user' ? 'opacity-100' : 'opacity-0'} />
                      <span>User Umum</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRole('agent')}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        newRole === 'agent'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check size={12} className={newRole === 'agent' ? 'opacity-100' : 'opacity-0'} />
                      <span>IT Agent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRole('admin')}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        newRole === 'admin'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-805'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check size={12} className={newRole === 'admin' ? 'opacity-100' : 'opacity-0'} />
                      <span>Sys Admin</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    * Di lingkungan pengujian ini, Anda dapat menambahkan pengguna pengujian sementara. LDAP SSO yang terintegrasi akan dihubungkan saat portal diterapkan ke server target.
                  </p>
                </div>

                {/* Confirm actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Mendaftarkan...' : 'Daftarkan User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
