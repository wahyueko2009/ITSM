import { db, schema } from './index.ts';
import { eq, desc } from 'drizzle-orm';
import {
  users,
  tickets,
  workNotes,
  changeRequests,
  assets,
  kbArticles,
  slaPolicies,
  cabMembers
} from './schema.ts';

// User helper
export async function getOrCreateUser(uid: string, email: string, name: string, role: string, department: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name,
        role,
        department
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name,
          role,
          department
        }
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser query:", error);
    throw new Error("Gagal mendaftarkan atau mengambil pengguna database.", { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.id));
  } catch (error) {
    console.error("Error in getAllUsers query:", error);
    throw new Error("Gagal mengambil data pengguna.", { cause: error });
  }
}

export async function createTestUser(email: string, name: string, role: string, department: string, password?: string) {
  try {
    const tempUid = 'test-' + Math.random().toString(36).substring(2, 12);
    const result = await db.insert(users).values({
      uid: tempUid,
      email: email.trim(),
      name: name.trim(),
      role: role as any,
      department: department.trim(),
      password: password ? password.trim() : 'password'
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Error in createTestUser query:", error);
    throw new Error("Gagal membuat pengguna uji coba baru.", { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await db.select().from(users).where(eq(users.email, email.trim())).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error in getUserByEmail query:", error);
    return null;
  }
}

export async function updateUser(id: number, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.role !== undefined) updatePayload.role = fields.role;
    if (fields.department !== undefined) updatePayload.department = fields.department;
    if (fields.email !== undefined) updatePayload.email = fields.email;
    if (fields.password !== undefined) updatePayload.password = fields.password;

    await db.update(users).set(updatePayload).where(eq(users.id, id));
    return id;
  } catch (error) {
    console.error("Error in updateUser query:", error);
    throw new Error("Gagal memperbarui pengguna.", { cause: error });
  }
}

export async function deleteUser(id: number) {
  try {
    await db.delete(users).where(eq(users.id, id));
    return id;
  } catch (error) {
    console.error("Error in deleteUser query:", error);
    throw new Error("Gagal menghapus pengguna.", { cause: error });
  }
}

export async function clearAllTicketsAndChanges() {
  try {
    await db.delete(workNotes);
    await db.delete(tickets);
    await db.delete(changeRequests);
    return true;
  } catch (error) {
    console.error("Error in clearAllTicketsAndChanges query:", error);
    throw new Error("Gagal membersihkan data.", { cause: error });
  }
}

// Tickets
export async function getAllTickets() {
  try {
    const all = await db.select().from(tickets);
    // Fetch work notes for each
    const resolved = [];
    for (const ticket of all) {
      const notes = await db.select()
        .from(workNotes)
        .where(eq(workNotes.ticketId, ticket.id));
      resolved.push({
        ...ticket,
        workNotes: notes || []
      });
    }
    return resolved;
  } catch (error) {
    console.error("Error in getAllTickets query:", error);
    throw new Error("Gagal mengambil data tiket bantuan.", { cause: error });
  }
}

export async function createTicket(data: any) {
  try {
    const { workNotes: notes, ...ticketData } = data;
    await db.insert(tickets).values({
      id: ticketData.id,
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      status: ticketData.status,
      category: ticketData.category,
      ticketType: ticketData.ticketType,
      requester: ticketData.requester,
      requesterEmail: ticketData.requesterEmail,
      department: ticketData.department,
      assignedAgent: ticketData.assignedAgent || 'Unassigned',
      createdAt: ticketData.createdAt,
      updatedAt: ticketData.updatedAt,
      slaDeadline: ticketData.slaDeadline,
      resolutionNotes: ticketData.resolutionNotes || null,
      linkedAssetId: ticketData.linkedAssetId || null,
    });

    if (notes && Array.isArray(notes)) {
      for (const note of notes) {
        await db.insert(workNotes).values({
          id: note.id,
          ticketId: ticketData.id,
          author: note.author,
          text: note.text,
          createdAt: note.createdAt,
          type: note.type
        });
      }
    }
    return data;
  } catch (error) {
    console.error("Error in createTicket query:", error);
    throw new Error("Gagal membuat tiket baru.", { cause: error });
  }
}

export async function getTicketById(id: string) {
  try {
    const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error in getTicketById query:", error);
    return null;
  }
}

export async function updateTicket(id: string, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.title !== undefined) updatePayload.title = fields.title;
    if (fields.description !== undefined) updatePayload.description = fields.description;
    if (fields.priority !== undefined) updatePayload.priority = fields.priority;
    if (fields.status !== undefined) updatePayload.status = fields.status;
    if (fields.category !== undefined) updatePayload.category = fields.category;
    if (fields.ticketType !== undefined) updatePayload.ticketType = fields.ticketType;
    if (fields.assignedAgent !== undefined) updatePayload.assignedAgent = fields.assignedAgent;
    if (fields.updatedAt !== undefined) updatePayload.updatedAt = fields.updatedAt;
    if (fields.slaDeadline !== undefined) updatePayload.slaDeadline = fields.slaDeadline;
    if (fields.resolutionNotes !== undefined) updatePayload.resolutionNotes = fields.resolutionNotes;
    if (fields.linkedAssetId !== undefined) updatePayload.linkedAssetId = fields.linkedAssetId;

    await db.update(tickets).set(updatePayload).where(eq(tickets.id, id));

    if (fields.workNotes && Array.isArray(fields.workNotes)) {
      for (const note of fields.workNotes) {
        await db.insert(workNotes).values({
          id: note.id,
          ticketId: id,
          author: note.author,
          text: note.text,
          createdAt: note.createdAt,
          type: note.type
        }).onConflictDoNothing();
      }
    }
    return id;
  } catch (error) {
    console.error("Error in updateTicket query:", error);
    throw new Error("Gagal memperbarui tiket.", { cause: error });
  }
}

