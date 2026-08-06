export type DetectedResponseLanguage = 'english' | 'hinglish' | 'hindi' | 'gujarati_roman' | 'mixed';

export type ResponseLanguageDetection = {
  detectedLanguage: DetectedResponseLanguage;
  responseLanguage: string;
  confidence: number;
};

const HINGLISH = /\b(?:kya|ka|ki|ke|kis|kon|kaun|hai|hain|he|batao|samjhao|kaam|karta|karti|padhai|shiksha)\b/i;
const GUJARATI_ROMAN = /\b(?:shu|su|chhe|chho|chhu|che|chhe|kare|bhanyu|bhanelu|aap[o]?|ni|nu|na)\b/i;
const EXPLICIT_LANGUAGE = /\b(?:in\s+hindi|hindi\s+me|hindi\s+mein)\b/i;
const EXPLICIT_ENGLISH = /\b(?:in\s+english|english\s+me|english\s+mein)\b/i;

/** Detects the user's writing language without translating names or technical values. */
export function detectResponseLanguage(query: string): ResponseLanguageDetection {
  if (EXPLICIT_ENGLISH.test(query)) return { detectedLanguage: 'english', responseLanguage: 'English', confidence: 0.99 };
  if (/\p{Script=Devanagari}/u.test(query) || EXPLICIT_LANGUAGE.test(query)) return { detectedLanguage: 'hindi', responseLanguage: 'Hindi', confidence: 0.98 };
  const gujaratiMatches = query.match(new RegExp(GUJARATI_ROMAN.source, 'gi'))?.length ?? 0;
  const hinglishMatches = query.match(new RegExp(HINGLISH.source, 'gi'))?.length ?? 0;
  if (gujaratiMatches > hinglishMatches && gujaratiMatches > 0) return { detectedLanguage: 'gujarati_roman', responseLanguage: 'Gujarati written in Roman script', confidence: 0.86 };
  if (hinglishMatches > 0) return { detectedLanguage: 'hinglish', responseLanguage: 'simple Hinglish written in Roman script', confidence: 0.9 };
  if (/\b(?:and|the|what|who|does|tell|about|explain|education|projects|skills)\b/i.test(query)) return { detectedLanguage: 'english', responseLanguage: 'English', confidence: 0.96 };
  return { detectedLanguage: 'mixed', responseLanguage: 'the dominant language used by the user', confidence: 0.5 };
}

export function listForLanguage(values: string[], language: DetectedResponseLanguage) {
  if (values.length < 2) return values[0] ?? '';
  const joiner = language === 'english' ? 'and' : language === 'gujarati_roman' ? 'ane' : 'aur';
  return `${values.slice(0, -1).join(', ')} ${joiner} ${values.at(-1)}`;
}

export function formatKnowledgeFacts(input: { language: DetectedResponseLanguage; kind: 'owner' | 'technology' | 'projects' | 'profile' | 'field' | 'unavailable' | 'clarification'; entity?: string; values?: string[]; field?: string; target?: string }) {
  const values = input.values ?? [];
  const entity = input.entity ?? 'The requested entity';
  const list = listForLanguage(values, input.language);
  if (input.language === 'english') {
    if (input.kind === 'owner') return `${entity} is the owner of ${input.target ?? list}.`;
    if (input.kind === 'technology') return `${entity} works with ${list}.`;
    if (input.kind === 'projects') return `${entity}'s projects: ${list}.`;
    if (input.kind === 'field') return `${entity}'s ${input.field?.replaceAll('_', ' ') ?? 'details'}:\n${list}`;
    if (input.kind === 'unavailable') return 'The uploaded knowledge does not contain sufficient information to answer this question.';
    if (input.kind === 'clarification') return 'Please specify the person or entity you mean.';
  }
  if (input.language === 'gujarati_roman') {
    if (input.kind === 'owner') return `${entity} ${input.target ?? list} na owner chhe.`;
    if (input.kind === 'technology') return `${entity} ${list} sathe kaam kare chhe.`;
    if (input.kind === 'projects') return `${entity} na projects: ${list}.`;
    if (input.kind === 'field') return `${entity} ni ${input.field?.replaceAll('_', ' ') ?? 'details'}:\n${list}`;
    if (input.kind === 'unavailable') return 'Uploaded knowledge ma aa question mate purti mahiti available nathi.';
    if (input.kind === 'clarification') return 'Kripya kai person ke entity vishe pucho chho te spasht karo.';
  }
  if (input.kind === 'owner') return `${entity} ${input.target ?? list} ke owner hain.`;
  if (input.kind === 'technology') return `${entity} ${list} par kaam karte hain.`;
  if (input.kind === 'projects') return `${entity} ke projects: ${list}.`;
  if (input.kind === 'field') return `${entity} ki ${input.field?.replaceAll('_', ' ') ?? 'details'}:\n${list}`;
  if (input.kind === 'unavailable') return 'Knowledge Base me is question ke liye sufficient information available nahi hai.';
  return 'Kripya jis person ya entity ke baare mein puch rahe hain use specific batayein.';
}
