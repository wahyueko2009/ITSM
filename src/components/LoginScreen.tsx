import React, { useState } from 'react';
import { UserSession } from '../types';
import { Shield, User, Lock, ArrowRight, Activity, Cpu, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession, token?: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pre-coded users
  const PRESETS = [
    {
      name: 'Admin Support',
      email: 'admin@ifg.id',
      password: 'admin',
      role: 'admin' as const,
      department: 'IT Service Desk',
      description: 'Mengelola insiden, menyetujui perubahan (RFC), manajemen aset CMDB, & solusi Knowledge Base.',
      avatarInitials: 'AD'
    },
    {
      name: 'Budi Santoso',
      email: 'budi.santoso@ifg.id',
      password: 'budi',
      role: 'admin' as const,
      department: 'IT Infrastructure',
      description: 'Agen IT Spesialis (Resolver - Network Specialist) yang menerima penugasan, investigasi, & memproses resolusi sesuai SLA.',
      avatarInitials: 'BS'
    },
    {
      name: 'Rian Hidayat',
      email: 'rian@ifg.id',
      password: 'rian',
      role: 'admin' as const,
      department: 'Information Security',
      description: 'Agen IT Spesialis (Cybersecurity Specialist) yang melakukan rilis patch keamanan dan analisis kerentanan.',
      avatarInitials: 'RH'
    },
    {
      name: 'Wati Lestari',
      email: 'wati@ifg.id',
      password: 'wati',
      role: 'admin' as const,
      department: 'Database Administration',
      description: 'Agen IT Spesialis (Database Administrator) yang mengelola penyimpanan, query, dan replikasi basis data.',
      avatarInitials: 'WL'
    }
  ];

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Otentikasi Kredensial Gagal.');
      }

      const { token, user } = await response.json();
      
      // Save local authentication details
      localStorage.setItem('itsm_local_token', token);
      
      onLoginSuccess(user, token);
    } catch (err: any) {
      console.error("Local Login error:", err);
      setError(err.message || 'Kombinasi email dan kata sandi salah.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const googleUser = result.user;

      const matched = PRESETS.find(
        p => p.email.toLowerCase() === googleUser.email?.toLowerCase()
      );

      const targetSession = matched ? {
        email: matched.email,
        name: matched.name,
        role: matched.role,
        department: matched.department
      } : {
        email: googleUser.email || 'user@company.com',
        name: googleUser.displayName || googleUser.email?.split('@')[0] || 'Pengguna Google',
        role: 'user' as const, // Google SSO logins default to Karyawan/User role unless pre-registered
        department: 'Umum'
      };

      // Since we want to let onAuthStateChanged run & register this in DB, we clear local overrides
      localStorage.removeItem('itsm_local_token');
      onLoginSuccess(targetSession);
    } catch (err: any) {
      console.error("Google SSO Error:", err);
      setError('Otentikasi Google SSO Gagal atau Dibatalkan. Mohon aktifkan popup peramban Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden" id="login-container">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 -right-4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-4xl bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 shrink-0">
        
        {/* Left Side: Editorial Banner */}
        <div className="md:col-span-5 bg-gradient-to-b from-red-950 via-slate-900 to-slate-950 p-8 flex flex-col justify-between border-r border-slate-800 text-left relative">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-red-600 flex items-center justify-center shadow-lg text-white font-black text-xs">
                IFG
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-tight">IFG ITSM Portal</h1>
                <p className="text-[9px] text-red-400 font-extrabold tracking-widest uppercase font-mono">Indonesia Financial Group</p>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                Portal Tata Kelola & Layanan TI Terpadu
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Selamat datang di platform ITSM standar ITIL v4 Holding BUMN Asuransi, Penjaminan, dan Investasi. Sinergi digital demi perlindungan operasional yang tangguh, terpercaya, dan berkelanjutan.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/60 mt-8 md:mt-0 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest font-mono">
                <Sparkles size={12} />
                Nilai Utama AKHLAK BUMN
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Menjunjung tinggi prinsip Amanah, Kompeten, Harmonis, Loyal, Adaptif, dan Kolaboratif di setiap resolusi insiden dan manajemen perubahan sistem.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest font-mono">
                <Cpu size={12} />
                Integritas Database Terpusat
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Didukung oleh Cloud SQL PostgreSQL berkinerja tinggi, menjamin akurasi data kepatuhan SLA dan riwayat audit aset server CMDB global.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Form and Presets */}
        <div className="md:col-span-7 p-8 flex flex-col justify-center text-left">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header Form */}
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Otentikasi Akun Pegawai</h3>
              <p className="text-xs text-slate-400 mt-1">
                Silakan masuk menggunakan akun email kedinasan Holding Indonesia Financial Group (IFG) yang terdaftar di direktori TI.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-lg leading-relaxed"
              >
                {error}
              </motion.div>
            )}

            {/* Actual Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Email Kedinasan</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User size={14} />
                  </span>
                  <input
                    type="email"
                    placeholder="nama.pegawai@ifg.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg py-2 pl-9 pr-3 text-xs font-medium text-slate-200 placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg py-2 pl-9 pr-3 text-xs font-medium text-slate-200 placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="bg-slate-900 border-slate-800 rounded focus:ring-0 text-red-600"
                  />
                  <span className="text-[11px] text-slate-400 font-medium">Ingat saya di perangkat ini</span>
                </label>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  ) : (
                    <>
                      Masuk dengan Kredensial Sistem
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>



          </div>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
        IFG Nexus ITSM Suite • Standard ITIL v4 • Stable Core v4.2.1
      </div>
    </div>
  );
}
