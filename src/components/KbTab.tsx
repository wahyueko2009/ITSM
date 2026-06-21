/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KBArticle, UserSession } from '../types';
import { 
  Plus, Search, HelpCircle, FileText, User, Eye, 
  ThumbsUp, BookOpen, ChevronRight, Tag, Trash2, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KbTabProps {
  articles: KBArticle[];
  onAddArticle: (article: KBArticle) => void;
  onUpdateArticle: (article: KBArticle) => void;
  onDeleteArticle: (id: string) => void;
  session: UserSession;
}

export default function KbTab({ articles, onAddArticle, onUpdateArticle, onDeleteArticle, session }: KbTabProps) {
  // Check authorization
  const canManageKB = session.role === 'admin' || session.role === 'agent' || session.name === 'Admin Support';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(articles[0] || null);

  // Add Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Keamanan');

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Calculate unique categories for visual filter chips
  const categories = ['all', 'Akses & Akun', 'Jaringan', 'Hardware', 'Software', 'Sistem & Cloud', 'Keamanan'];

  // Handle Filtering
  const filteredArticles = articles.filter(art => {
    const matchesSearch = 
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || art.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Create article helper
  const handleSubmitArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Sila isi semua syarat wajib (Judul dan Isi Manual)');
      return;
    }

    const nextIdNum = articles.length + 101;
    const newId = `KB-${nextIdNum}`;

    const newArt: KBArticle = {
      id: newId,
      title: formTitle,
      content: formContent,
      category: formCategory,
      author: session.name, // Current logged-in user names
      views: 1,
      usefulnessRate: 100,
      createdAt: new Date().toISOString(),
    };

    onAddArticle(newArt);
    setShowAddModal(false);
    setSelectedArticle(newArt);

    // Reset Form
    setFormTitle('');
    setFormContent('');
    setFormCategory('Keamanan');
  };

  // Open Edit Dialog
  const handleOpenEdit = (art: KBArticle) => {
    setEditTitle(art.title);
    setEditContent(art.content);
    setEditCategory(art.category);
    setShowEditModal(true);
  };

  // Save Edit helper
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;
    if (!editTitle.trim() || !editContent.trim()) {
      alert('Judul dan Isi artikel tidak boleh kosong!');
      return;
    }

    const updated: KBArticle = {
      ...selectedArticle,
      title: editTitle,
      content: editContent,
      category: editCategory,
    };

    onUpdateArticle(updated);
    setSelectedArticle(updated);
    setShowEditModal(false);
  };

  // Delete Article
  const handleDeleteClick = (art: KBArticle) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus artikel KB "${art.title}"?`)) {
      onDeleteArticle(art.id);
      const remaining = articles.filter(a => a.id !== art.id);
      setSelectedArticle(remaining[0] || null);
      setIsDetailPopupOpen(false); // Also close popup modal if open
    }
  };

  // Upvote/Rate usefulness
  const handleRateUsefulness = (helpful: boolean) => {
    if (!selectedArticle) return;

    const updated = { ...selectedArticle };
    
    // Simulate usefulness update algorithm
    const totalVotes = 10; // base mock multiplier
    const currentHelpfulCount = Math.round((updated.usefulnessRate / 100) * totalVotes);
    const newHelpfulCount = helpful ? currentHelpfulCount + 1 : currentHelpfulCount;
    const newTotalVotes = totalVotes + 1;

    updated.usefulnessRate = Math.round((newHelpfulCount / newTotalVotes) * 100);
    updated.views += 1;

    onUpdateArticle(updated);
    setSelectedArticle(updated);
  };

  return (
    <div className="space-y-6" id="kb-tab-interface">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 leading-none">
            <BookOpen className="text-indigo-600" size={18} />
            Basis Pengetahuan & Panduan Mandiri (Knowledge Base)
          </h3>
          <p className="text-xs text-slate-500 font-medium">Membantu pengguna mengatasi kendala TI umum secara langsung tanpa menunggu antrean Service Desk.</p>
        </div>

        {canManageKB && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center shadow-sm cursor-pointer self-start md:self-center"
          >
            <Plus size={16} />
            Tulis Artikel Baru
          </button>
        )}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari solusi berdasarkan kata kunci, judul, penjelasan atau modul program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-400 shadow-xs"
          />
        </div>

        {/* Chips Categories */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1" id="kb-category-chips">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedCategory === cat 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {cat === 'all' ? '✨ Semua Topik' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Articles list (Left side, 1 col) */}
        <div className="space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between pl-1">
            <div className="font-bold text-xs text-slate-500 uppercase tracking-widest font-mono">ARTIKEL LAINNYA ({filteredArticles.length})</div>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredArticles.map((art) => {
              const isSelected = selectedArticle?.id === art.id;
              
              return (
                <div
                  key={art.id}
                  onClick={() => {
                    setSelectedArticle(art);
                    // Simulate progressive views increment
                    const updated = { ...art, views: art.views + 1 };
                    onUpdateArticle(updated);
                  }}
                  onDoubleClick={() => {
                    setSelectedArticle(art);
                    const updated = { ...art, views: art.views + 1 };
                    onUpdateArticle(updated);
                    setIsDetailPopupOpen(true);
                  }}
                  title="Klik ganda untuk membuka popup"
                  className={`p-4 bg-white rounded-xl border transition cursor-pointer flex items-start gap-3 text-left group relative select-none ${
                    isSelected 
                      ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-sm bg-indigo-50/5' 
                      : 'border-slate-100/80 hover:border-slate-200 hover:shadow-xs'
                  }`}
                >
                  <FileText className="text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-400 uppercase font-mono">{art.id} • {art.category}</span>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                      {art.title}
                    </h4>
                    <p className="text-[11px] text-slate-505 line-clamp-2">
                      {art.content.replace(/[#*`]/g, '')}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 self-center shrink-0" />
                </div>
              );
            })}

            {filteredArticles.length === 0 && (
              <div className="bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Layanan manual belum tersedia untuk topik ini.
              </div>
            )}
          </div>
          
          <div className="text-[10.5px] text-slate-400 font-semibold italic pl-1 flex items-center gap-1 select-none leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100/60 mt-1">
            <span>💡</span>
            <span>Tip: Klik ganda (Double-click) pada ubin artikel untuk menampilkannya dalam jendela popup.</span>
          </div>
        </div>

        {/* Detailed Article Reader (Right side, 2 cols) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2 flex flex-col justify-between min-h-[400px]">
          {selectedArticle ? (
            <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-between">
              
              {/* Reading Space */}
              <div className="p-6 space-y-4">
                
                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded font-bold font-mono">
                    <Tag size={12} />
                    {selectedArticle.category}
                  </span>
                  <span>Diperbarui {new Date(selectedArticle.createdAt).toLocaleDateString('id-ID')}</span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {selectedArticle.title}
                </h2>

                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <User size={14} className="text-slate-400" />
                      Penulis: {selectedArticle.author}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Eye size={14} />
                      {selectedArticle.views} Kali dibaca
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold font-mono">
                      👍 {selectedArticle.usefulnessRate}% Bermanfaat
                    </span>
                  </div>

                  {canManageKB && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(selectedArticle)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Edit size={12} className="text-amber-600" />
                        Edit Artikel
                      </button>
                      <button
                        onClick={() => handleDeleteClick(selectedArticle)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} className="text-red-500" />
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {/* Body Text */}
                <div className="prose prose-slate prose-xs max-w-none text-slate-700 leading-relaxed pt-2 whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>

              {/* Utility: Rating Usefulness */}
              <div className="p-5 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
                <span className="font-semibold text-slate-600">Apakah artikel bantuan ini membantu memecahkan masalah Anda?</span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRateUsefulness(false)}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded font-bold transition cursor-pointer"
                  >
                    👎 Kurang
                  </button>
                  <button
                    onClick={() => handleRateUsefulness(true)}
                    className="px-3.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <ThumbsUp size={12} />
                    👍 Sangat Membantu
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs flex-1 flex flex-col items-center justify-center">
              <HelpCircle className="text-slate-300 mb-2" size={24} />
              <p>Sila pilih manual operasional / artikel bantuan di sebelah kiri untuk membaca instruksi pemecahan masalah.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD ARTICLE MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900">
                <span className="flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={18} />
                  Tulis Artikel Basis Pengetahuan (Knowledge Base)
                </span>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold" type="button">&times;</button>
              </div>

              <form onSubmit={handleSubmitArticle} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Judul Artikel / Pertanyaan Solutif <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Cara Menghubungkan VPN FortiClient pada macOS"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Topik</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
                  >
                    <option value="Akses & Akun">Akses & Akun</option>
                    <option value="Jaringan">Jaringan</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Sistem & Cloud">Sistem & Cloud</option>
                    <option value="Keamanan">Keamanan / Cyber Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Isi Manual / Solusi (Mendukung Teks Rinci) <span className="text-red-500">*</span></label>
                  <textarea
                    placeholder="Tuliskan petunjuk langkah-demi-langkah bagi administrator atau pengguna akhir untuk menyelesaikan kendala mereka..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    required
                    rows={6}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
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
                    Terbitkan Artikel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT ARTICLE MODAL --- */}
      <AnimatePresence>
        {showEditModal && selectedArticle && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900">
                <span className="flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={18} />
                  Edit Artikel Basis Pengetahuan ({selectedArticle.id})
                </span>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold" type="button">&times;</button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Judul Artikel / Pertanyaan Solutif <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Cara Menghubungkan VPN FortiClient pada macOS"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Topik</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
                  >
                    <option value="Akses & Akun">Akses & Akun</option>
                    <option value="Jaringan">Jaringan</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Sistem & Cloud">Sistem & Cloud</option>
                    <option value="Keamanan">Keamanan / Cyber Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Isi Manual / Solusi (Mendukung Teks Rinci) <span className="text-red-500">*</span></label>
                  <textarea
                    placeholder="Tuliskan petunjuk langkah-demi-langkah bagi administrator atau pengguna akhir untuk menyelesaikan kendala mereka..."
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    rows={6}
                    className="w-full bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 bg-slate-50 -mx-5 -mb-5 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DOUBLE-CLICK ARTICLE DETAIL POPUP MODAL --- */}
      <AnimatePresence>
        {isDetailPopupOpen && selectedArticle && (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-slate-100 flex flex-col"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900 shrink-0">
                <span className="flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={18} />
                  <span>Detail Artikel : {selectedArticle.id}</span>
                </span>
                <button 
                  onClick={() => setIsDetailPopupOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer transition"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded font-bold font-mono">
                    <Tag size={12} />
                    {selectedArticle.category}
                  </span>
                  <span>Diperbarui {new Date(selectedArticle.createdAt).toLocaleDateString('id-ID')}</span>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                  {selectedArticle.title}
                </h2>

                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <User size={14} className="text-slate-400" />
                      Penulis: {selectedArticle.author}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Eye size={14} />
                      {selectedArticle.views} Kali dibaca
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold font-mono">
                      👍 {selectedArticle.usefulnessRate}% Bermanfaat
                    </span>
                  </div>

                  {canManageKB && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleOpenEdit(selectedArticle);
                        }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Edit size={12} className="text-amber-600" />
                        Edit Artikel
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteClick(selectedArticle);
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} className="text-red-500" />
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {/* Body Text */}
                <div className="prose prose-slate prose-xs max-w-none text-slate-700 leading-relaxed pt-2 whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailPopupOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer transition text-center"
                >
                  Tutup Panduan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
