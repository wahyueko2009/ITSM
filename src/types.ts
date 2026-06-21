/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  type: 'comment' | 'status_change' | 'system';
}

export type TicketPriority = 'Urgent' | 'Tinggi' | 'Sedang' | 'Rendah';
export type TicketStatus = 'Baru' | 'Ditugaskan' | 'Sedang Diproses' | 'Ditangguhkan' | 'Selesai';
export type TicketCategory = 'Hardware' | 'Software' | 'Jaringan' | 'Akses & Akun' | 'Sistem & Cloud';
export type TicketType = 
  | 'Incident'
  | 'Service Request'
  | 'Problem'
  | 'Change Request (RFC)'
  | 'Access Request'
  | 'Information Request'
  | 'Complaint / Feedback'
  | 'Project Request';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  ticketType: TicketType;
  requester: string;
  requesterEmail: string;
  department: string;
  assignedAgent: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  resolutionNotes?: string;
  workNotes: WorkNote[];
  linkedAssetId?: string;
  evidence?: string;
  evidenceName?: string;
}

export type ChangeRisk = 'Tinggi' | 'Sedang' | 'Rendah';
export type ChangeClassification = 'Standar' | 'Normal' | 'Darurat';
export type ChangeStatus = 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak' | 'Sedang Diimplementasi' | 'Selesai' | 'Batal';

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  reason: string;
  riskLevel: ChangeRisk;
  impact: string;
  implementationPlan: string;
  rollbackPlan: string;
  classification: ChangeClassification;
  status: ChangeStatus;
  requester: string;
  createdAt: string;
  targetDate: string;
  approver?: string;
  approvalDate?: string;
  cabMeetingDate?: string;
  cabVotes?: string; // stringified JSON e.g. {"Hendrik": "Setuju", "Wahyudi": "Setuju", "Rudi": "Belum Memilih"}
  cabNotes?: string;
  excelFile?: string;
  excelFileName?: string;
}

export type AssetType = 'Workstation' | 'Server' | 'Router' | 'Switch' | 'Cloud VM' | 'Lisensi Software' | 'Aksesori';
export type AssetStatus = 'Aktif' | 'Stok' | 'Rusak' | 'Masa Perbaikan' | 'Diarsipkan';

export interface SlaPolicy {
  id: string;
  category: string; // Service Level Category (e.g. Hardware, Software, Network)
  priorityCode: string; // Priority Code level (e.g., P1, P2, P3, P4)
  priorityName: string; // Descriptive value (e.g. Urgent, Tinggi, Sedang, Rendah)
  targetResolutionHours: number; // Resolution Target in hours
  targetResponseHours?: number; // Response Target in hours
  slaResponsePercent?: number; // Target SLA Response compliance percent (e.g. 99 for >= 99%)
  slaResolutionPercent?: number; // Target SLA Resolution compliance percent (e.g. 95 for >= 95%)
  effectiveYear: number; // Year of applicability (e.g., 2026, 2027)
  description?: string;
}

export type UserRole = 'admin' | 'agent' | 'user';

export interface DatabaseUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  password?: string;
  createdAt?: string;
}

export interface UserSession {
  email: string;
  name: string;
  role: UserRole;
  department: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  serialNumber: string;
  status: AssetStatus;
  owner: string;
  location: string;
  ipAddress?: string;
  linkedIncidentCount: number;
  purchaseDate: string;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  views: number;
  usefulnessRate: number;
  createdAt: string;
}

export interface CabMember {
  id: number;
  name: string;
  role: string;
  email: string;
  active: string; // 'Aktif' | 'Nonaktif'
}
