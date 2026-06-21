/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import * as queries from './src/db/queries.ts';
import * as emailService from './src/db/emailService.ts';
import { INITIAL_TICKETS, INITIAL_ASSETS, INITIAL_KB, INITIAL_SLA_POLICIES } from './src/data.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy-loaded Gemini Client wrapper to prevent boot-up crash when key is not provided yet
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY_MISSING: API Key untuk Gemini belum dikonfigurasi. Silakan tambahkan kunci API di panel Secrets/Pengaturan.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    time: new Date().toISOString(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
  });
});

/**
 * Endpoint for AI Incident Triage: auto-categorize, prioritize, and draft resolution suggestions
 */
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required' });
      return;
    }

    const ai = getAIClient();
    
    const prompt = `Analisis tiket dukungan TI berikut secara profesional dalam Bahasa Indonesia:
Judul Tiket: "${title}"
Deskripsi Tiket: "${description}"

Berikan respons dalam format JSON valid dengan kunci-kunci berikut (pastikan persis sama):
1. "recommendedCategory": Kategori yang paling cocok dari daftar ["Hardware", "Software", "Jaringan", "Akses & Akun", "Sistem & Cloud"].
2. "recommendedPriority": Prioritas yang sesuai dari ["Urgent", "Tinggi", "Sedang", "Rendah"].
3. "confidence": Nilai persentase keyakinan model (0-100), misal: 85.
4. "reason": Alasan singkat dalam Bahasa Indonesia kenapa kategori & prioritas tersebut direkomendasikan.
5. "estimatedRootCause": Perkiraan penyebab masalah teknis secara ringkas.
6. "suggestedSteps": Daftar 3-4 langkah pemecahan masalah taktis atau instruksi resolusi bagi tim Service Desk (dalam Bahasa Indonesia).
7. "draftResolutionText": Draf draf teks email/tanggapan ramah bagi pembuat tiket (requester) yang memverifikasi masalah dan menawarkan solusi sementara atau langkah selanjutnya.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: [
            'recommendedCategory',
            'recommendedPriority',
            'confidence',
            'reason',
            'estimatedRootCause',
            'suggestedSteps',
            'draftResolutionText',
          ],
          properties: {
            recommendedCategory: { type: Type.STRING },
            recommendedPriority: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            reason: { type: Type.STRING },
            estimatedRootCause: { type: Type.STRING },
            suggestedSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            draftResolutionText: { type: Type.STRING },
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Sistem gagal menerima tanggapan analitis dari model Gemini.');
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error('Gemini Analyze API Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan sistem internal.',
      isKeyMissing: error.message?.includes('GEMINI_API_KEY_MISSING'),
    });
  }
});

/**
 * Endpoint for AI Service Desk Chatbot Companion
 */
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, selectedTicketContext, knowledgeArticles } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const ai = getAIClient();

    // Prepare helper context from database
    let contextPrompt = 'Kamu adalah "ITSM AI Co-pilot", asisten cerdas Helpdesk TI internal perusahaan.\nTugasmu adalah membantu agen IT memecahkan masalah, memberikan draf jawaban, atau menganalisis data.\n\n';

    if (selectedTicketContext) {
      contextPrompt += `=== KONTEKS TIKET AKTIF YANG SEDANG DILIHAT ===
