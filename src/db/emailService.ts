import nodemailer from 'nodemailer';
import { db, schema } from './index.ts';
import { eq } from 'drizzle-orm';
import { users } from './schema.ts';

// Initialize transporter lazily to prevent crashing if config is incomplete
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log(`[EmailService] SMTP configured with host: ${host}:${port}. Creating nodemailer transporter.`);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  } else {
    console.log('[EmailService] SMTP is not fully configured. Email notifications will be simulated & logged directly to server console.');
  }
  return transporter;
}

// Get admin emails from DB
export async function getAdminEmails(): Promise<string[]> {
  try {
    const list = await db.select({ email: users.email }).from(users).where(eq(users.role, 'admin'));
    const emails = list.map(u => u.email.trim()).filter(Boolean);
    if (emails.length === 0) {
      // Return a default admin email fallback
      return ['admin@portalit.local'];
    }
    return emails;
  } catch (error) {
    console.error('[EmailService] Error fetching admin emails:', error);
    return ['admin@portalit.local'];
  }
}

// Get agent email
export async function getAgentEmailByName(agentFullName: string): Promise<string | null> {
  if (!agentFullName || agentFullName.toLowerCase() === 'unassigned') return null;
  try {
    // Parse the name (e.g., "Budi Santoso (IT Support)" -> "Budi Santoso")
    const nameOnly = agentFullName.split('(')[0].trim();
    const result = await db.select({ email: users.email })
      .from(users)
      .where(eq(users.name, nameOnly))
      .limit(1);
    
    return result[0]?.email || null;
  } catch (error) {
    console.error('[EmailService] Error looking up agent email:', error);
    return null;
  }
}

// Base sending function with simulation fallback
async function sendMailHelper(options: { to: string | string[]; subject: string; html: string }) {
  const mailTransporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || 'no-reply@portalit.local';
  
  const toList = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: `"Portal IT Support" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`[EmailService] Real email successfully sent to: ${toList} | Subject: "${options.subject}"`);
    } catch (err) {
      console.error(`[EmailService] Failed to send real email to ${toList}:`, err);
    }
  } else {
    // Simulation: Log clearly and visibly to the console
    console.log(`
================================================================================
💌 [EMAIL SIMULATION] - PEMBERITAHUAN EMAIL PORTAL IT
--------------------------------------------------------------------------------
Dari: "Portal IT Support" <${fromAddress}>
Kepada: ${toList}
Subjek: ${options.subject}
--------------------------------------------------------------------------------
${options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 305)}...
================================================================================
    `);
  }
}

/**
 * 1. Kirim email untuk Pelaporan Baru ke Admin
 */
export async function sendNewTicketNotificationToAdmins(ticket: {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  requester: string;
  requesterEmail: string;
}) {
  const adminEmails = await getAdminEmails();
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fafafa;">
      <h2 style="color: #4f46e5; margin-bottom: 20px; text-transform: uppercase; font-size: 20px; border-bottom: 2px solid #ebf0f5; padding-bottom: 10px;">
        📢 Tiket Laporan Baru Ditambahkan
      </h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Halo Tim Administrator,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Terdapat laporan insiden/permintaan baru dari klien yang masuk ke portal IT Support.
      </p>
      
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 120px;">ID Tiket:</td>
            <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${ticket.id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Judul:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Kategori:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Prioritas:</td>
            <td style="padding: 6px 0; color: #ef4444; font-weight: bold;">${ticket.priority}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Pelapor:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.requester} (${ticket.requesterEmail})</td>
          </tr>
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h4 style="color: #334155; margin-bottom: 8px;">Deskripsi Kendala:</h4>
        <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; color: #334155; margin: 0; white-space: pre-wrap;">${ticket.description}</p>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #ebf0f5; padding-top: 15px; text-align: center;">
        Sistem Portal IT Support • Kiriman Otomatis
      </p>
    </div>
  `;

  await sendMailHelper({
    to: adminEmails,
    subject: `🚨 [Baru] TiketIT: ${ticket.id} - ${ticket.title}`,
    html: htmlContent
  });
}

/**
 * 2. Kirim email penugasan ke setiap Agen yang ditugaskan
 */
