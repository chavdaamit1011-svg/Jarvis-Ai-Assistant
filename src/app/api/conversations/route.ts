import { z } from 'zod';
import { connectToDatabase } from '@/lib/db/connect';
import Conversation from '@/models/Conversation';

const schema = z.object({ model: z.string().max(80).optional(), assistantMode: z.string().max(80).optional() });
const map = (conversation: { _id: unknown; title: string; model: string; assistantMode: string; createdAt: Date; updatedAt: Date; isPinned?: boolean; isArchived?: boolean }) => ({ id: String(conversation._id), title: conversation.title, model: conversation.model, assistantMode: conversation.assistantMode, createdAt: conversation.createdAt.toISOString(), updatedAt: conversation.updatedAt.toISOString(), isPinned: conversation.isPinned === true, isArchived: conversation.isArchived === true, messages: [] });

export async function GET() { try { await connectToDatabase(); const conversations = await Conversation.find().sort({ updatedAt: -1 }).lean(); return Response.json({ conversations: conversations.map(map) }); } catch (error) { console.error('[conversations] list', error); return Response.json({ error: 'Database unavailable.' }, { status: 503 }); } }
export async function POST(request: Request) { const body = await request.json().catch(() => null); const parsed = schema.safeParse(body ?? {}); if (!parsed.success) return Response.json({ error: 'Invalid conversation settings.' }, { status: 400 }); try { await connectToDatabase(); const conversation = await Conversation.create({ model: parsed.data.model ?? 'jarvis-v4', assistantMode: parsed.data.assistantMode ?? 'general' }); return Response.json({ conversation: map(conversation) }, { status: 201 }); } catch (error) { console.error('[conversations] create', error); return Response.json({ error: 'Database unavailable.' }, { status: 503 }); } }
