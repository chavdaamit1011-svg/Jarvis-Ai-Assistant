import type { ExecutorCapability } from './planner-types';

export function deterministicSignals(query: string): { capability: ExecutorCapability | null; operation: string; requiresCurrentInformation: boolean; missingInformation: string[]; clarificationQuestion: string | null } {
  const value = query.toLowerCase().trim();
  if (/^(?:link|links|profile)\s*(?:bhej|do|batao)?\??$/.test(value)) return { capability: 'clarification', operation: 'clarify_request', requiresCurrentInformation: false, missingInformation: ['entity', 'requested_field'], clarificationQuestion: 'Please specify the person or item and the type of link or profile you need.' };
  if (/\b(?:current time|time in|today'?s date|current date|timezone|gst|discount|percentage|calculate|\d+\s*[+\-*/]\s*\d+)\b/i.test(value)) return { capability: 'utility', operation: /time|date|timezone/i.test(value) ? 'date_time' : 'calculation', requiresCurrentInformation: false, missingInformation: [], clarificationQuestion: null };
  if (/\b(?:latest|recent|news|live score|current prime minister|current minister|current ceo|current price|latest version|new update|kab aaya|aaj bitcoin|haal ma|atyare)\b/i.test(value)) return { capability: 'web_search', operation: 'fresh_information', requiresCurrentInformation: true, missingInformation: [], clarificationQuestion: null };
  if (/\b(?:pdf|docx|document|attached file|upload file)\b/i.test(value)) return { capability: 'file', operation: 'file_analysis', requiresCurrentInformation: false, missingInformation: [], clarificationQuestion: null };
  return { capability: null, operation: 'answer_question', requiresCurrentInformation: false, missingInformation: [], clarificationQuestion: null };
}