export async function addWorkNote(ticketId: string, note: any) {
  try {
    await db.insert(workNotes).values({
      id: note.id,
      ticketId,
      author: note.author,
      text: note.text,
      createdAt: note.createdAt,
      type: note.type
    });
    return note;
  } catch (error) {
    console.error("Error in addWorkNote query:", error);
    throw new Error("Gagal membuat catatan kerja tiket.", { cause: error });
  }
}

// Change Requests
export async function getAllChanges() {
  try {
    return await db.select().from(changeRequests);
  } catch (error) {
    console.error("Error in getAllChanges query:", error);
    throw new Error("Gagal mengambil data perubahan (RFC).", { cause: error });
  }
}

export async function createChange(data: any) {
  try {
    await db.insert(changeRequests).values({
      id: data.id,
      title: data.title,
      description: data.description,
      reason: data.reason,
      riskLevel: data.riskLevel,
      impact: data.impact,
      implementationPlan: data.implementationPlan,
      rollbackPlan: data.rollbackPlan,
      classification: data.classification,
      status: data.status,
      requester: data.requester,
      createdAt: data.createdAt,
      targetDate: data.targetDate,
      approver: data.approver || null,
      approvalDate: data.approvalDate || null,
      cabMeetingDate: data.cabMeetingDate || null,
      cabVotes: data.cabVotes || null,
      cabNotes: data.cabNotes || null,
    });
    return data;
  } catch (error) {
    console.error("Error in createChange query:", error);
    throw new Error("Gagal membuat pengajuan perubahan baru.", { cause: error });
  }
}

export async function updateChange(id: string, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.title !== undefined) updatePayload.title = fields.title;
    if (fields.description !== undefined) updatePayload.description = fields.description;
    if (fields.reason !== undefined) updatePayload.reason = fields.reason;
    if (fields.riskLevel !== undefined) updatePayload.riskLevel = fields.riskLevel;
    if (fields.impact !== undefined) updatePayload.impact = fields.impact;
    if (fields.implementationPlan !== undefined) updatePayload.implementationPlan = fields.implementationPlan;
    if (fields.rollbackPlan !== undefined) updatePayload.rollbackPlan = fields.rollbackPlan;
    if (fields.classification !== undefined) updatePayload.classification = fields.classification;
    if (fields.status !== undefined) updatePayload.status = fields.status;
    if (fields.approver !== undefined) updatePayload.approver = fields.approver;
    if (fields.approvalDate !== undefined) updatePayload.approvalDate = fields.approvalDate;
    if (fields.cabMeetingDate !== undefined) updatePayload.cabMeetingDate = fields.cabMeetingDate;
    if (fields.cabVotes !== undefined) updatePayload.cabVotes = fields.cabVotes;
    if (fields.cabNotes !== undefined) updatePayload.cabNotes = fields.cabNotes;

    await db.update(changeRequests).set(updatePayload).where(eq(changeRequests.id, id));
    return id;
  } catch (error) {
    console.error("Error in updateChange query:", error);
    throw new Error("Gagal memperbarui pengajuan perubahan.", { cause: error });
  }
}

// Assets
export async function getAllAssets() {
  try {
    return await db.select().from(assets);
  } catch (error) {
    console.error("Error in getAllAssets query:", error);
    throw new Error("Gagal mengambil data aset CMDB.", { cause: error });
  }
}

