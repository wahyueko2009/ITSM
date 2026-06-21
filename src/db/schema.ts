import { integer, pgTable, serial, text, timestamp, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table managed via Firebase Auth sync
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  department: text('department').notNull().default('General'),
  password: text('password'), // Local password for testing/simulation
  createdAt: timestamp('created_at').defaultNow(),
});

// Tickets table
export const tickets = pgTable('tickets', {
  id: text('id').primaryKey(), // Using exact ID e.g., TCK-xxxx
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull(), // 'Urgent' | 'Tinggi' | 'Sedang' | 'Rendah'
  status: text('status').notNull(), // 'Baru' | 'Ditugaskan' | 'Sedang Diproses' | 'Ditangguhkan' | 'Selesai'
  category: text('category').notNull(), // TicketCategory
  ticketType: text('ticket_type').notNull(), // TicketType
  requester: text('requester').notNull(),
  requesterEmail: text('requester_email').notNull(),
  department: text('department').notNull(),
  assignedAgent: text('assigned_agent').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  slaDeadline: text('sla_deadline').notNull(),
  resolutionNotes: text('resolution_notes'),
  linkedAssetId: text('linked_asset_id'),
});

// Work notes table
export const workNotes = pgTable('work_notes', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id')
    .references(() => tickets.id, { onDelete: 'cascade' })
    .notNull(),
  author: text('author').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
  type: text('type').notNull(), // 'comment' | 'status_change' | 'system'
});

// Change Requests table
export const changeRequests = pgTable('change_requests', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  reason: text('reason').notNull(),
  riskLevel: text('risk_level').notNull(), // 'Tinggi' | 'Sedang' | 'Rendah'
  impact: text('impact').notNull(),
  implementationPlan: text('implementation_plan').notNull(),
  rollbackPlan: text('rollback_plan').notNull(),
  classification: text('classification').notNull(), // 'Standar' | 'Normal' | 'Darurat'
  status: text('status').notNull(), // ChangeStatus
  requester: text('requester').notNull(),
  createdAt: text('created_at').notNull(),
  targetDate: text('target_date').notNull(),
  approver: text('approver'),
  approvalDate: text('approval_date'),
  cabMeetingDate: text('cab_meeting_date'),
  cabVotes: text('cab_votes'),
  cabNotes: text('cab_notes'),
});

// Assets table
export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // AssetType
  serialNumber: text('serial_number').notNull(),
  status: text('status').notNull(), // AssetStatus
  owner: text('owner').notNull(),
  location: text('location').notNull(),
  ipAddress: text('ip_address'),
  linkedIncidentCount: integer('linked_incident_count').notNull().default(0),
  purchaseDate: text('purchase_date').notNull(),
});

// Knowledge Base articles table
export const kbArticles = pgTable('kb_articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),
  author: text('author').notNull(),
  views: integer('views').notNull().default(0),
  usefulnessRate: real('usefulness_rate').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// SLA Policies table
export const slaPolicies = pgTable('sla_policies', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  priorityCode: text('priority_code').notNull(), // P1, P2, P3, P4
  priorityName: text('priority_name').notNull(),
  targetResolutionHours: real('target_resolution_hours').notNull(),
  targetResponseHours: real('target_response_hours'),
  slaResponsePercent: integer('sla_response_percent').default(99),
  slaResolutionPercent: integer('sla_resolution_percent').default(95),
  effectiveYear: integer('effective_year').notNull(),
  description: text('description'),
});

// Table relationships
export const ticketsRelations = relations(tickets, ({ many }) => ({
  workNotes: many(workNotes),
}));

export const workNotesRelations = relations(workNotes, ({ one }) => ({
  ticket: one(tickets, {
    fields: [workNotes.ticketId],
    references: [tickets.id],
  }),
}));

// CAB Members Master table
export const cabMembers = pgTable('cab_members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  role: text('role').notNull(),
  email: text('email'),
  active: text('active').notNull().default('Aktif'), // 'Aktif' | 'Nonaktif'
});