export async function sendAssignmentToAgentNotification(ticket: {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  requester: string;
  assignedAgent: string;
}) {
  const agentEmail = await getAgentEmailByName(ticket.assignedAgent);
  if (!agentEmail) {
    console.log(`[EmailService] Skipping assignment mail for agent "${ticket.assignedAgent}": Email not found.`);
    return;
  }

  const agentName = ticket.assignedAgent.split('(')[0].trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ececec; border-radius: 8px; background-color: #fafafa;">
      <h2 style="color: #4f46e5; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; border-bottom: 2px solid #ebf0f5; padding-bottom: 10px;">
        💼 Penugasan Tiket Baru
      </h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Halo <strong>${agentName}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Anda telah ditugaskan sebagai agen penanggung jawab untuk menyelesaikan tiket kendala berikut ini:
      </p>
      
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #6366f1; border-radius: 4px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 120px;">ID Tiket:</td>
            <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${ticket.id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Judul:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Prioritas:</td>
            <td style="padding: 6px 0; color: #f59e0b; font-weight: bold;">${ticket.priority}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Kategori:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Pelapor:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.requester}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h4 style="color: #334155; margin-bottom: 8px;">Deskripsi Masalah:</h4>
        <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; color: #334155; margin: 0; white-space: pre-wrap;">${ticket.description}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 13px; color: #475569;">
          Harap segera log-in ke dashboard dan klik tombol <strong>"Mulai Kerja"</strong> untuk memulai penanganan.
        </p>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #ebf0f5; padding-top: 15px; text-align: center;">
        Sistem Portal IT Support • Kiriman Otomatis Penugasan Kerja
      </p>
    </div>
  `;

  await sendMailHelper({
    to: agentEmail,
    subject: `💼 [Tugas Baru] TiketIT: ${ticket.id} - ${ticket.title}`,
    html: htmlContent
  });
}

/**
 * 3a. Kirim email untuk Klien/User ketika tiket dapet agen pengerja
 */
export async function sendAgentAssignedNotificationToUser(ticket: {
  id: string;
  title: string;
  requester: string;
  requesterEmail: string;
  assignedAgent: string;
  priority: string;
}) {
  if (!ticket.requesterEmail) return;

  const agentName = ticket.assignedAgent.split('(')[0].trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ececec; border-radius: 8px; background-color: #fafafa;">
      <h2 style="color: #4f46e5; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; border-bottom: 2px solid #ebf0f5; padding-bottom: 10px;">
        🛠️ Laporan Anda Sedang Ditangani
      </h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Halo <strong>${ticket.requester}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Kami ingin menginformasikan bahwa laporan kendala Anda telah diverifikasi oleh tim penanganan dan kini telah didistribusikan ke agen spesialis kami:
      </p>
      
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 120px;">ID Tiket:</td>
            <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${ticket.id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Laporan:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Spesialis IT:</td>
            <td style="padding: 6px 0; color: #4f46e5; font-weight: bold;">${agentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Status:</td>
            <td style="padding: 6px 0; color: #3b82f6; font-weight: bold;">Ditugaskan (Sedang Diproses)</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Anda akan menerima pembaruan email selanjutnya saat pengerjaan selesai atau jika tim kami memerlukan detail tambahan.
      </p>

      <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #ebf0f5; padding-top: 15px; text-align: center;">
        Sistem Portal IT Support • Kenyamanan Anda Prioritas Kami
      </p>
    </div>
  `;

  await sendMailHelper({
    to: ticket.requesterEmail,
    subject: `🛠️ [Tindak Lanjut] Tiket Anda, ${ticket.id} Telah Ditugaskan`,
    html: htmlContent
  });
}

/**
 * 3b. Kirim email untuk Klien/User ketika tiket selesai (Selesai status)
 */
export async function sendTicketCompletedNotificationToUser(ticket: {
  id: string;
  title: string;
  requester: string;
  requesterEmail: string;
  assignedAgent: string;
  resolutionNotes?: string | null;
}) {
  if (!ticket.requesterEmail) return;

  const agentName = ticket.assignedAgent ? ticket.assignedAgent.split('(')[0].trim() : 'Tim IT Support';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ececec; border-radius: 8px; background-color: #fafafa;">
      <h2 style="color: #10b981; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; border-bottom: 2px solid #ebf0f5; padding-bottom: 10px;">
        ✅ Laporan Selesai Dikerjakan
      </h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Halo <strong>${ticket.requester}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Kabar baik! Pengerjaan perbaikan untuk laporan kendala Anda telah dinyatakan **Selesai**. Silakan periksa kembali perangkat atau layanan terkait.
      </p>
      
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 120px;">ID Tiket:</td>
            <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${ticket.id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Laporan:</td>
            <td style="padding: 6px 0; color: #1e293b;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Dikerjakan Oleh:</td>
            <td style="padding: 6px 0; color: #1e293b;">${agentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Status:</td>
            <td style="padding: 6px 0; color: #10b981; font-weight: bold;">Selesai (Resolved)</td>
          </tr>
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h4 style="color: #334155; margin-bottom: 8px;">Catatan Solusi & Penyelesaian:</h4>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 6px; font-size: 13px; color: #065f46; white-space: pre-wrap;">${ticket.resolutionNotes || 'Semua perbaikan dan verifikasi selesai dilakukan dengan baik.'}</div>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Terima kasih atas kesabaran Anda menggunakan layanan Portal Helpdesk IT Support kami.
      </p>

      <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #ebf0f5; padding-top: 15px; text-align: center;">
        Sistem Portal IT Support • Kepuasan Klien Prioritas Utama Kami
      </p>
    </div>
  `;

  await sendMailHelper({
    to: ticket.requesterEmail,
    subject: `✅ [Selesai] Tiket Anda, ${ticket.id} Dinyatakan Selesai`,
    html: htmlContent
  });
}