export async function createAsset(data: any) {
  try {
    await db.insert(assets).values({
      id: data.id,
      name: data.name,
      type: data.type,
      serialNumber: data.serialNumber,
      status: data.status,
      owner: data.owner,
      location: data.location,
      ipAddress: data.ipAddress || null,
      linkedIncidentCount: data.linkedIncidentCount || 0,
      purchaseDate: data.purchaseDate
    });
    return data;
  } catch (error) {
    console.error("Error in createAsset query:", error);
    throw new Error("Gagal membuat aset baru di CMDB.", { cause: error });
  }
}

export async function updateAsset(id: string, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.status !== undefined) updatePayload.status = fields.status;
    if (fields.owner !== undefined) updatePayload.owner = fields.owner;
    if (fields.location !== undefined) updatePayload.location = fields.location;
    if (fields.ipAddress !== undefined) updatePayload.ipAddress = fields.ipAddress;
    if (fields.linkedIncidentCount !== undefined) updatePayload.linkedIncidentCount = fields.linkedIncidentCount;

    await db.update(assets).set(updatePayload).where(eq(assets.id, id));
    return id;
  } catch (error) {
    console.error("Error in updateAsset query:", error);
    throw new Error("Gagal memperbarui aset CMDB.", { cause: error });
  }
}

export async function deleteAsset(id: string) {
  try {
    // Check if the asset has active links to any tickets
    const linkedTickets = await db.select().from(tickets).where(eq(tickets.linkedAssetId, id));
    if (linkedTickets.length > 0) {
      throw new Error(`Aset ini tidak dapat dihapus karena sedang dirujuk oleh ${linkedTickets.length} tiket atau insiden aktif.`);
    }

    await db.delete(assets).where(eq(assets.id, id));
    return id;
  } catch (error: any) {
    console.error("Error in deleteAsset query:", error);
    throw new Error(error.message || "Gagal menghapus aset CMDB.");
  }
}

// Knowledge Base
export async function getAllKBArticles() {
  try {
    return await db.select().from(kbArticles);
  } catch (error) {
    console.error("Error in getAllKBArticles query:", error);
    throw new Error("Gagal mengambil data artikel pengetahuan.", { cause: error });
  }
}

export async function createKBArticle(data: any) {
  try {
    await db.insert(kbArticles).values({
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      author: data.author,
      views: data.views || 0,
      usefulnessRate: data.usefulnessRate || 0,
      createdAt: data.createdAt
    });
    return data;
  } catch (error) {
    console.error("Error in createKBArticle query:", error);
    throw new Error("Gagal membuat artikel basis pengetahuan.", { cause: error });
  }
}

export async function updateKBArticle(id: string, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.title !== undefined) updatePayload.title = fields.title;
    if (fields.content !== undefined) updatePayload.content = fields.content;
    if (fields.category !== undefined) updatePayload.category = fields.category;
    if (fields.views !== undefined) updatePayload.views = fields.views;
    if (fields.usefulnessRate !== undefined) updatePayload.usefulnessRate = fields.usefulnessRate;

    await db.update(kbArticles).set(updatePayload).where(eq(kbArticles.id, id));
    return id;
  } catch (error) {
    console.error("Error in updateKBArticle query:", error);
    throw new Error("Gagal menyunting artikel basis pengetahuan.", { cause: error });
  }
}

// SLA Policies
export async function getAllSlaPolicies() {
  try {
    return await db.select().from(slaPolicies);
  } catch (error) {
    console.error("Error in getAllSlaPolicies query:", error);
    throw new Error("Gagal mengambil data master kebijakan SLA.", { cause: error });
  }
}

export async function createSlaPolicy(data: any) {
  try {
    await db.insert(slaPolicies).values({
      id: data.id,
      category: data.category,
      priorityCode: data.priorityCode,
      priorityName: data.priorityName,
      targetResolutionHours: data.targetResolutionHours,
      targetResponseHours: data.targetResponseHours || null,
      slaResponsePercent: data.slaResponsePercent || 99,
      slaResolutionPercent: data.slaResolutionPercent || 95,
      effectiveYear: data.effectiveYear,
      description: data.description || null
    });
    return data;
  } catch (error) {
    console.error("Error in createSlaPolicy query:", error);
    throw new Error("Gagal membuat butir kebijakan SLA.", { cause: error });
  }
}

