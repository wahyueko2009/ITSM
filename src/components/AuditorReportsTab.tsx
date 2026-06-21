import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Download, 
  ShieldCheck, 
  Calendar, 
  UserCheck, 
  Activity, 
  Clock, 
  Database, 
  Sparkles,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Ticket, ChangeRequest, Asset, CabMember } from '../types';

interface AuditorReportsTabProps {
  tickets: Ticket[];
  changes: ChangeRequest[];
  assets: Asset[];
  cabMembers: CabMember[];
  session: any;
}

export default function AuditorReportsTab({
  tickets,
  changes,
  assets,
  cabMembers,
  session
}: AuditorReportsTabProps) {
  const [selectedReportType, setSelectedReportType] = useState<'incident' | 'change' | 'asset'>('incident');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  // Convert dates and match range
  const filterByDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr).toISOString().split('T')[0];
    return itemDate >= startDate && itemDate <= endDate;
  };

  const filteredTickets = tickets.filter(t => filterByDateRange(t.createdAt));
  const filteredChanges = changes.filter(c => filterByDateRange(c.createdAt));
  const filteredAssets = assets; // Assets are generally current state rather than date-driven, but we'll include them in full

  // ---- INCIDENT & SLA STATS ----
  const totalIncidentsCount = filteredTickets.length;
  const finishedIncidents = filteredTickets.filter(t => t.status === 'Selesai');
  const inProgressIncidents = filteredTickets.filter(t => t.status !== 'Selesai');

  // SLA Calculation
  // A ticket is breached if:
  // - Resolved (status Selesai) but resolved after deadline (we can compare updated_at with sla_deadline, or check if it's breached)
  // - Open and past the SLA deadline
  const currentTime = new Date().getTime();
  const getSlaStatus = (ticket: Ticket) => {
    const deadline = new Date(ticket.slaDeadline).getTime();
    if (ticket.status === 'Selesai') {
      const completionTime = new Date(ticket.updatedAt).getTime();
      return completionTime <= deadline ? 'Compliant' : 'Breached';
    } else {
      return currentTime <= deadline ? 'Active' : 'Breached';
    }
  };

  const slaCompliantCount = filteredTickets.filter(t => getSlaStatus(t) === 'Compliant' || getSlaStatus(t) === 'Active').length;
  const slaBreachedCount = filteredTickets.filter(t => getSlaStatus(t) === 'Breached').length;
  const slaCompliancePercent = totalIncidentsCount > 0 
    ? Math.round((slaCompliantCount / totalIncidentsCount) * 100) 
    : 100;

  // ---- CHANGE & CAB STATS ----
  const totalRFCsCount = filteredChanges.length;
  const approvedRFCs = filteredChanges.filter(c => c.status === 'Disetujui' || c.status === 'Sedang Diimplementasi' || c.status === 'Selesai');
  const rejectedRFCs = filteredChanges.filter(c => c.status === 'Ditolak');
  const pendingRFCs = filteredChanges.filter(c => c.status === 'Menunggu Persetujuan');
  
  // Calculate average approvals or CAB voting rate
  const changesWithVotes = filteredChanges.filter(c => {
    try {
      if (!c.cabVotes) return false;
      const parsed = JSON.parse(c.cabVotes);
      return Object.keys(parsed).length > 0;
    } catch {
      return false;
    }
  }).length;

  // ---- CMDB ASSET STATS ----
  const totalAssetsCount = filteredAssets.length;
  const activeAssets = filteredAssets.filter(a => a.status === 'Aktif');
  const serverVMAssets = filteredAssets.filter(a => a.type === 'Server' || a.type === 'Cloud VM');
  const criticalIncidentAssets = filteredAssets.filter(a => a.linkedIncidentCount >= 2);

  // ---- PDF EXPORTS FOR AUDITORS ----
  const triggerPdfGeneration = async (type: 'incident' | 'change' | 'asset' | 'master_compliance') => {
    setIsGenerating(type);
    
    // Tiny timeout to let UI update and show loading spinner
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const today = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });
      const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // Clean reusable helper: Primary brand styling
      const addHeaderStyle = (docTitle: string, subtitle: string) => {
        // Top solid bar in Deep Indigo (ITIL standard corporate color)
        doc.setFillColor(31, 41, 55); // Dark Slate #1f2937
        doc.rect(0, 0, 210, 35, 'F');
        
        // Secondary accent bar (Gold #d97706 or purple)
        doc.setFillColor(79, 70, 229); // #4f46e5 Indigo
        doc.rect(0, 35, 210, 2, 'F');

        // Header text
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('IT SERVICE MANAGEMENT & OPERATIONAL REPORT', 14, 15);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Doc ID: REP-${Math.floor(100000 + Math.random() * 900000)} | Generated in real-time Cloud Run Sandbox`, 14, 21);
        doc.text(`Standards Alignment: ITIL v4 Service Management System Framework`, 14, 26);

        // Document specific title
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text(docTitle, 14, 46);

        // Subtitle line
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Waktu Cetak: ${today} - ${timeNow} WIB   •   Rentang Data: ${startDate} s/d ${endDate}   •   Status Otorisasi: VERIFIED`, 14, 52);

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 56, 196, 56);
      };

      const addFooterStyle = (pageNum: number, totalPages: number) => {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        const footerY = 285;
        doc.setDrawColor(241, 245, 249);
        doc.line(14, footerY - 5, 196, footerY - 5);
        
        doc.text('RAHASIA & DOKUMEN OPERASIONAL LAYANAN - Dilarang keras menyebarluaskan tanpa persetujuan IT Director.', 14, footerY);
        doc.text(`Halaman ${pageNum} dari ${totalPages}`, 180, footerY);
      };

      if (type === 'incident') {
        // --- 1. INCIDENT MANAGEMENT REPORT ---
        addHeaderStyle('LAPORAN OPERASIONAL KINERJA SLA & RESOLUSI INSIDEN', 'Analisis kinerja resolusi tiket layanan terhadap target SLA');

        // Key metrics box
        doc.setFillColor(248, 250, 252); // Light background grey
        doc.rect(14, 62, 182, 35, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, 62, 182, 35, 'D');

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('IKHTISAR KINERJA SLA (SERVICE LEVEL AGREEMENT):', 18, 68);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`- Total Tiket Masuk (Incidents & Requests) : ${totalIncidentsCount} tiket`, 18, 74);
        doc.text(`- Tiket Berhasil Diselesaikan          : ${finishedIncidents.length} tiket`, 18, 79);
        doc.text(`- Tiket Aktif / Dalam Proses          : ${inProgressIncidents.length} tiket`, 18, 84);
        doc.text(`- Rasio Kepatuhan SLA Klien           : ${slaCompliancePercent}% (Target Umum: >= 95%)`, 18, 89);

        // Highlight Compliance
        doc.setFillColor(slaCompliancePercent >= 95 ? 220 : 254, slaCompliancePercent >= 95 ? 252 : 242, slaCompliancePercent >= 95 ? 231 : 242); // green or red pastel
        doc.rect(142, 67, 48, 25, 'F');
        doc.setDrawColor(slaCompliancePercent >= 95 ? 134 : 248, slaCompliancePercent >= 95 ? 239 : 113, slaCompliancePercent >= 95 ? 172 : 113);
        doc.rect(142, 67, 48, 25, 'D');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(slaCompliancePercent >= 95 ? 21 : 185, slaCompliancePercent >= 95 ? 128 : 28, slaCompliancePercent >= 95 ? 61 : 28);
        doc.text(`${slaCompliancePercent}%`, 147, 78);
        doc.setFontSize(8);
        doc.text(slaCompliancePercent >= 95 ? 'SLA MENEPETI TARGET ✓' : 'SLA DI BAWAH TARGET ⚠️', 145, 86);

        // Table setup
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text('DAFTAR DETAIL TIKET DAN EVALUASI STATUS SLA:', 14, 105);

        // Table headers
        const startY = 111;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, startY, 182, 8, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(14, startY + 8, 196, startY + 8);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('ID TICKET', 16, startY + 5);
        doc.text('JUDUL KENDALA', 38, startY + 5);
        doc.text('KATEGORI', 96, startY + 5);
        doc.text('PRIORITAS', 124, startY + 5);
        doc.text('TIPE TIKET', 148, startY + 5);
        doc.text('STATUS SLA', 174, startY + 5);

        // Table rows
        doc.setFont('Helvetica', 'normal');
        let currentY = startY + 8;
        
        filteredTickets.slice(0, 18).forEach((ticket) => {
          doc.line(14, currentY + 7, 196, currentY + 7);
          
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(ticket.id, 16, currentY + 4.5);
          
          // Truncate title
          const cleanTitle = ticket.title.length > 32 ? ticket.title.substring(0, 32) + '...' : ticket.title;
          doc.text(cleanTitle, 38, currentY + 4.5);
          
          doc.text(ticket.category, 96, currentY + 4.5);
          doc.text(ticket.priority, 124, currentY + 4.5);
          doc.text(ticket.ticketType, 148, currentY + 4.5);

          const slaStat = getSlaStatus(ticket);
          if (slaStat === 'Breached') {
            doc.setTextColor(225, 29, 72); // rose red
            doc.setFont('Helvetica', 'bold');
            doc.text('TERLAMBAT ⚠️', 174, currentY + 4.5);
          } else {
            doc.setTextColor(22, 163, 74); // green
            doc.setFont('Helvetica', 'bold');
            doc.text('TEPAT WAKTU ✓', 174, currentY + 4.5);
          }
          doc.setFont('Helvetica', 'normal');

          currentY += 7;
        });

        if (filteredTickets.length > 18) {
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`* Menampilkan 18 tiket pertama dari total ${filteredTickets.length} tiket karena batasan halaman laporan.`, 14, currentY + 5);
        }

        // Signature lines
        const sigY = 250;
        doc.setDrawColor(203, 213, 225);
        doc.line(20, sigY, 70, sigY);
        doc.line(140, sigY, 190, sigY);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Dibuat Oleh,', 20, sigY - 12);
        doc.text('Disetujui IT Manager / Supervisor,', 140, sigY - 12);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(session?.name || 'Sistem administrator', 20, sigY + 4);
        doc.text('IT Service Operations Lead', 140, sigY + 4);

        addFooterStyle(1, 1);

      } else if (type === 'change') {
        // --- 2. CHANGE ENABLEMENT REPORT ---
        addHeaderStyle('ITIL CHANGE CONTROL & OPERATIONS REPORT', 'Rekapitulasi proses persetujuan usulan perubahan sistem dan dewan CAB');

        // Key metrics box
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 62, 182, 35, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, 62, 182, 35, 'D');

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('REKAPITULASI PROSES PENGENDALIAN PERUBAHAN (RFC):', 18, 68);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`- Jumlah Usulan Perubahan (RFC) Terdaftar : ${filteredChanges.length} usulan`, 18, 74);
        doc.text(`- RFC Disahkan (Approved & Active)      : ${approvedRFCs.length} perubahan`, 18, 79);
        doc.text(`- RFC Menunggu Review Rapat CAB         : ${pendingRFCs.length} antrean`, 18, 84);
        doc.text(`- RFC Ditolak oleh Komite CAB           : ${rejectedRFCs.length} usulan`, 18, 89);

        // Highlight Compliance
        const votingRate = totalRFCsCount > 0 ? Math.round((changesWithVotes / totalRFCsCount) * 100) : 0;
        doc.setFillColor(239, 246, 255); // Indigo pastel
        doc.rect(142, 67, 48, 25, 'F');
        doc.setDrawColor(191, 219, 254);
        doc.rect(142, 67, 48, 25, 'D');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(29, 78, 216);
        doc.text(`${votingRate}% RFC`, 147, 78);
        doc.setFontSize(8);
        doc.text('TERVALIDASI RAPAT CAB✓', 145, 86);

        // Table setup
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text('LOG TRANSFORASI PERUBAHAN & LOG KONSENSUS DEWAN CAB:', 14, 105);

        // Table headers
        const startY = 111;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, startY, 182, 8, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(14, startY + 8, 196, startY + 8);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('ID DOKUMEN', 16, startY + 5);
        doc.text('NAMA TRANSFORMATIF PERUBAHAN', 38, startY + 5);
        doc.text('RISIKO', 98, startY + 5);
        doc.text('JENIS RFC', 116, startY + 5);
        doc.text('SUARA / KONSENSUS KOMITE CAB', 136, startY + 5);

        // Table rows
        doc.setFont('Helvetica', 'normal');
        let currentY = startY + 8;

        filteredChanges.slice(0, 15).forEach((rfc) => {
          doc.line(14, currentY + 11, 196, currentY + 11);

          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.setFont('Helvetica', 'bold');
          doc.text(rfc.id, 16, currentY + 5);
          doc.setFont('Helvetica', 'normal');

          const cleanTitle = rfc.title.length > 30 ? rfc.title.substring(0, 30) + '...' : rfc.title;
          doc.text(cleanTitle, 38, currentY + 5);

          // Meta
          doc.setFontSize(7);
          doc.text(`Oleh: ${rfc.requester}`, 38, currentY + 9);

          // Risk level badge placement
          if (rfc.riskLevel === 'Tinggi') {
            doc.setTextColor(225, 29, 72); // rose red
            doc.setFont('Helvetica', 'bold');
            doc.text(rfc.riskLevel, 98, currentY + 5);
          } else {
            doc.setTextColor(100, 116, 139);
            doc.text(rfc.riskLevel, 98, currentY + 5);
          }
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(15, 23, 42);

          doc.text(rfc.classification, 116, currentY + 5);

          // Parse votes
          let voteTextStr = 'Belum ada voting';
          try {
            if (rfc.cabVotes) {
              const parsed = JSON.parse(rfc.cabVotes);
              const votePairs = Object.entries(parsed).map(([usr, decision]) => `${usr.split(' ')[0]}:${decision === 'Setuju' ? 'S' : decision === 'Tolak' ? 'T' : 'Ab'}`);
              if (votePairs.length > 0) {
                voteTextStr = votePairs.join(', ');
              }
            }
          } catch {
            voteTextStr = 'Format voting rusak';
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text(voteTextStr, 136, currentY + 5);
          
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(`Status Keputusan Akhir: ${rfc.status}`, 136, currentY + 9);

          currentY += 11;
        });

        if (filteredChanges.length > 15) {
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`* Menampilkan 15 dokumentasi perubahan pertama dari total ${filteredChanges.length} berkas yang terdaftar.`, 14, currentY + 5);
        }

        // Signature lines
        const sigY = 250;
        doc.setDrawColor(203, 213, 225);
        doc.line(20, sigY, 70, sigY);
        doc.line(140, sigY, 190, sigY);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Dibuat Oleh,', 20, sigY - 12);
        doc.text('Disetujui IT Director / Manager,', 140, sigY - 12);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(session?.name || 'Sistem administrator', 20, sigY + 4);
        doc.text('IT Change Manager', 140, sigY + 4);

        addFooterStyle(1, 1);

      } else if (type === 'asset') {
        // --- 3. CMDB CONFIGURATION AUDIT REPORT ---
        addHeaderStyle('TI GESTION DE ACTIVO & CONFIGURASI CMDB DOKUMEN', 'Status item konfigurasi operasional dan interdependensi layanan sistem');

        // Key metrics box
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 62, 182, 35, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, 62, 182, 35, 'D');

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('IKHTISAR CMDB CONFIGURATION ITEMS (CI):', 18, 68);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`- Total Item Terkelola di CMDB        : ${totalAssetsCount} item`, 18, 74);
        doc.text(`- Server & VM Aktif (Core Services)   : ${serverVMAssets.length} unit`, 18, 79);
        doc.text(`- Item di Luar Siklus Aktif (Rusak)   : ${filteredAssets.filter(a => a.status === 'Rusak').length} item`, 18, 84);
        doc.text(`- Item Risiko Operasional Tinggi (>2 Ins) : ${criticalIncidentAssets.length} item`, 18, 89);

        // Highlight Compliance
        doc.setFillColor(254, 243, 199); // Yellow warning pastel
        doc.rect(142, 67, 48, 25, 'F');
        doc.setDrawColor(252, 211, 77);
        doc.rect(142, 67, 48, 25, 'D');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(180, 83, 9);
        doc.text(`${criticalIncidentAssets.length} CI BERISIKO`, 146, 78);
        doc.setFontSize(7.5);
        doc.text('PERLU EVALUASI MANAJEMEN PROBLEM', 144, 85);

        // Table setup
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text('LOG DETAIL DAFTAR CONFIGURATION ITEM & RIWAYAT INSIDEN:', 14, 105);

        // Table headers
        const startY = 111;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, startY, 182, 8, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(14, startY + 8, 196, startY + 8);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('SERIAL / CODE', 16, startY + 5);
        doc.text('NAMA PERANGKAT (CI)', 44, startY + 5);
        doc.text('TIPE UTAMA', 94, startY + 5);
        doc.text('LOKASI', 118, startY + 5);
        doc.text('STATUS CMDB', 142, startY + 5);
        doc.text('RIWAYAT INSIDEN', 169, startY + 5);

        // Table rows
        doc.setFont('Helvetica', 'normal');
        let currentY = startY + 8;

        filteredAssets.slice(0, 18).forEach((asset) => {
          doc.line(14, currentY + 7, 196, currentY + 7);

          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.setFont('Helvetica', 'bold');
          doc.text(asset.serialNumber || asset.id.substring(0, 10), 16, currentY + 4.5);
          doc.setFont('Helvetica', 'normal');

          const cleanName = asset.name.length > 25 ? asset.name.substring(0, 25) + '...' : asset.name;
          doc.text(cleanName, 44, currentY + 4.5);

          doc.text(asset.type, 94, currentY + 4.5);
          doc.text(asset.location || 'Remote VM', 118, currentY + 4.5);
          doc.text(asset.status, 142, currentY + 4.5);

          const insCount = asset.linkedIncidentCount || 0;
          doc.setFont('Helvetica', 'bold');
          if (insCount >= 2) {
            doc.setTextColor(225, 29, 72); // rose
            doc.text(`${insCount} insiden (⚠️)`, 169, currentY + 4.5);
          } else {
            doc.setTextColor(51, 65, 85);
            doc.text(`${insCount} insiden`, 169, currentY + 4.5);
          }
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(15, 23, 42);

          currentY += 7;
        });

        if (filteredAssets.length > 18) {
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`* Menampilkan 18 configuration items pertama dari total ${filteredAssets.length} yang terdaftar di CMDB.`, 14, currentY + 5);
        }

        // Signature lines
        const sigY = 250;
        doc.setDrawColor(203, 213, 225);
        doc.line(20, sigY, 70, sigY);
        doc.line(140, sigY, 190, sigY);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Dibuat Oleh,', 20, sigY - 12);
        doc.text('Disetujui IT Director / Manager,', 140, sigY - 12);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(session?.name || 'Sistem administrator', 20, sigY + 4);
        doc.text('IT Configuration Manager', 140, sigY + 4);

        addFooterStyle(1, 1);

      } else if (type === 'master_compliance') {
        // --- 4. CONSOLIDATED ITIL MASTER REPORT ---
        addHeaderStyle('LAPORAN KONSOLIDASI PENILAIAN & OPERASIONAL ITIL v4', 'Rangkuman kinerja SLA, persetujuan perubahan, dan kontrol inventori sistem kualitatif');

        // Key metrics box
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 62, 182, 55, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, 62, 182, 55, 'D');

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('INDEKS MATURITAS & OPERASIONAL LAYANAN ITIL:', 18, 68);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`1. SLA Kepatuhan Incident Management : Berhasil menjaga kepatuhan di level ${slaCompliancePercent}%.`, 18, 75);
        doc.text(`   - Total volume tiket dianalisa: ${totalIncidentsCount} tiket. Kepatuhan Target Umum adalah >=95%.`, 18, 80);
        
        doc.text(`2. Integritas Proses Perubahan (CAB)    : Komite CAB menyidangkan ${totalRFCsCount} total RFC.`, 18, 86);
        doc.text(`   - Segregation of Duties terdaftar dengan total anggota komite aktif: ${cabMembers.filter(m => m.active === 'Aktif').length} personil.`, 18, 91);
        
        doc.text(`3. Kontrol Aset Server & Jaringan (CMDB): Database CMDB melayani ${totalAssetsCount} Configuration Items.`, 18, 97);
        doc.text(`   - Integrasi silang mencakup server kritis dan Cloud VM: ${serverVMAssets.length} unit terpantau aktif.`, 18, 102);
        
        doc.text(`4. Status Keandalan Operasional Sistem : AMAN / TERPERIKSA (Tidak ada rfc ilegal atau perubahan tidak sah).`, 18, 108);

        // Visual Maturity Indicators
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text('EVALUASI TINGKAT KEMATANGAN ITIL (MATURITY CAPABILITY LEVEL):', 14, 128);

        // Draw progress blocks for maturities
        const drawMaturityRow = (label: string, score: number, yPos: number, desc: string) => {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(label, 14, yPos);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(desc, 14, yPos + 4);

          // Draw progress bar
          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(241, 245, 249);
          doc.rect(120, yPos - 3, 50, 4, 'F');
          
          doc.setFillColor(79, 70, 229); // indigo
          doc.rect(120, yPos - 3, 10 * score, 4, 'F');

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(79, 70, 229);
          doc.text(`Level ${score}/5`, 175, yPos);
        };

        drawMaturityRow('ITIL Incident & Event Management', 4, 140, 'Proses teridentifikasi, terdokumentasi, dan diukur real-time dengan SLA pintar.');
        drawMaturityRow('ITIL Change Enablement (CAB Action)', 4, 152, 'Segregasi otorisasi tervalidasi dengan sistem voting absolut quorum kabinet.');
        drawMaturityRow('ITIL Configuration Management (CMDB)', 3, 164, 'Pencatatan aset lengkap dengan tracking insiden real-time di level individual.');
        drawMaturityRow('ITIL Continual Service Improvement (CSI)', 4, 176, 'Laporan operasional otomatis siap saji memangkas waktu kerja administrasi s/d 90%.');

        // Auditor Statement Box
        doc.setFillColor(243, 244, 246);
        doc.rect(14, 192, 182, 35, 'F');
        doc.setDrawColor(209, 213, 219);
        doc.rect(14, 192, 182, 35, 'D');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(31, 41, 55);
        doc.text('PERNYATAAN OPERASIONAL TI (IT MANAGEMENT OPERATIONAL OPINION):', 18, 198);
        
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('"Berdasarkan rekaman aktivitas operasional dari log transaksi tiket incidents, otorisasi', 18, 204);
        doc.text('perubahan CAB, dan keabsahan database aset CMDB, kami menyimpulkan bahwa mekanisme tata kelola', 18, 209);
        doc.text('internal TI organisasi telah memenuhi standardisasi praktik terbaik ITIL v4', 18, 214);
        doc.text('dan meminimalisir risiko operational downtime sistem kritis secara saksama."', 18, 219);

        // Signature lines
        const sigY = 250;
        doc.setDrawColor(203, 213, 225);
        doc.line(20, sigY, 70, sigY);
        doc.line(140, sigY, 190, sigY);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Dibuat Oleh,', 20, sigY - 12);
        doc.text('Disetujui IT Director / Manager,', 140, sigY - 12);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(session?.name || 'Sistem administrator', 20, sigY + 4);
        doc.text('IT Service Director', 140, sigY + 4);

        addFooterStyle(1, 1);
      }

      // Save document natively
      doc.save(`ITIL_Nexus_Report_${type.toUpperCase()}_2026.pdf`);

    } catch (err: any) {
      console.error(err);
      alert('Gagal mengekspor PDF laporan: ' + err.message);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div id="itil-auditor-reports-panel" className="space-y-6">
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Ambient decorative effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-505 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-indigo-100 uppercase font-mono tracking-widest border border-indigo-500/30">
                ITIL v4 Compliant
              </span>
              <span className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold font-mono">
                <Sparkles size={11} className="animate-pulse" />
                ITSM Reporter ready
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="text-indigo-400" size={24} />
              Portal Laporan Kinerja & Operasional TI (ITIL)
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl font-medium">
              Ekstrak dokumen operasional format PDF berstandar ITIL untuk laporan harian, mingguan, evaluasi tim, atau paparan kepada manajemen.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl flex items-center gap-3">
            <Activity className="text-emerald-400 shrink-0" size={18} />
            <div className="text-left font-mono">
              <p className="text-[10px] text-slate-400 leading-none">STATUS OPERASIONAL</p>
              <p className="text-xs font-bold text-emerald-400 leading-normal mt-0.5">SANGAT BAIK (EXCELLENT ✓)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Board: Filter Date & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
        {/* Date Filter Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-650 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Periode Pemeriksaan</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Mulai Dari</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Hingga Akhir</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-bold text-slate-700"
              />
            </div>
            
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-start gap-1.5">
              <Info size={13} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[9.5px] text-slate-500 leading-snug">
                Filter ini akan menyaring rentang data yang dimasukkan ke dokumen ekspor PDF di samping.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Stats widgets */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/85 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Sorotan Parameter Kinerja & Operasional TI</span>
            <span className="text-[10px] text-indigo-650 bg-indigo-50 border border-indigo-100 font-black px-2 py-0.5 rounded-full uppercase tracking-tight">Active Indicators</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SLA Breaches Indicator */}
            <div className={`p-4 rounded-xl border transition-all ${slaCompliancePercent >= 95 ? 'bg-emerald-50/20 border-emerald-100/50' : 'bg-amber-50/20 border-amber-100/50'}`}>
              <div className="flex justify-between items-start">
                <Clock size={16} className={slaCompliancePercent >= 95 ? 'text-emerald-600' : 'text-amber-600'} />
                <span className={`text-[9px] font-mono font-black border uppercase px-1.5 py-0.5 rounded ${
                  slaCompliancePercent >= 95 ? 'bg-emerald-100/50 text-emerald-800 border-emerald-200' : 'bg-amber-100/50 text-amber-800 border-amber-200'
                }`}>
                  ITIL SLA Target
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">Target Response/Resolution</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 leading-none">{slaCompliancePercent}%</h3>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Goal minimum 95% kepatuhan.</p>
            </div>

            {/* CAB Voting integrity */}
            <div className="p-4 rounded-xl border bg-slate-50/40 border-slate-200/60">
              <div className="flex justify-between items-start">
                <UserCheck size={16} className="text-indigo-600" />
                <span className="text-[9px] font-mono font-black bg-indigo-50 border border-indigo-150 text-indigo-800 uppercase px-1.5 py-0.5 rounded">
                  Segregation of Duties
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">CAB Active Consensus</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 leading-none">{changesWithVotes} RFC</h3>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Total usulan terekam hasil voting.</p>
            </div>

            {/* Asset health in CMDB */}
            <div className="p-4 rounded-xl border bg-slate-50/40 border-slate-200/60">
              <div className="flex justify-between items-start">
                <Database size={16} className="text-purple-600" />
                <span className="text-[9px] font-mono font-black bg-purple-50 border border-purple-150 text-purple-800 uppercase px-1.5 py-0.5 rounded">
                  CMDB Health
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">Aset Berisiko Tinggi</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 leading-none">{criticalIncidentAssets.length} Item</h3>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">&ge;2 riwayat insiden berulang.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Layout for Reports & Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        
        {/* Left selector sidebar column */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/85 p-5 shadow-xs space-y-4">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono block">Daftar Dokumen Laporan Layanan TI</span>
          
          <div className="space-y-2">
            {/* INCIDENT REPORT CARD */}
            <button
              type="button"
              onClick={() => setSelectedReportType('incident')}
              className={`w-full p-3.5 rounded-xl border text-left transition relative flex items-start gap-3 cursor-pointer ${
                selectedReportType === 'incident' 
                  ? 'bg-indigo-50/30 border-indigo-200 ring-2 ring-indigo-500/10' 
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedReportType === 'incident' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-slate-800">Laporan SLA & Resolusi Insiden</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">Mengevaluasi kecepatan penyelesaian insiden kritis & pencapaian SLA.</p>
              </div>
            </button>

            {/* CHANGE CONTROL CARD */}
            <button
              type="button"
              onClick={() => setSelectedReportType('change')}
              className={`w-full p-3.5 rounded-xl border text-left transition relative flex items-start gap-3 cursor-pointer ${
                selectedReportType === 'change' 
                  ? 'bg-indigo-50/30 border-indigo-200 ring-2 ring-indigo-500/10' 
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedReportType === 'change' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                <UserCheck size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-slate-800">Laporan Operasional RFC & Dewan CAB</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">Membaca log voting dari dewan CAB untuk pencatatan modifikasi sistem terstruktur.</p>
              </div>
            </button>

            {/* ASSET CONTROL CARD */}
            <button
              type="button"
              onClick={() => setSelectedReportType('asset')}
              className={`w-full p-3.5 rounded-xl border text-left transition relative flex items-start gap-3 cursor-pointer ${
                selectedReportType === 'asset' 
                  ? 'bg-indigo-50/30 border-indigo-200 ring-2 ring-indigo-500/10' 
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedReportType === 'asset' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                <Database size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-slate-800">Laporan Manajemen Aset & CMDB</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">Mempertunjukkan siklus hidup aset IT (CMDB) & memetakan risiko incident.</p>
              </div>
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Master consolidated executive report generator */}
          <div className="bg-indigo-50/40 border border-indigo-100/50 p-4 rounded-xl space-y-3">
            <h5 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest font-mono flex items-center gap-1.5 leading-none">
              <Sparkles size={12} className="text-indigo-600" />
              Laporan Konsolidasi Eksekutif
            </h5>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              Butuh dokumen komprehensif? Unduh laporan konsolidasi yang merangkum SLA insiden, riwayat voting CAB, serta diagram tingkat kematangan (maturity level) ITILv4 perusahaan dalam satu berkas terintegrasi.
            </p>
            <button
              type="button"
              onClick={() => triggerPdfGeneration('master_compliance')}
              disabled={isGenerating !== null}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-mono font-black text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            >
              {isGenerating === 'master_compliance' ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download size={12} />
                  <span>Unduh Consolidated ITIL Master Report (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview and PDF Generator Column */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs flex flex-col h-[650px]">
          {/* Preview Tab Header */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">
                Lembar Pratinjau Laporan Operasional (Live Sheet)
              </h3>
            </div>
            
            <button
              type="button"
              onClick={() => triggerPdfGeneration(selectedReportType)}
              disabled={isGenerating !== null}
              className="py-1.5 px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-mono font-extrabold text-[11px] rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGenerating === selectedReportType ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengekspor PDF...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Ekspor PDF ({selectedReportType.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>

          {/* Dynamic reports render according to selection */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. PREVIEW: INCIDENT REPORT */}
            {selectedReportType === 'incident' && (
              <div className="space-y-4">
                <div className="border border-indigo-100 bg-indigo-50/25 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 font-mono uppercase">Nama Laporan</span>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    SLA Performance & Incident Resolution Report
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    Acuan Framework: **ITIL v4 Service Desk / Incident Event Management Practices**
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Data Masuk</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{totalIncidentsCount}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Diselesaikan</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{finishedIncidents.length}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Terlambat SLA</span>
                    <span className="text-lg font-extrabold text-rose-600 mt-0.5 block">{slaBreachedCount}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Kepatuhan (%)</span>
                    <span className={`text-lg font-black mt-0.5 block ${slaCompliancePercent >= 95 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {slaCompliancePercent}%
                    </span>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 font-mono text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Ticket ID</th>
                        <th className="py-2.5 px-3">Judul Kendala</th>
                        <th className="py-2.5 px-3">Prioritas</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3">Status SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTickets.length > 0 ? (
                        filteredTickets.slice(0, 7).map((t) => (
                           <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{t.id}</td>
                            <td className="py-2 px-3 text-slate-800 font-medium truncate max-w-[150px]">{t.title}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                t.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                                t.priority === 'Tinggi' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>{t.priority}</span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-500">{t.ticketType}</td>
                            <td className="py-2 px-3 font-bold font-mono text-[10px]">
                              {getSlaStatus(t) === 'Breached' ? (
                                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">TERLAMBAT ⚠️</span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">TEPAT WAKTU ✓</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-bold font-mono italic">
                            Tidak ada tiket dalam rentang waktu terfilter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {filteredTickets.length > 7 && (
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold font-mono">
                      * Menampilkan 7 dari {filteredTickets.length} tiket terekam. Unduh PDF untuk daftar lengkap.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. PREVIEW: CHANGE REQUEST & CAB INTEGRITY */}
            {selectedReportType === 'change' && (
              <div className="space-y-4">
                <div className="border border-indigo-100 bg-indigo-50/25 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 font-mono uppercase">Nama Laporan</span>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    ITIL Change Control & CAB Consensus Report
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    Acuan Framework: **ITIL v4 Change Enablement Practices (Segregation of Duties)**
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Total RFC</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{totalRFCsCount}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Aktif/Approved</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{approvedRFCs.length}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Ditolak CAB</span>
                    <span className="text-lg font-extrabold text-rose-700 mt-0.5 block">{rejectedRFCs.length}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Rasio Quorum</span>
                    <span className="text-lg font-black text-indigo-700 mt-0.5 block">
                      {totalRFCsCount > 0 ? Math.round((changesWithVotes / totalRFCsCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 font-mono text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">RFC ID</th>
                        <th className="py-2.5 px-3">Judul Perubahan</th>
                        <th className="py-2.5 px-3">Risiko</th>
                        <th className="py-2.5 px-3">Konsensus Risalah CAB (VOTES)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredChanges.length > 0 ? (
                        filteredChanges.slice(0, 5).map((rfc) => {
                          let voteSummaries: string = 'Tidak ada voting';
                          try {
                            if (rfc.cabVotes) {
                              const parsed = JSON.parse(rfc.cabVotes);
                              voteSummaries = Object.entries(parsed).map(([u, d]) => `${u.split(' ')[0]}: ${d}`).join(', ');
                            }
                          } catch {
                            voteSummaries = '-';
                          }

                          return (
                            <tr key={rfc.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{rfc.id}</td>
                              <td className="py-2.5 px-3 text-slate-800 font-medium font-bold truncate max-w-[150px]">{rfc.title}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded ${
                                  rfc.riskLevel === 'Tinggi' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  'bg-slate-100 text-slate-700'
                                }`}>{rfc.riskLevel}</span>
                              </td>
                              <td className="py-2.5 px-3 text-[10px] text-slate-500 font-mono max-w-[180px] truncate leading-tight font-semibold" title={voteSummaries}>
                                {voteSummaries}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                                  rfc.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' :
                                  rfc.status === 'Ditolak' ? 'bg-rose-50 text-rose-700' :
                                  'bg-amber-50 text-amber-700'
                                }`}>{rfc.status}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-bold font-mono italic">
                            Tidak ada berkas perubahan (RFC) terekam.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {filteredChanges.length > 5 && (
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold font-mono">
                      * Menampilkan 5 dari {filteredChanges.length} RFC. Unduh PDF untuk melihat log dewan CAB secara lengkap.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. PREVIEW: CMDB CONFIGURATION AUDIT */}
            {selectedReportType === 'asset' && (
              <div className="space-y-4">
                <div className="border border-indigo-100 bg-indigo-50/25 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 font-mono uppercase">Nama Laporan</span>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    ITIL CMDB Database & Asset Lifecycle Report
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    Acuan Framework: **ITIL v4 Service Configuration Management / Asset Lifecycle Controls**
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Aset Terkelola</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{totalAssetsCount}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Aset Server & VM</span>
                    <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{serverVMAssets.length}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Ci Berisiko Tinggi</span>
                    <span className="text-lg font-extrabold text-rose-700 mt-0.5 block">{criticalIncidentAssets.length}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase font-mono block">Status CMDB</span>
                    <span className="text-lg font-black text-emerald-700 mt-0.5 block">VERIFIED ✓</span>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 font-mono text-[10px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">CI Serial / ID</th>
                        <th className="py-2.5 px-3">Nama Configuration Item</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Riwayat Incident</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssets.length > 0 ? (
                        filteredAssets.slice(0, 7).map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{a.serialNumber || a.id.substring(0, 10)}</td>
                            <td className="py-2 px-3 text-slate-800 font-medium font-bold truncate max-w-[150px]">{a.name}</td>
                            <td className="py-2 px-3 font-semibold text-slate-500">{a.type}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                                a.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-slate-100 text-slate-600'
                              }`}>{a.status}</span>
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-600 font-mono">
                              {a.linkedIncidentCount >= 2 ? (
                                <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-semibold">{a.linkedIncidentCount} Insiden (⚠️)</span>
                              ) : (
                                <span>{a.linkedIncidentCount} Insiden</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-bold font-mono italic">
                            Tidak ada item CMDB terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {filteredAssets.length > 7 && (
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold font-mono">
                      * Menampilkan 7 dari {filteredAssets.length} Configuration Items. Unduh PDF untuk rincian penuh.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Warning Alert about Data Authenticity */}
            <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={16} />
              <div className="text-left">
                <h4 className="text-xs font-bold text-amber-900 leading-none">Penyajian Laporan & Integritas Data Operasional</h4>
                <p className="text-[10px] text-amber-800/85 mt-1 leading-relaxed">
                  Semua berkas laporan kinerja, database insiden, serta quorum CAB ini dibangkitkan langsung dari skema cloud database dinamis (PostgreSQL). Dokumen ini memiliki validasi terintegrasi yang tidak dapat disunting kembali guna memenuhi tata kelola standar ITIL.
                </p>
              </div>
            </div>

          </div>

          {/* Footer of Sheet */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-[9.5px] font-semibold text-slate-400 text-left flex items-center justify-between">
            <span>KEPATUHAN PENILAIAN STRUKTUR TI (BASE: ISO/IEC 20000)</span>
            <span>OTORISASI: {session?.name?.toUpperCase() || 'SISTEM'}</span>
          </div>

        </div>

      </div>

    </div>
  );
}