ID: ${selectedTicketContext.id}
Judul: ${selectedTicketContext.title}
Deskripsi: ${selectedTicketContext.description}
Kategori: ${selectedTicketContext.category}
Prioritas: ${selectedTicketContext.priority}
Status: ${selectedTicketContext.status}
Pelapor: ${selectedTicketContext.requester} (${selectedTicketContext.department})
=============================================\n\n`;
    }

    if (knowledgeArticles && Array.isArray(knowledgeArticles)) {
      contextPrompt += `=== BASIS PENGETAHUAN (KNOWLEDGE BASE) YANG RELEVAN ===\n`;
      knowledgeArticles.forEach((art: any) => {
        contextPrompt += `- [ID: ${art.id}] Judul: ${art.title}\nIsi:\n${art.content.substring(0, 400)}...\n\n`;
      });
      contextPrompt += `====================================================\n\n`;
    }

    contextPrompt += 'Jawablah dengan nada yang sopan, solutif, ringkas, dan profesional dalam Bahasa Indonesia. Jika ada Knowledge Base yang cocok, referensikan ID artikelnya agar dapat dibaca.';

    const systemInstruction = contextPrompt;

    // Use chats.create as instructed in guidelines
    const apiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Generate response using generateContent directly with the conversation history
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: apiMessages.concat({
        role: 'user',
        parts: [{ text: 'Silakan berikan bantuan atau tanggapanmu berdasarkan riwayat percakapan di atas.' }]
      }),
      config: {
        systemInstruction,
      },
    });

    res.json({
      reply: response.text || 'Maaf, saya tidak dapat merumuskan tanggapan untuk saat ini.',
    });
  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan sistem internal.',
      isKeyMissing: error.message?.includes('GEMINI_API_KEY_MISSING'),
    });
  }
});

/**
 * -------------------------------------------------------------
 * PERSISTENT CLOUD SQL DATABASE API ENDPOINTS
 * -------------------------------------------------------------
 */

// 1. User Sync & Registration
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, name, role, department } = req.body;
    if (!req.user || !req.user.uid) {
      res.status(401).json({ error: 'Token Firebase tidak valid' });
      return;
    }
    const finalEmail = (email || req.user.email || 'user@company.com').trim().toLowerCase();
    const finalRole = finalEmail === 'admin@company.com' ? 'admin' : (role || 'user');
    const syncedUser = await queries.getOrCreateUser(
      req.user.uid,
      finalEmail,
      name || 'Pengguna ITSM',
      finalRole,
      department || 'Umum'
    );
    res.json(syncedUser);
  } catch (error: any) {
    console.error('/api/auth/sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// 1b. Local Credentials & Preset Simulation Login for Testing
app.post('/api/auth/local-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi' });
      return;
    }

    // Try finding in database
    let dbUser = await queries.getUserByEmail(email);

    // Default hardcoded presets matching LoginScreen
    const PRESETS = [
      { email: 'admin@company.com', name: 'Sys Admin', role: 'admin', department: 'IT Service Management', password: 'admin' },
      { email: 'admin@ifg.id', name: 'Admin Support', role: 'admin', department: 'IT Service Desk', password: 'admin' },
      { email: 'budi.santoso@ifg.id', name: 'Budi Santoso', role: 'admin', department: 'IT Infrastructure', password: 'budi' },
      { email: 'rian@ifg.id', name: 'Rian Hidayat', role: 'admin', department: 'Information Security', password: 'rian' },
      { email: 'wati@ifg.id', name: 'Wati Lestari', role: 'admin', department: 'Database Administration', password: 'wati' },
    ];
    
    const matchedPreset = PRESETS.find(p => p.email.toLowerCase() === email.trim().toLowerCase());

    if (!dbUser && matchedPreset) {
      // Auto seed this preset to DB for testing so they exist in Postgres
      dbUser = await queries.createTestUser(
        matchedPreset.email,
        matchedPreset.name,
        matchedPreset.role,
        matchedPreset.department,
        matchedPreset.password
      );
    }

    if (!dbUser) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan di database. Pastikan email terdaftar atau gunakan salah satu preset.' });
      return;
    }

    // Check credentials plain-text for developer convenience/testing
    const expectedPassword = dbUser.password || 'password';
    if (password.trim() !== expectedPassword.trim()) {
      res.status(401).json({ error: 'Kata sandi salah.' });
      return;
    }

    // Generate simulated authentication token starting with local-t-
    const token = `local-t-${dbUser.email}`;
    res.json({
      token,
      user: {
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        department: dbUser.department,
      }
    });
  } catch (error: any) {
    console.error('Local login failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Tickets & WorkNotes Endpoints
app.get('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllTickets();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const ticket = req.body;
    const result = await queries.createTicket(ticket);
    
    // Send email to admin asynchronously
    emailService.sendNewTicketNotificationToAdmins({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      requester: ticket.requester,
      requesterEmail: ticket.requesterEmail,
    }).catch(err => console.error('[Server] Failed to trigger admin notification email:', err));

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tickets/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    // Load existing ticket to determine transition logic
    const prevTicket = await queries.getTicketById(id);
    
    await queries.updateTicket(id, fields);

    if (prevTicket) {
      const wasAssigned = prevTicket.assignedAgent && prevTicket.assignedAgent.toLowerCase() !== 'unassigned';
      const isNowAssigned = fields.assignedAgent !== undefined 
        ? (fields.assignedAgent && fields.assignedAgent.toLowerCase() !== 'unassigned')
        : wasAssigned;
      
      const agentChanged = isNowAssigned && fields.assignedAgent !== undefined && fields.assignedAgent !== prevTicket.assignedAgent;
      const isStatusTransitionedToSelesai = fields.status === 'Selesai' && prevTicket.status !== 'Selesai';

      const currentTicket = {
        id: prevTicket.id,
        title: fields.title !== undefined ? fields.title : prevTicket.title,
        description: fields.description !== undefined ? fields.description : prevTicket.description,
        priority: fields.priority !== undefined ? fields.priority : prevTicket.priority,
        category: fields.category !== undefined ? fields.category : prevTicket.category,
        requester: prevTicket.requester,
        requesterEmail: prevTicket.requesterEmail,
        assignedAgent: fields.assignedAgent !== undefined ? fields.assignedAgent : prevTicket.assignedAgent,
        resolutionNotes: fields.resolutionNotes !== undefined ? fields.resolutionNotes : prevTicket.resolutionNotes,
      };

      // 2. Trigger email to assigned agent + 3a. Trigger email to user when agent is assigned
      if (isNowAssigned && (!wasAssigned || agentChanged)) {
        emailService.sendAssignmentToAgentNotification(currentTicket)
          .catch(err => console.error('[Server] Failed to send assignment notification to agent:', err));

        emailService.sendAgentAssignedNotificationToUser(currentTicket)
          .catch(err => console.error('[Server] Failed to send assignment notification to user:', err));
      }

      // 3b. Trigger email to user when ticket is resolved / solved
      if (isStatusTransitionedToSelesai) {
        emailService.sendTicketCompletedNotificationToUser(currentTicket)
          .catch(err => console.error('[Server] Failed to send completion notification to user:', err));
      }
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets/:id/worknotes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: ticketId } = req.params;
    const note = req.body;
    const result = await queries.addWorkNote(ticketId, note);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Change Requests (RFC)
app.get('/api/changes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllChanges();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/changes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rfc = req.body;
    const result = await queries.createChange(rfc);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/changes/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    await queries.updateChange(id, fields);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Assets (CMDB)
app.get('/api/assets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllAssets();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const asset = req.body;
    const result = await queries.createAsset(asset);
    
    // Create initial history log
    await queries.createAssetHistory({
      assetId: asset.id,
      actionType: 'CREATE',
      toUser: asset.owner,
      toLocation: asset.location,
      notes: 'Aset baru didaftarkan di CMDB.',
      changedBy: req.user?.email || 'System',
      createdAt: new Date().toISOString()
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/assets/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    // Get original asset state to compare differences
    const oldAsset = await queries.getAssetById(id);
    
    await queries.updateAsset(id, fields);

    if (oldAsset) {
      const changedBy = req.user?.email || 'System';
      const timestamp = new Date().toISOString();
      const notes = fields.changeReason || '';

      // Check for handover (from_user to to_user)
      if (fields.owner !== undefined && oldAsset.owner !== fields.owner) {
        await queries.createAssetHistory({
          assetId: id,
          actionType: 'HANDOVER',
          fromUser: oldAsset.owner,
          toUser: fields.owner,
          notes: notes || 'Serah terima / serah pakai aset kepada karyawan baru.',
          changedBy,
          createdAt: timestamp
        });
      }

      // Check for physical location change
      if (fields.location !== undefined && oldAsset.location !== fields.location) {
        await queries.createAssetHistory({
          assetId: id,
          actionType: 'LOCATION_CHANGE',
          fromLocation: oldAsset.location,
          toLocation: fields.location,
          notes: notes || 'Perpindahan lokasi penempatan fisik aset.',
          changedBy,
          createdAt: timestamp
        });
      }

      // Check for status changes
      if (fields.status !== undefined && oldAsset.status !== fields.status) {
        await queries.createAssetHistory({
          assetId: id,
          actionType: 'STATUS_CHANGE',
          notes: notes || `Siklus hidup diperbarui dari "${oldAsset.status}" menjadi "${fields.status}".`,
          changedBy,
          createdAt: timestamp
        });
      }

      // General update (if none of the main items above occurred but something else was edited)
      const isHandover = fields.owner !== undefined && oldAsset.owner !== fields.owner;
      const isLocChange = fields.location !== undefined && oldAsset.location !== fields.location;
      const isStatusChange = fields.status !== undefined && oldAsset.status !== fields.status;
      
      if (!isHandover && !isLocChange && !isStatusChange) {
        await queries.createAssetHistory({
          assetId: id,
          actionType: 'UPDATE',
          notes: notes || 'Informasi detail spesifikasi aset atau IP Address diperbarui.',
          changedBy,
          createdAt: timestamp
        });
      }
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch action transfer & location history for a specific CI asset
app.get('/api/assets/:id/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const history = await queries.getAssetHistories(id);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.delete('/api/assets/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await queries.deleteAsset(id);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4b. CAB Members Master
app.get('/api/cab-members', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllCabMembers();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cab-members', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await queries.createCabMember(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cab-members/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID tidak valid' });
    }
    await queries.updateCabMember(id, req.body);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cab-members/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID tidak valid' });
    }
    await queries.deleteCabMember(id);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Knowledge Base (KB)
app.get('/api/kb', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllKBArticles();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kb', requireAuth, async (req: AuthRequest, res) => {
  try {
    const article = req.body;
    const result = await queries.createKBArticle(article);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/kb/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    await queries.updateKBArticle(id, fields);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. SLA Master Policies
app.get('/api/sla', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllSlaPolicies();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sla', requireAuth, async (req: AuthRequest, res) => {
  try {
    const policy = req.body;
    const result = await queries.createSlaPolicy(policy);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sla/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    await queries.updateSlaPolicy(id, fields);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. User Management Endpoints
app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await queries.getAllUsers();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, name, role, department, password } = req.body;
    if (!email || !name) {
      res.status(400).json({ error: 'Nama dan Email wajib diisi' });
      return;
    }
    const result = await queries.createTestUser(email, name, role || 'user', department || 'Umum', password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const fields = req.body;
    await queries.updateUser(id, fields);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await queries.deleteUser(id);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/clear-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Pengguna tidak terautentikasi.' });
    }
    const dbUser = await queries.getUserByEmail(userEmail);
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya Admin yang dapat membersihkan data.' });
    }
    await queries.clearAllTicketsAndChanges();
    res.json({ success: true, message: 'Semua insiden (tiket) dan request (RFC/perubahan) berhasil dibersihkan.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/query', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Pengguna tidak terautentikasi.' });
    }
    const dbUser = await queries.getUserByEmail(userEmail);
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya Admin yang dapat menjalankan kueri SQL.' });
    }
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query SQL wajib diisi.' });
    }

    const cleanSql = query.trim().toLowerCase();
    if (!cleanSql.startsWith('select')) {
      return res.status(400).json({ error: 'Untuk keamanan data selama fase analisis, hanya perintah kueri pencarian (SELECT) yang diperbolehkan.' });
    }

    const { db } = await import('./src/db/index.ts');
    const { sql: drizzleSql } = await import('drizzle-orm');
    
    const result = await db.execute(drizzleSql.raw(query));

    res.json({
      success: true,
      rows: result.rows || [],
      rowCount: result.rowCount || (result.rows ? result.rows.length : 0),
    });
  } catch (error: any) {
    console.error('SQL query error:', error);
    res.status(500).json({ error: error.message || 'Terjadi kesalahan saat mengeksekusi SQL.' });
  }
});

async function main() {
  // Automatically check & seed the DB at startup if tables are empty
  try {
    console.log("[DB Startup] checking database seed status...");

    await queries.seedDatabase({
      tickets: INITIAL_TICKETS,
      slaPolicies: INITIAL_SLA_POLICIES,
      assets: INITIAL_ASSETS,
      kbArticles: INITIAL_KB,
    });
  } catch (seedErr) {
    console.error("[DB Startup] Seeding check failed:", seedErr);
  }
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ITSM Server] Berjalan pada http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[ITSM Server] Gagal booting:', err);
});