export async function updateSlaPolicy(id: string, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.category !== undefined) updatePayload.category = fields.category;
    if (fields.priorityCode !== undefined) updatePayload.priorityCode = fields.priorityCode;
    if (fields.priorityName !== undefined) updatePayload.priorityName = fields.priorityName;
    if (fields.targetResolutionHours !== undefined) updatePayload.targetResolutionHours = fields.targetResolutionHours;
    if (fields.targetResponseHours !== undefined) updatePayload.targetResponseHours = fields.targetResponseHours;
    if (fields.slaResponsePercent !== undefined) updatePayload.slaResponsePercent = fields.slaResponsePercent;
    if (fields.slaResolutionPercent !== undefined) updatePayload.slaResolutionPercent = fields.slaResolutionPercent;
    if (fields.effectiveYear !== undefined) updatePayload.effectiveYear = fields.effectiveYear;
    if (fields.description !== undefined) updatePayload.description = fields.description;

    await db.update(slaPolicies).set(updatePayload).where(eq(slaPolicies.id, id));
    return id;
  } catch (error) {
    console.error("Error in updateSlaPolicy query:", error);
    throw new Error("Gagal menyimpan perubahan kebijakan master SLA.", { cause: error });
  }
}

// DB Seeder Function
export async function seedDatabase(initialData: {
  tickets: any[];
  slaPolicies: any[];
  assets: any[];
  kbArticles: any[];
}) {
  try {
    // 1. SLA Policies
    const currentSlas = await db.select().from(slaPolicies);
    if (currentSlas.length === 0) {
      console.log("[Seeder] Populating database with SLA Policies...");
      for (const p of initialData.slaPolicies) {
        await createSlaPolicy(p);
      }
    }

    // 2. Assets
    const currentAssets = await db.select().from(assets);
    if (currentAssets.length === 0) {
      console.log("[Seeder] Populating database with Assets...");
      for (const a of initialData.assets) {
        await createAsset(a);
      }
    }

    // 3. KB Articles
    const currentKB = await db.select().from(kbArticles);
    if (currentKB.length === 0) {
      console.log("[Seeder] Populating database with KB articles...");
      for (const k of initialData.kbArticles) {
        await createKBArticle(k);
      }
    }

    // 4. Tickets & workNotes
    const currentTickets = await db.select().from(tickets);
    if (currentTickets.length === 0) {
      console.log("[Seeder] Populating database with Tickets...");
      for (const t of initialData.tickets) {
        await createTicket(t);
      }
    }

    // 5. CAB Members
    // Auto-delete user-requested mock names if they exist in the database
    try {
      await db.delete(cabMembers).where(eq(cabMembers.name, 'Hendrik Pratama'));
      await db.delete(cabMembers).where(eq(cabMembers.name, 'Rudi Hermawan'));
    } catch (err) {
      console.warn("Could not delete old CAB members or tables do not exist yet:", err);
    }

    const currentCab = await db.select().from(cabMembers);
    if (currentCab.length === 0) {
      console.log("[Seeder] Populating database with CAB Members...");
      const defaultMembers = [
        { name: 'Wahyudi Eko', role: 'Infra Manager', email: 'wahyudi@portalit.local', active: 'Aktif' },
        { name: 'Budi Santoso', role: 'Ops Lead', email: 'budi@portalit.local', active: 'Aktif' }
      ];
      for (const m of defaultMembers) {
        await createCabMember(m);
      }
    }

    console.log("[Seeder] Database seeding check completed.");
  } catch (error) {
    console.error("[Seeder] Failed to seed database:", error);
  }
}

// CAB Members Master Queries
export async function getAllCabMembers() {
  try {
    return await db.select().from(cabMembers);
  } catch (error) {
    console.error("Error in getAllCabMembers query:", error);
    throw new Error("Gagal mengambil data master anggota CAB.", { cause: error });
  }
}

export async function createCabMember(data: any) {
  try {
    const result = await db.insert(cabMembers).values({
      name: data.name,
      role: data.role,
      email: data.email || null,
      active: data.active || 'Aktif'
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Error in createCabMember query:", error);
    throw new Error("Gagal membuat anggota CAB baru.", { cause: error });
  }
}

export async function updateCabMember(id: number, fields: any) {
  try {
    const updatePayload: any = {};
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.role !== undefined) updatePayload.role = fields.role;
    if (fields.email !== undefined) updatePayload.email = fields.email;
    if (fields.active !== undefined) updatePayload.active = fields.active;

    await db.update(cabMembers).set(updatePayload).where(eq(cabMembers.id, id));
    return id;
  } catch (error) {
    console.error("Error in updateCabMember query:", error);
    throw new Error("Gagal memperbarui anggota CAB.", { cause: error });
  }
}

export async function deleteCabMember(id: number) {
  try {
    await db.delete(cabMembers).where(eq(cabMembers.id, id));
    return id;
  } catch (error) {
    console.error("Error in deleteCabMember query:", error);
    throw new Error("Gagal menghapus anggota CAB.", { cause: error });
  }
}

