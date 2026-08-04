import 'server-only';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { connectToDatabase } from '@/lib/db/connect';
import { parseQueryIntent } from './query-intent';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
export async function lookupStructuredValue(query: string) {
  const parsed = parseQueryIntent(query); const exactIntents = new Set(['linkedin_profile','github_profile','portfolio_url','email','phone','owner','role']);
  if (!exactIntents.has(parsed.intent)) return null;
  await connectToDatabase(); const documents = await KnowledgeDocument.find({ status: 'ready', visibility: 'public' }).select('title entities').lean();
  const requestedTerms = parsed.personName ? normalize(parsed.personName).split(' ') : [];
  const matches = documents.filter((document) => { const names = ((document.entities as { personNames?: string[] } | undefined)?.personNames ?? []).map(normalize); return !requestedTerms.length || names.some((name) => requestedTerms.every((term) => name.includes(term))); });
  if (requestedTerms.length && matches.length > 1) return { ambiguous: true, personName: parsed.personName };
  const document = matches[0] ?? (documents.length === 1 ? documents[0] : undefined); if (!document) return null;
  const entities = document.entities as { linkedinUrls?: string[]; githubUrls?: string[]; portfolioUrls?: string[]; emails?: string[]; phoneNumbers?: string[]; personNames?: string[]; roles?: string[] } | undefined;
  const value = parsed.intent === 'linkedin_profile' ? entities?.linkedinUrls?.[0] : parsed.intent === 'github_profile' ? entities?.githubUrls?.[0] : parsed.intent === 'portfolio_url' ? entities?.portfolioUrls?.[0] : parsed.intent === 'email' ? entities?.emails?.[0] : parsed.intent === 'phone' ? entities?.phoneNumbers?.[0] : parsed.intent === 'role' || parsed.intent === 'owner' ? entities?.roles?.[0] : undefined;
  if (!value) return { missing: true, personName: parsed.personName, intent: parsed.intent };
  const chunk = await KnowledgeChunk.findOne({ documentId: document._id, content: { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }).select('chunkIndex').lean();
  return { value, intent: parsed.intent, personName: parsed.personName, source: { documentTitle: document.title, chunkIndex: chunk?.chunkIndex ?? 0 } };
}
