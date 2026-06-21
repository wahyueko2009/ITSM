/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Asset, AssetType, AssetStatus, DatabaseUser } from '../types';
import { 
  Laptop, Database, Router, ShieldAlert, Cpu, Key, Tag, 
  MapPin, Plus, Search, HelpCircle, Check, Info, User, History, ArrowRight, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AssetsTabProps {
  assets: Asset[];
  users?: DatabaseUser[];
  onAddAsset: (asset: Asset) => void;
  onUpdateAsset: (asset: Asset & { changeReason?: string }) => void;
  onDeleteAsset: (id: string) => void;
  token?: string | null;
}

export default function AssetsTab({ assets, users = [], onAddAsset, onUpdateAsset, onDeleteAsset, token = null }: AssetsTabProps) {
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets[0] || null);

  // Edit Asset States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AssetType>('Workstation');
  const [editSerial, setEditSerial] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIp, setEditIp] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editChangeReason, setEditChangeReason] = useState('');

  // Histories logs
  const [histories, setHistories] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch handover and location move history logs
  useEffect(() => {
    if (selectedAsset?.id && token) {
      setHistoryLoading(true);
      fetch(`/api/assets/${selectedAsset.id}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        setHistories(Array.isArray(data) ? data : []);
        setHistoryLoading(false);
      })
      .catch(err => {
        console.error("Gagal mengambil riwayat mutasi/penyerahan aset:", err);
        setHistoryLoading(false);
      });
    } else {
      setHistories([]);
    }
  }, [selectedAsset?.id, token]);

  const [validationError, setValidationError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AssetType>('Workstation');
  const [formSerial, setFormSerial] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');

  const handleDoubleClickAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditType(asset.type);
    setEditSerial(asset.serialNumber);
    setEditOwner(asset.owner);
    setEditLocation(asset.location);
    setEditIp(asset.ipAddress || '');
    setEditPurchaseDate(asset.purchaseDate || '');
    setEditChangeReason('');
    setValidationError('');
    setShowDeleteConfirm(false);
    setShowEditModal(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    if (!editName.trim() || !editSerial.trim() || !editOwner.trim()) {
      setValidationError('Silakan isi fields wajib: Nama Aset, Serial, dan Penanggung Jawab.');
      return;
    }

    const updated: Asset & { changeReason?: string } = {
      ...editingAsset,
      name: editName,
      type: editType,
      serialNumber: editSerial,
      owner: editOwner,
      location: editLocation || 'Gudang Kantor Pusat',
      ipAddress: editIp || undefined,
      purchaseDate: editPurchaseDate,
      changeReason: editChangeReason,
    };

    onUpdateAsset(updated);
    if (selectedAsset?.id === updated.id) {
      setSelectedAsset(updated);
    }
    setShowEditModal(false);
    setEditingAsset(null);
  };

  const handleDeleteTrigger = async () => {
    if (!editingAsset) return;
    const success = await (onDeleteAsset(editingAsset.id) as any);
    if (success !== false) {
      if (selectedAsset?.id === editingAsset.id) {
        setSelectedAsset(assets.find(a => a.id !== editingAsset.id) || null);
      }
      setShowEditModal(false);
      setShowDeleteConfirm(false);
      setEditingAsset(null);
    }
  };

  // Handle Filtering
  const filteredAssets = assets.filter(a => {
    const matchesSearch = 
      a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.ipAddress && a.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
      a.owner.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Submit Asset Form
  const handleSubmitAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSerial.trim() || !formOwner.trim()) {
      alert('Sila isi syarat wajib (Nama Aset, Serial, dan Penanggung Jawab)');
      return;
    }

    const nextIdNum = assets.length + 1;
    
    // Type abbreviation for ID prefix
    let prefix = 'AST-OTH';
    if (formType === 'Workstation') prefix = 'AST-LAP';
    else if (formType === 'Server') prefix = 'AST-SRV';
    else if (formType === 'Router' || formType === 'Switch') prefix = 'AST-NET';
    else if (formType === 'Lisensi Software') prefix = 'AST-LIC';
    else if (formType === 'Cloud VM') prefix = 'AST-VM';

    const newId = `${prefix}-${String(nextIdNum).padStart(3, '0')}`;
    
    const newAsset: Asset = {
      id: newId,
      name: formName,
      type: formType,
      serialNumber: formSerial,
      status: 'Stock' as AssetStatus,
      owner: formOwner,
      location: formLocation || 'Gudang Kantor Pusat',
      ipAddress: formIp || undefined,
      linkedIncidentCount: 0,
      purchaseDate: formPurchaseDate || new Date().toISOString().split('T')[0],
    };

    onAddAsset(newAsset);
    setShowAddModal(false);
    setSelectedAsset(newAsset);

    // Reset Form
    setFormName('');
    setFormSerial('');
    setFormOwner('');
    setFormLocation('');
    setFormIp('');
    setFormPurchaseDate('');
  };

  const handleStatusChange = (newStatus: AssetStatus) => {
    if (!selectedAsset) return;
    const updated = { ...selectedAsset, status: newStatus };
    onUpdateAsset(updated);
    setSelectedAsset(updated);
  };

  // Icon selector based on Asset Type
  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'Workstation': return <Laptop size={18} className="text-blue-500" />;
      case 'Server': return <Database size={18} className="text-indigo-500" />;
      case 'Router':
      case 'Switch': return <Router size={18} className="text-purple-500" />;
      case 'Cloud VM': return <Cpu size={18} className="text-sky-500" />;
      case 'Lisensi Software': return <Key size={18} className="text-teal-500" />;
      default: return <Tag size={18} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6" id="assets-tab-interface">
      {/* Search and filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari CMDB berdasarkan ID, nama perangkat, S/N, IP Address atau penanggung jawab..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 text-xs font-semibold text-slate-600">
            <span>Tipe:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1.5 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Workstation">Laptop / Workstation</option>
              <option value="Server">Server Fisik</option>
              <option value="Router">Hub / Router</option>
              <option value="Switch">Switch Jaringan</option>
              <option value="Cloud VM">Cloud Instance VM</option>
              <option value="Lisensi Software">Lisensi Software</option>
              <option value="Aksesori">Aksesori</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 text-xs font-semibold text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none focus:ring-0 py-1.5 cursor-pointer font-bold"
            >
              <option value="all">Semua</option>
              <option value="Aktif">Aktif / Terinstal</option>
              <option value="Stok">Stok Gudang</option>
              <option value="Rusak">Rusak</option>
              <option value="Masa Perbaikan">Masa Perbaikan</option>
              <option value="Diarsipkan">Diarsipkan</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Daftarkan CI Aset
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CMDB Browser (Left Side, 2 Cols) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Database Konfigurasi Aset CMDB ({filteredAssets.length})</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">ITIL compliant</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-100/50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">ID / Aset</th>
                  <th className="p-4">Tipe Perangkat</th>
                  <th className="p-4">S/N & IP Address</th>
                  <th className="p-4">Pemilik / Tim</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((a) => {
                  const isSelected = selectedAsset?.id === a.id;
                  
                  let badge = 'bg-slate-50 text-slate-700 border-slate-100';
                  if (a.status === 'Aktif') badge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  else if (a.status === 'Stok') badge = 'bg-blue-50 text-blue-700 border-blue-100';
                  else if (a.status === 'Rusak') badge = 'bg-red-50 text-red-700 border-red-100';
                  else if (a.status === 'Masa Perbaikan') badge = 'bg-amber-50 text-amber-700 border-amber-100';

                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAsset(a)}
                      onDoubleClick={() => handleDoubleClickAsset(a)}
                      title="Double klik untuk mengedit atau menghapus aset"
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isSelected ? 'bg-indigo-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="p-4 flex items-center gap-3">
                        {getAssetIcon(a.type)}
                        <div>
                          <p className="font-mono text-[11px] font-extrabold text-slate-400">{a.id}</p>
                          <p className="text-slate-800 font-bold max-w-xs truncate">{a.name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-semibold">{a.type}</td>
                      <td className="p-4">
                        <p className="font-mono text-slate-700 font-medium">{a.serialNumber}</p>
                        <p className="text-[10px] text-slate-400 font-bold font-mono">{a.ipAddress || 'No IP address'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-800 font-semibold">{a.owner}</p>
                        <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <MapPin size={10} />
                          {a.location}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${badge}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                      Konfigurasi Item tidak ditemukan dalam pencarian CMDB ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Item metadata Viewer card (Right side, 1 col) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Info size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Analisis Siklus Hidup Aset</h3>
          </div>

          {selectedAsset ? (
            <div className="p-6 space-y-5 flex-1">
              <div className="text-center pb-2">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  {getAssetIcon(selectedAsset.type)}
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-snug">{selectedAsset.name}</h4>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase font-mono mt-0.5">{selectedAsset.id}</p>
              </div>

              {/* Specs array */}
              <div className="divide-y divide-slate-100 border-t border-b border-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Tipe CI Aset</span>
                  <span className="font-bold text-slate-800">{selectedAsset.type}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-mono">Serial Number (S/N)</span>
                  <span className="font-mono font-bold text-slate-800">{selectedAsset.serialNumber}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Alamat IP Lokasi</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedAsset.ipAddress || 'Tidak Ada IP'}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Pemegang Hak Guna</span>
                  <span className="font-bold text-slate-800">{selectedAsset.owner}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Lokasi Penempatan</span>
                  <span className="font-semibold text-slate-700">{selectedAsset.location}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Tanggal Pengadaan</span>
                  <span className="font-semibold text-slate-700">{new Date(selectedAsset.purchaseDate).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Log Kasus Terkait</span>
                  <span className="font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded">{selectedAsset.linkedIncidentCount} tiket</span>
                </div>
              </div>

              {/* Asset Management Lifecycle Update */}
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Perbarui Siklus Hidup Aset</label>
                <div className="grid grid-cols-2 gap-2" id="asset-status-choices">
                  <button
                    onClick={() => handleStatusChange('Aktif')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                      selectedAsset.status === 'Aktif' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Aktif / In-Use
                  </button>
                  <button
                    onClick={() => handleStatusChange('Stok')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                      selectedAsset.status === 'Stok' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Stok Gudang
                  </button>
                  <button
                    onClick={() => handleStatusChange('Masa Perbaikan')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                      selectedAsset.status === 'Masa Perbaikan' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Masa Servis
                  </button>
                  <button
                    onClick={() => handleStatusChange('Rusak')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                      selectedAsset.status === 'Rusak' 
                        ? 'bg-red-50 text-red-700 border-red-200 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Rusak Total
                  </button>
                </div>
              </div>

              {/* Asset Handover & Location History Timeline */}
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-700">
                    <History size={15} />
                    <span>Riwayat Mutasi & Serah Terima</span>
                  </div>
                  <span className="bg-slate-100 text-slate-500 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {histories.length} Aktivitas
                  </span>
                </div>

                {historyLoading ? (
                  <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-medium">Memuat riwayat aset...</span>
                  </div>
                ) : histories.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3">
                    <ClipboardList className="mx-auto text-slate-300 mb-1.5" size={20} />
                    <p className="text-[10px] font-bold text-slate-500">Belum ada riwayat mutasi.</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Semua serah terima, perpindahan lokasi fisik, dan penggantian status akan tercatat otomatis di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 pl-1">
                    {histories.map((h, idx) => {
                      const isCreate = h.actionType === 'CREATE';
                      const isHandover = h.actionType === 'HANDOVER';
                      const isLocChange = h.actionType === 'LOCATION_CHANGE';
                      const isStatusChange = h.actionType === 'STATUS_CHANGE';

                      return (
                        <div key={h.id || idx} className="flex gap-3 relative text-left">
                          {/* Timeline dot */}
                          <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] border z-10 ${
                            isCreate ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            isHandover ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                            isLocChange ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            isStatusChange ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            {isCreate ? '🆕' : isHandover ? '👥' : isLocChange ? '📍' : isStatusChange ? '🔄' : '📝'}
                          </div>

                          <div className="space-y-1 py-0.5 flex-1 select-text">
                            {/* Type and Timestamp */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-800 leading-none">
                                {isCreate ? 'Aset Pertama Dibuat' :
                                 isHandover ? 'Serah Terima (Handover)' :
                                 isLocChange ? 'Perubahan Lokasi Fisik' :
                                 isStatusChange ? 'Pembaruan Siklus Hidup' : 'Aset Diperbarui'}
                              </span>
                              <span className="text-[9px] font-medium text-slate-400">
                                {new Date(h.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>

                            {/* Mutasi details */}
                            {isHandover && (
                              <div className="text-[10px] text-slate-600 font-medium bg-slate-50/70 p-1.5 rounded-md border border-slate-100 flex items-center gap-1.5">
                                <span className="bg-slate-200/85 px-1 py-0.2 rounded font-semibold text-slate-700">{h.fromUser || '—'}</span>
                                <ArrowRight size={10} className="text-slate-400" />
                                <span className="bg-indigo-50 text-indigo-750 px-1 py-0.2 rounded font-bold text-indigo-700">{h.toUser || '—'}</span>
                              </div>
                            )}

                            {isLocChange && (
                              <div className="text-[10px] text-slate-600 font-medium bg-slate-50/70 p-1.5 rounded-md border border-slate-100 flex items-center gap-1.5">
                                <span className="bg-slate-200/85 px-1 py-0.2 rounded font-semibold text-slate-705 shrink-0 select-none">📍 {h.fromLocation || '—'}</span>
                                <ArrowRight size={10} className="text-slate-400" />
                                <span className="bg-amber-50 text-amber-800 px-1 py-0.2 rounded font-bold shrink-0">📍 {h.toLocation || '—'}</span>
                              </div>
                            )}

                            {/* Notes */}
                            {h.notes && (
                              <p className="text-[10px] text-slate-500 italic leading-snug bg-slate-50/35 px-1.5 py-1 rounded">
                                "{h.notes}"
                              </p>
                            )}

                            {/* Author */}
                            <div className="text-[9px] text-slate-400 font-medium font-mono">
                              Oleh: {h.changedBy || 'system'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs flex-1 flex flex-col items-center justify-center">
              <HelpCircle className="text-slate-300 mb-2 animate-bounce" size={24} />
              <p>Sila pilih perangkat komputer / lisensi di sebelah kiri untuk audit siklus hidup & topologi aset.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD ASSET MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900">
                <span className="flex items-center gap-2">
                  <Database className="text-indigo-600" size={18} />
                  Daftarkan Item Konfigurasi (CI) CMDB Baru
                </span>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
              </div>

              <form onSubmit={handleSubmitAsset} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nama Perangkat Aset <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Cisco Switch Catalyst 9300 atau Laptop Thinkpad T14"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Aset (CI Type)</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as AssetType)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
                    >
                      <option value="Workstation">Workstation / Laptop</option>
                      <option value="Server">Server Fisik</option>
                      <option value="Router">Router WAN</option>
                      <option value="Switch">Switch Jaringan</option>
                      <option value="Cloud VM">Cloud Instance VM</option>
                      <option value="Lisensi Software">Lisensi / License API</option>
                      <option value="Aksesori">Aksesori Hardware</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Serial Number (S/N) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="S/N: C02JD922A9FK"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-mono text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Penanggung Jawab / User <span className="text-red-500">*</span></label>
                    <select
                      value={formOwner}
                      onChange={(e) => setFormOwner(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Pilih Karyawan --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.department || 'Hardware'}) — {u.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">IP Address (Jika Ada)</label>
                    <input
                      type="text"
                      placeholder="Contoh: 10.100.102.1"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Lokasi Fisik</label>
                    <input
                      type="text"
                      placeholder="Contoh: Lantai 2 Operations"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Pembelian</label>
                    <input
                      type="date"
                      value={formPurchaseDate}
                      onChange={(e) => setFormPurchaseDate(e.target.value)}
                      className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
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
                    Daftarkan Aset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditModal && editingAsset && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 relative"
            >
              {/* Custom Delete Confirmation Overlay */}
              {showDeleteConfirm && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-xl p-5 border border-slate-100 max-w-sm w-full space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                        <ShieldAlert className="text-rose-500" size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Mulai Konfirmasi Hapus Aset</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Apakah Anda yakin ingin menghapus aset <span className="font-semibold text-slate-700">"{editingAsset.name}"</span> ({editingAsset.id}) secara permanen?
                        </p>
                        <p className="text-[11px] text-rose-500 mt-2 bg-rose-50/50 p-2 rounded-md">
                          <strong>Ketentuan Keamanan:</strong> Aset hanya dapat dihapus jika tidak ada relasi atau rujukan aktif dari tiket/insiden mana pun.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteTrigger}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                      >
                        Ya, Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900">
                <span className="flex items-center gap-2">
                  <Database className="text-indigo-600" size={18} />
                  Detail & Edit Aset ({editingAsset.id})
                </span>
                <button onClick={() => { setShowEditModal(false); setEditingAsset(null); }} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="p-5 space-y-4">
                {validationError && (
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nama Perangkat Aset <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setValidationError(''); }}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Aset (CI Type)</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as AssetType)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
                    >
                      <option value="Workstation">Workstation / Laptop</option>
                      <option value="Server">Server Fisik</option>
                      <option value="Router">Router WAN</option>
                      <option value="Switch">Switch Jaringan</option>
                      <option value="Cloud VM">Cloud Instance VM</option>
                      <option value="Lisensi Software">Lisensi / License API</option>
                      <option value="Aksesori">Aksesori Hardware</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Serial Number (S/N) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={editSerial}
                      onChange={(e) => { setEditSerial(e.target.value); setValidationError(''); }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-mono text-slate-700"
                    />
                  </div>                   <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Penanggung Jawab / User <span className="text-red-500">*</span></label>
                    <select
                      value={editOwner}
                      onChange={(e) => { setEditOwner(e.target.value); setValidationError(''); }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Pilih Karyawan --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.department || 'Hardware'}) — {u.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">IP Address (Jika Ada)</label>
                    <input
                      type="text"
                      value={editIp}
                      onChange={(e) => setEditIp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Lokasi Fisik</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Pembelian</label>
                    <input
                      type="date"
                      value={editPurchaseDate}
                      onChange={(e) => setEditPurchaseDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-3">
                  <label className="block text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1.5 select-none">
                    <ClipboardList size={14} />
                    Alasan Perubahan / Mutasi (Opsional)
                  </label>
                  <textarea
                    placeholder="Contoh: Karyawan dimutasi ke tim baru atau laptop dipindahkan ke gudang."
                    value={editChangeReason}
                    onChange={(e) => setEditChangeReason(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 bg-slate-50 -mx-5 -mb-5 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Hapus Aset
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowEditModal(false); setEditingAsset(null); }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
