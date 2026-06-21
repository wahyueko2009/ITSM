/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ticket, ChangeRequest, Asset, KBArticle, UserSession, SlaPolicy, DatabaseUser, CabMember } from './types';
import { 
  INITIAL_TICKETS, INITIAL_CHANGES, INITIAL_ASSETS, INITIAL_KB, INITIAL_SLA_POLICIES 
} from './data';
import Dashboard from './components/Dashboard';
import IncidentsTab from './components/IncidentsTab';
import ChangesTab from './components/ChangesTab';
import AssetsTab from './components/AssetsTab';
import KbTab from './components/KbTab';
import SlaMasterTab from './components/SlaMasterTab';
import UsersTab from './components/UsersTab';
import DbExplorerTab from './components/DbExplorerTab';
import CabMembersMasterTab from './components/CabMembersMasterTab';
import AiChatbot from './components/AiChatbot';
import LoginScreen from './components/LoginScreen';
import TicketDetailModal from './components/TicketDetailModal';
import AuditorReportsTab from './components/AuditorReportsTab';

import { 
  LayoutDashboard, Ticket as TicketIcon, GitBranch, 
  Database, BookOpen, Settings, AlertCircle, Sparkles, User, HelpCircle, Activity, LogOut, Trash2, Clock, Users, ShieldCheck
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      const cachedSession = localStorage.getItem('itsm_session');
      if (cachedSession) {
        const parsed = JSON.parse(cachedSession);
        return parsed.role === 'admin' ? 'dashboard' : 'incidents';
      }
    } catch {}
    return 'dashboard';
  });

  // Session, Token and Loader State
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const cachedSession = localStorage.getItem('itsm_session');
      return cachedSession ? JSON.parse(cachedSession) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const handleRefreshUsers = async () => {
    const activeToken = token || localStorage.getItem('itsm_local_token');
    if (!activeToken) return;
    try {
      const response = await fetch('/api/users', { headers: { Authorization: `Bearer ${activeToken}` } });
      if (response.ok) {
        const pusr = await response.json();
        if (Array.isArray(pusr)) setUsers(pusr);
      }
    } catch (err) {
      console.error('Error refreshing users from backend:', err);
    }
  };

  const setActiveTab = (tab: string) => {
    if (session) {
      if (session.role === 'user') {
        if (['changes', 'assets', 'mastersla', 'users', 'dbexplorer', 'reports'].includes(tab)) {
          setActiveTabState('incidents');
          return;
        }
      } else if (session.role === 'agent') {
        if (['mastersla', 'users', 'dbexplorer'].includes(tab)) {
          setActiveTabState('incidents');
          return;
        }
      }
    }
    setActiveTabState(tab);
    if (tab === 'cabmembers' || tab === 'users') {
      handleRefreshUsers();
    }
  };

  const fetchData = async (authToken: string) => {
    setIsLoadingData(true);
    try {
      const [pts, pcs, pas, pkb, psla, pusr, pcab] = await Promise.all([
        fetch('/api/tickets', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
        fetch('/api/changes', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
        fetch('/api/assets', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
        fetch('/api/kb', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
        fetch('/api/sla', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
        fetch('/api/users', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
        fetch('/api/cab-members', { headers: { Authorization: `Bearer ${authToken}` } }).then(res => res.json()),
      ]);

      if (Array.isArray(pts)) setTickets(pts);
      if (Array.isArray(pcs)) setChanges(pcs);
      if (Array.isArray(pas)) setAssets(pas);
      if (Array.isArray(pkb)) setKbArticles(pkb);
      if (Array.isArray(psla)) setSlaPolicies(psla);
      if (Array.isArray(pusr)) setUsers(pusr);
      if (Array.isArray(pcab)) setCabMembers(pcab);
    } catch (err) {
      console.error('Error fetching data from Cloud SQL backend:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLoginSuccess = async (userSession: UserSession, customToken?: string) => {
    localStorage.setItem('itsm_session', JSON.stringify(userSession));
    if (customToken) {
      localStorage.setItem('itsm_local_token', customToken);
      setToken(customToken);
      setSession(userSession);
      if (userSession.role === 'admin' || userSession.role === 'agent') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('incidents');
      }
      try {
        setIsLoadingData(true);
        await fetchData(customToken);
      } catch (err) {
        console.error("Gagal mengambil data lanjutan lokal:", err);
      } finally {
        setIsLoadingData(false);
      }
      return;
    }

    try {
      setIsLoadingData(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const t = await result.user.getIdToken();
      setToken(t);

      const syncRes = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${t}`
        },
        body: JSON.stringify(userSession)
      });

      let finalSession = userSession;
      if (syncRes.ok) {
        const dbUser = await syncRes.json();
        if (dbUser && dbUser.role) {
          finalSession = {
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role as 'admin' | 'agent' | 'user',
            department: dbUser.department
          };
          localStorage.setItem('itsm_session', JSON.stringify(finalSession));
        }
      }

      setSession(finalSession);
      if (finalSession.role === 'admin' || finalSession.role === 'agent') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('incidents');
      }
      await fetchData(t);
    } catch (err) {
      console.error("Login Gagal:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
    setSession(null);
    setToken(null);
    localStorage.removeItem('itsm_session');
    localStorage.removeItem('itsm_local_token');
  };

  const handleResetData = () => {
    // Only local resetting, standard initialization triggers on empty
    setTickets([]);
    setChanges([]);
    setSlaPolicies(INITIAL_SLA_POLICIES);
    setTicketForModal(null);
    setCurrentSelectedTicket(null);
  };

  // Unified State with LocalStorage Caching Strategy
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [cabMembers, setCabMembers] = useState<CabMember[]>([]);
  
  // Highlighting context across tabs: e.g. currently active viewed ticket
  const [currentSelectedTicket, setCurrentSelectedTicket] = useState<Ticket | null>(null);
  const [ticketForModal, setTicketForModal] = useState<Ticket | null>(null);

  // Initialize on mount and listen to Firebase Auth status
  useEffect(() => {
    const localToken = localStorage.getItem('itsm_local_token');
    const localSession = localStorage.getItem('itsm_session');

    if (localToken && localSession) {
      try {
        const sess = JSON.parse(localSession);
        setToken(localToken);
        setSession(sess);
        setActiveTabState(sess.role === 'admin' || sess.role === 'agent' ? 'dashboard' : 'incidents');
        fetchData(localToken);
      } catch (e) {
        console.error("Restore local session failed:", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If a local test token is active, don't let background changes discard it
      if (localStorage.getItem('itsm_local_token')) {
        return;
      }

      if (firebaseUser) {
        try {
          const t = await firebaseUser.getIdToken();
          setToken(t);

          // Get or create user
          const cachedSession = localStorage.getItem('itsm_session');
          let currentSessObj = cachedSession ? JSON.parse(cachedSession) : null;
          if (!currentSessObj) {
            currentSessObj = {
              email: firebaseUser.email || 'user@company.com',
              name: firebaseUser.displayName || 'Pengguna Google',
              role: 'user' as const, // Default to user level so regular accounts don't auto-claim Admin
              department: 'Umum',
            };
            localStorage.setItem('itsm_session', JSON.stringify(currentSessObj));
          }

          const syncRes = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${t}`
            },
            body: JSON.stringify(currentSessObj)
          });

          if (syncRes.ok) {
            const dbUser = await syncRes.json();
            if (dbUser && dbUser.role) {
              currentSessObj = {
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role as 'admin' | 'agent' | 'user',
                department: dbUser.department,
              };
              localStorage.setItem('itsm_session', JSON.stringify(currentSessObj));
            }
          }

          setSession(currentSessObj);
          setActiveTabState(currentSessObj.role === 'admin' || currentSessObj.role === 'agent' ? 'dashboard' : 'incidents');
          await fetchData(t);
        } catch (err) {
          console.error("Failed to sync on auth change:", err);
        }
      } else {
        if (!localStorage.getItem('itsm_local_token')) {
          setToken(null);
          setSession(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Update operations synced to Cloud SQL backend
  const handleAddTicket = async (newT: Ticket) => {
    setTickets(prev => [newT, ...prev]);
    if (token) {
      try {
        await fetch('/api/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newT)
        });
      } catch (err) {
        console.error("Gagal menyimpan tiket ke basis data:", err);
      }
    }
  };

  const handleUpdateTicket = async (updatedT: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
    setCurrentSelectedTicket(updatedT);
    if (token) {
      try {
        await fetch(`/api/tickets/${updatedT.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedT)
        });
      } catch (err) {
        console.error("Gagal menyinkronkan status tiket ke basis data:", err);
      }
    }
  };

  const handleAddChange = async (newC: ChangeRequest) => {
    setChanges(prev => [newC, ...prev]);
    if (token) {
      try {
        await fetch('/api/changes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newC)
        });
      } catch (err) {
        console.error("Gagal menyimpan RFC ke basis data:", err);
      }
    }
  };

  const handleUpdateChange = async (updatedC: ChangeRequest) => {
    setChanges(prev => prev.map(c => c.id === updatedC.id ? updatedC : c));
    if (token) {
      try {
        await fetch(`/api/changes/${updatedC.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedC)
        });
      } catch (err) {
        console.error("Gagal memproses persetujuan RFC ke basis data:", err);
      }
    }
  };

  const handleAddCabMember = async (name: string, role: string, email: string) => {
    try {
      const response = await fetch('/api/cab-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, role, email, active: 'Aktif' })
      });
      if (response.ok) {
        const added = await response.json();
        setCabMembers(prev => [added, ...prev]);
        return added;
      }
    } catch (err) {
      console.error("Error adding CAB member:", err);
    }
  };

  const handleUpdateCabMember = async (id: number, fields: Partial<CabMember>) => {
    try {
      const response = await fetch(`/api/cab-members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fields)
      });
      if (response.ok) {
        setCabMembers(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
      }
    } catch (err) {
      console.error("Error updating CAB member:", err);
    }
  };

  const handleDeleteCabMember = async (id: number) => {
    try {
      const response = await fetch(`/api/cab-members/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setCabMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Error deleting CAB member:", err);
      throw err;
    }
  };

  const handleAddAsset = async (newA: Asset) => {
    setAssets(prev => [newA, ...prev]);
    if (token) {
      try {
        await fetch('/api/assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newA)
        });
      } catch (err) {
        console.error("Gagal menyimpan aset ke CMDB basis data:", err);
      }
    }
  };

  const handleUpdateAsset = async (updatedA: Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedA.id ? updatedA : a));
    if (token) {
      try {
        await fetch(`/api/assets/${updatedA.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedA)
        });
      } catch (err) {
        console.error("Gagal menyimpan perubahan aset ke basis data:", err);
      }
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (token) {
      try {
        const response = await fetch(`/api/assets/${assetId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Gagal menghapus aset dari basis data.');
        }
        setAssets(prev => prev.filter(a => a.id !== assetId));
        return true;
      } catch (err: any) {
        console.error("Gagal menghapus aset dari basis data:", err);
        alert(`Gagal Menghapus Aset: ${err.message}`);
        return false;
      }
    } else {
      setAssets(prev => prev.filter(a => a.id !== assetId));
      return true;
    }
  };

  const handleAddArticle = async (newAt: KBArticle) => {
    setKbArticles(prev => [newAt, ...prev]);
    if (token) {
      try {
        await fetch('/api/kb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newAt)
        });
      } catch (err) {
        console.error("Gagal menyimpan artikel KB ke basis data:", err);
      }
    }
  };

  const handleUpdateArticle = async (updatedAt: KBArticle) => {
    setKbArticles(prev => prev.map(art => art.id === updatedAt.id ? updatedAt : art));
    if (token) {
      try {
        await fetch(`/api/kb/${updatedAt.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedAt)
        });
      } catch (err) {
        console.error("Gagal menyunting artikel KB ke basis data:", err);
      }
    }
  };

  const handleDeleteArticle = async (id: string) => {
    setKbArticles(prev => prev.filter(art => art.id !== id));
    // Kept client-filtered, or can add API endpoint as required
  };

  const handleAddSlaPolicy = async (newP: SlaPolicy) => {
    setSlaPolicies(prev => [newP, ...prev]);
    if (token) {
      try {
        await fetch('/api/sla', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newP)
        });
      } catch (err) {
        console.error("Gagal mendaftarkan kebijakan SLA baru:", err);
      }
    }
  };

  const handleUpdateSlaPolicy = async (updatedP: SlaPolicy) => {
    setSlaPolicies(prev => prev.map(p => p.id === updatedP.id ? updatedP : p));
    if (token) {
      try {
        await fetch(`/api/sla/${updatedP.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedP)
        });
      } catch (err) {
        console.error("Gagal menyimpan perubahan kebijakan SLA:", err);
      }
    }
  };

  const handleDeleteSlaPolicy = (id: string) => {
    setSlaPolicies(prev => prev.filter(p => p.id !== id));
  };

  const handleResetSlaPolicies = () => {
    setSlaPolicies(INITIAL_SLA_POLICIES);
  };

  const handleClearAllTicketsAndChanges = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setTickets([]);
        setChanges([]);
        alert("Semua data insiden & request berhasil dibersihkan!");
      } else {
        const errData = await response.json();
        alert("Gagal membersihkan data: " + errData.error);
      }
    } catch (e: any) {
      alert("Terjadi kesalahan koneksi atau server: " + e.message);
    }
  };

  if (!session) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Count uncompleted tickets based on user role context
  // - Admin Support (Dispatcher) sees count of 'Baru' and unassigned tickets.
  // - Resolvers / Agents (like Budi, etc.) see tickets with status 'Ditugaskan' (Assigned but not yet started/Mulai Kerja) assigned to them.
  // - Regular users see their own requested tickets that are not 'Selesai'.
  const activeTicketsCount = tickets.filter(t => {
    if (session.role === 'user') {
      if (t.status === 'Selesai') return false;
      return t.requester === session.name;
    } else {
      const isUnassigned = !t.assignedAgent || t.assignedAgent.trim() === '' || t.assignedAgent.toLowerCase() === 'unassigned';
      if (session.name === 'Admin Support') {
        return t.status === 'Baru' && isUnassigned;
      } else {
        // Specialist Agent / Resolver sees tickets assigned to them where status is 'Ditugaskan' (Mulai Kerja button not clicked yet)
        const isAssignedToAgent = !!(t.assignedAgent && t.assignedAgent.toLowerCase() !== 'unassigned' && t.assignedAgent.toLowerCase().includes(session.name.toLowerCase()));
        return t.status === 'Ditugaskan' && isAssignedToAgent;
      }
    }
  }).length;

  return (
    <div className="h-screen w-full bg-slate-50 flex font-sans selection:bg-indigo-500 selection:text-white overflow-hidden" id="main-itsm-applet">
      
      {/* Left Sidebar Layout */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 border-r border-slate-800 z-20" id="sidebar-navigation">
        {/* Brand Logo & Area */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center shadow-md text-white font-black text-sm">
            <Activity size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight leading-4">IFG ITSM Portal</h1>
            <p className="text-[9px] text-indigo-400 font-extrabold tracking-wider uppercase font-mono mt-0.5">IFG Corporate Suite</p>
          </div>
        </div>

        {/* Categories & Main Nav */}
        <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {/* CATEGORY 1: SERVICES DESK */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Services Desk</p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'dashboard' 
                      ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                  }`}
                >
                  <LayoutDashboard size={16} className={`${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="font-medium">Dashboard</span>
                </button>
              </li>

              <li>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'incidents' 
                      ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                  }`}
                >
                  <TicketIcon size={16} className={`${activeTab === 'incidents' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="font-medium">
                    {session.role === 'admin'
                      ? (session.name === 'Admin Support' ? 'All Incidents & Requests' : 'Tiket Ditugaskan Ke Saya')
                      : session.role === 'agent'
                      ? 'Tiket Tugas IT Agent'
                      : 'Tiket & Laporan Saya'}
                  </span>
                  {activeTicketsCount > 0 && (
                    <span className="ml-auto bg-red-600 text-[10px] px-2 py-0.2 rounded-full font-bold text-white">
                      {activeTicketsCount}
                    </span>
                  )}
                </button>
              </li>

              {(session.role === 'admin' || session.role === 'agent') && (
                <li>
                  <button
                    onClick={() => setActiveTab('changes')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'changes' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <GitBranch size={16} className={`${activeTab === 'changes' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">CAB (Change Advisory Board)</span>
                    {changes.filter(c => c.status === 'Menunggu Persetujuan').length > 0 && (
                      <span className="ml-auto bg-amber-600 text-[10px] px-2 py-0.2 rounded-full font-bold text-white">
                        {changes.filter(c => c.status === 'Menunggu Persetujuan').length}
                      </span>
                    )}
                  </button>
                </li>
              )}

              <li>
                <button
                  onClick={() => setActiveTab('kb')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'kb' 
                      ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                  }`}
                >
                  <BookOpen size={16} className={`${activeTab === 'kb' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="font-medium">Knowledge Base Solusi</span>
                </button>
              </li>
            </ul>
          </div>

          {/* CATEGORY 2: INFRASTRUKTUR */}
          {(session.role === 'admin' || session.role === 'agent') && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Infrastruktur</p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveTab('assets')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'assets' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <Database size={16} className={`${activeTab === 'assets' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">CMDB / Assets</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* CATEGORY: LAPORAN & KEPATUHAN */}
          {(session.role === 'admin' || session.role === 'agent') && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Laporan & Kepatuhan</p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'reports' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <ShieldCheck size={16} className={`${activeTab === 'reports' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">ITIL Kinerja & Laporan</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* CATEGORY 3: MASTER */}
          {session.role === 'admin' && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Master</p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveTab('mastersla')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'mastersla' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <Clock size={16} className={`${activeTab === 'mastersla' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">Master SLA</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'users' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <Users size={16} className={`${activeTab === 'users' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">Kelola User</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => setActiveTab('cabmembers')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'cabmembers' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <Users size={16} className={`${activeTab === 'cabmembers' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">Master Anggota CAB</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => setActiveTab('dbexplorer')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                      activeTab === 'dbexplorer' 
                        ? 'bg-slate-800 lg:bg-slate-800/90 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                    }`}
                  >
                    <Database size={16} className={`${activeTab === 'dbexplorer' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-medium">Eksplor Database</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* Profile Segment (Bottom of Sidebar with LogOut) */}
        <div className="mt-auto p-3 bg-slate-950 flex items-center justify-between border-t border-slate-850 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm shrink-0 uppercase ${
              session.role === 'admin' ? 'bg-indigo-650' : session.role === 'agent' ? 'bg-amber-600' : 'bg-emerald-650'
            }`}>
              {session.role === 'admin' ? 'AD' : session.role === 'agent' ? 'AG' : 'SR'}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-bold text-white truncate leading-tight">{session.name}</p>
              <p className="text-[10px] text-slate-500 truncate leading-tight font-medium mt-0.5">{session.department}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Keluar" 
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main Panel Area - Structured Header & Scrollable Body */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Consistent Service Desk Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0 z-10 shadow-xs">
          <div className="flex flex-col items-start text-left">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight leading-4">
              {activeTab === 'dashboard' && (session?.role === 'admin' || session?.role === 'agent' ? 'Service Metrics Dashboard' : 'Dashboard Layanan Mandiri')}
              {activeTab === 'incidents' && (session?.role === 'admin' || session?.role === 'agent' ? 'Incident Management' : 'Portal Pelaporan Kendala / Tiket Saya')}
              {activeTab === 'changes' && 'CAB (Change Advisory Board)'}
              {activeTab === 'assets' && 'Configuration Management (CMDB)'}
              {activeTab === 'kb' && 'Solution Knowledge Base'}
              {activeTab === 'reports' && 'Laporan Kepatuhan & Kinerja ITIL'}
              {activeTab === 'mastersla' && 'Master SLA Configuration'}
              {activeTab === 'users' && 'Hak Akses & Kelola User'}
              {activeTab === 'cabmembers' && 'Master Anggota CAB'}
              {activeTab === 'dbexplorer' && 'Explorer Database PostgreSQL'}
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono mt-0.5">
              {activeTab === 'dashboard' && (session?.role === 'admin' || session?.role === 'agent' ? 'SLA Compliance & Real-time Statistics' : 'Status Penyelesaian, SLA & Informasi Layanan Saya')}
              {activeTab === 'incidents' && (session?.role === 'admin' || session?.role === 'agent' ? 'Assigned Tickets & AI Triage Copilot' : 'Laporkan Isu Workstation, Sistem, dan Pantau Tindak Lanjut Tim Support')}
              {activeTab === 'changes' && 'CAB Meeting Agenda, Voting Status & ITIL Approvals'}
              {activeTab === 'assets' && 'Hardware, Cloud VMs & License Configuration'}
              {activeTab === 'kb' && 'Self-service Guides & Operational Manuals'}
              {activeTab === 'reports' && 'Validasi & Ekspor Berkas Laporan Kepatuhan ITIL Format PDF Sesuai Standar Otoritas TI'}
              {activeTab === 'mastersla' && 'Define Turnaround Goals & Targets by Category & Priority Level'}
              {activeTab === 'users' && 'Otorisasi Pengguna, Kelompok Departemen & Google SSO Synced Directory'}
              {activeTab === 'cabmembers' && 'Hak Suara & Otoritas Dewan Penilai Perubahan (ITIL CAB)'}
              {activeTab === 'dbexplorer' && 'Inspeksi & Kueri Data Tabel Sistem Secara Real-time'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Status light */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-slate-600 uppercase font-mono font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              All Systems Operational
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 text-left">
          {activeTab === 'dashboard' && (
            <Dashboard 
              tickets={tickets} 
              changes={changes} 
              assets={assets}
              setActiveTab={setActiveTab}
              session={session}
              onViewTicketDetail={setTicketForModal}
              slaPolicies={slaPolicies}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsTab
              tickets={tickets}
              assets={assets}
              kbArticles={kbArticles}
              onAddTicket={handleAddTicket}
              onUpdateTicket={handleUpdateTicket}
              session={session}
              onViewTicketDetail={setTicketForModal}
              slaPolicies={slaPolicies}
              users={users}
            />
          )}

          {activeTab === 'changes' && (session?.role === 'admin' || session?.role === 'agent') && (
            <ChangesTab
              changes={changes}
              onAddChange={handleAddChange}
              onUpdateChange={handleUpdateChange}
              cabMembers={cabMembers}
              onAddCabMember={handleAddCabMember}
              onUpdateCabMember={handleUpdateCabMember}
              onDeleteCabMember={handleDeleteCabMember}
              session={session}
            />
          )}

          {activeTab === 'assets' && (session?.role === 'admin' || session?.role === 'agent') && (
            <AssetsTab
              assets={assets}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}

          {activeTab === 'kb' && (
            <KbTab
              articles={kbArticles}
              onAddArticle={handleAddArticle}
              onUpdateArticle={handleUpdateArticle}
              onDeleteArticle={handleDeleteArticle}
              session={session}
            />
          )}

          {activeTab === 'mastersla' && session?.role === 'admin' && (
            <SlaMasterTab
              slaPolicies={slaPolicies}
              onAddSlaPolicy={handleAddSlaPolicy}
              onUpdateSlaPolicy={handleUpdateSlaPolicy}
              onDeleteSlaPolicy={handleDeleteSlaPolicy}
              onResetSlaPolicies={handleResetSlaPolicies}
              onClearAllTicketsAndChanges={handleClearAllTicketsAndChanges}
              session={session}
            />
          )}

          {activeTab === 'users' && session?.role === 'admin' && (
            <UsersTab
              token={token}
              currentUserEmail={session.email}
              onUsersChange={handleRefreshUsers}
            />
          )}

          {activeTab === 'cabmembers' && session?.role === 'admin' && (
            <CabMembersMasterTab
              cabMembers={cabMembers}
              users={users}
              session={session}
              onAddCabMember={handleAddCabMember}
              onUpdateCabMember={handleUpdateCabMember}
              onDeleteCabMember={handleDeleteCabMember}
            />
          )}

          {activeTab === 'dbexplorer' && session?.role === 'admin' && (
            <DbExplorerTab
              token={token}
            />
          )}

          {activeTab === 'reports' && (session?.role === 'admin' || session?.role === 'agent') && (
            <AuditorReportsTab
              tickets={tickets}
              changes={changes}
              assets={assets}
              cabMembers={cabMembers}
              session={session}
            />
          )}
        </div>

        {/* Footer Credit Line */}
        <footer className="bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
          Nexus ITSM Suite • Standard ITIL v4 • Stable Core v4.2.1
        </footer>
      </main>

      {/* Context-aware Floating AI Service Desk Copilot */}
      <AiChatbot 
        activeTicketContext={currentSelectedTicket} 
        kbArticles={kbArticles} 
      />

      {/* Elegant Standard Ticket Details Pop-up Modal */}
      {ticketForModal && (
        <TicketDetailModal
          ticket={ticketForModal}
          onClose={() => setTicketForModal(null)}
          session={session}
          onUpdateTicket={(updatedT) => {
            handleUpdateTicket(updatedT);
            setTicketForModal(updatedT);
          }}
          users={users}
        />
      )}

    </div>
  );
}
