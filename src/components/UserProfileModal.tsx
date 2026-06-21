/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { Asset, UserSession } from '../types';
import { 
  X, User, Mail, Shield, Briefcase, Laptop, MapPin, 
  Database, Tag, Cpu, Info, Calendar, Activity, CheckCircle, HelpCircle, Key, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface UserProfileModalProps {
  session: UserSession;
  assets: Asset[];
  onClose: () => void;
}

export default function UserProfileModal({ session, assets, onClose }: UserProfileModalProps) {
  // Find assets assigned to this user
  // Checks if the owner field matches either user name or email case-insensitively
  const myAssets = assets.filter(a => {
    if (!a.owner) return false;
    const ownerClean = a.owner.trim().toLowerCase();
    const nameClean = (session.name || '').trim().toLowerCase();
    const emailClean = (session.email || '').trim().toLowerCase();
    
    return ownerClean === nameClean || ownerClean === emailClean;
  });

  // Get Initials for Avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'Workstation':
        return <Laptop size={18} className="text-indigo-600" />;
      case 'Server':
      case 'Cloud VM':
        return <Database size={18} className="text-emerald-600" />;
      case 'Router':
      case 'Switch':
        return <Cpu size={18} className="text-blue-600" />;
      case 'Lisensi Software':
        return <Key size={18} className="text-amber-500" />;
      default:
        return <Tag size={18} className="text-slate-500" />;
    }
  };

  return (
    <div id="user-profile-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/75 select-none">
          <div className="flex items-center gap-2">
            <User size={16} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800 font-mono">Profil Pengguna & Inventori</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/70 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
            title="Tutup"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* User Information Card */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-40 h-40 bg-indigo-505 bg-indigo-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
              {/* Initials Avatar */}
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 shadow-inner flex items-center justify-center text-xl font-black font-mono tracking-wider text-indigo-200 uppercase self-center sm:self-start">
                {getInitials(session.name)}
              </div>
              
              {/* Name and Basic Metadata */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h3 className="text-lg font-black tracking-tight leading-snug">{session.name}</h3>
                <p className="text-xs text-indigo-200/80 font-medium font-mono mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail size={12} />
                  <span>{session.email}</span>
                </p>

                {/* Sub Badges Grid */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                  {/* Role badge */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    session.role === 'admin' 
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300' 
                      : session.role === 'agent' 
                      ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' 
                      : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    <Shield size={10} />
                    {session.role === 'admin' ? 'Administrator' : session.role === 'agent' ? 'IT Support Agent' : 'Karyawan / User'}
                  </span>

                  {/* Department badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-white/10 border border-white/10 text-indigo-100">
                    <Briefcase size={10} />
                    Dept: {session.department || 'Umum'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Assets Container */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider font-mono flex items-center gap-1.5">
                <Laptop size={14} className="text-slate-400" />
                Aset IT Pegangan Saya
              </h4>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase">
                {myAssets.length} Aset Terpaut
              </span>
            </div>

            {myAssets.length === 0 ? (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-6 text-center select-none">
                <Laptop className="mx-auto text-slate-350 mb-3" size={28} />
                <p className="text-xs font-bold text-slate-600">Tidak ada aset IT yang terdaftar atas nama Anda.</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-md mx-auto">
                  Semua inventori laptop, workstation, monitor, atau aksesori didaftarkan secara tersentralisasi oleh IT Helpdesk / Admin CMDB.
                </p>
                <div className="mt-4 bg-white border border-slate-200 rounded-lg p-2.5 max-w-sm mx-auto flex items-start gap-2.5 text-left">
                  <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-normal font-medium">
                    Butuh mengajukan laptop baru atau merubah kepemilikan aset? Silakan ajukan lewat tab <span className="font-bold text-slate-700">Manajemen Insiden / Ajukan Tiket</span> degan memilih Kategori <span className="font-bold text-indigo-600">Hardware</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {myAssets.map((asset) => (
                  <div 
                    key={asset.id} 
                    className="border border-slate-200/90 rounded-xl p-4 bg-white hover:border-indigo-400 hover:shadow-xs transition duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Asset Title Line */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wide">{asset.id}</span>
                            <h5 className="text-xs font-black text-slate-800 line-clamp-1">{asset.name}</h5>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          asset.status === 'Aktif' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                            : asset.status === 'Masa Perbaikan' 
                            ? 'bg-amber-50 border-amber-100 text-amber-700' 
                            : 'bg-slate-50 border-slate-150 text-slate-600'
                        }`}>
                          {asset.status}
                        </span>
                      </div>

                      {/* Detail Stats */}
                      <div className="mt-4 space-y-1.5 border-t border-slate-50 pt-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">Tipe Perangkat:</span>
                          <span className="text-slate-700 font-bold">{asset.type}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">Serial Number:</span>
                          <span className="text-slate-700 font-mono font-bold tracking-tight">{asset.serialNumber}</span>
                        </div>
                        {asset.ipAddress && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-medium">Alamat IP:</span>
                            <span className="text-slate-700 font-mono font-semibold">{asset.ipAddress}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-1.5 rounded-md mt-2 border border-slate-100">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="font-medium truncate" title={asset.location}>Lokasi: <span className="font-bold text-slate-700">{asset.location}</span></span>
                        </div>
                      </div>
                    </div>

                    {asset.purchaseDate && (
                      <div className="mt-3.5 border-t border-slate-100 pt-2 flex items-center justify-between text-[9px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar size={10} />
                          Tanggal Pembelian:
                        </span>
                        <span className="font-bold text-slate-600">{new Date(asset.purchaseDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAQ & Information Help Card */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3 select-none">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
              <HelpCircle size={14} className="text-slate-500" />
              Informasi Umum Aset & Serah Terima
            </h5>

            <div className="space-y-2.5 text-xs text-slate-650 font-medium">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 text-[11px]">Bagaimana cara melakukan serah terima aset?</p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Jika aset IT Anda berganti tangan ke karyawan lain, IT Agent atau Administrator harus memperbarui Pemegang Aset (Owner) di tab CMDB agar riwayat mutasi perpindahan terekam secara sah oleh sistem.
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 text-[11px]">Aset saya dipindahkan lokasinya, apa yang harus dilakukan?</p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Pastikan lokasi fisik yang tertera selalu akurat. Pembaruan lokasi fisik oleh IT Agent akan otomatis mencatat riwayat perubahan tempat penyimpanan pada log audit aset Nexus ITSM.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
            <Activity size={10} className="text-emerald-500" />
            Keamanan Enkripsi Akun Aktif
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-250 cursor-pointer hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-xs transition"
          >
            Tutup Jendela (Close)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
