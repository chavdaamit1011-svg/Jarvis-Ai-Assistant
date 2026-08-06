import { detectResponseLanguage } from '@/lib/ai/response-language';

const SCRIPT_NAMES: Array<[RegExp, string]> = [[/\p{Script=Devanagari}/u, 'Devanagari'], [/\p{Script=Gujarati}/u, 'Gujarati'], [/\p{Script=Arabic}/u, 'Arabic'], [/\p{Script=Cyrillic}/u, 'Cyrillic'], [/\p{Script=Han}/u, 'Han'], [/\p{Script=Hiragana}|\p{Script=Katakana}/u, 'Japanese']];

export function detectQueryLanguage(query: string) {
  const explicit = query.match(/\b(?:answer|reply|respond|explain)\s+(?:in\s+)?([\p{L}-]{2,40})\b/iu)?.[1];
  if (explicit && !/^(?:the|a|an)$/i.test(explicit)) return { detectedLanguage: 'explicit_request', responseLanguage: explicit, confidence: 0.99 };
  const known = detectResponseLanguage(query);
  if (known.detectedLanguage !== 'mixed') return { detectedLanguage: known.detectedLanguage, responseLanguage: known.responseLanguage, confidence: known.confidence };
  const script = SCRIPT_NAMES.find(([pattern]) => pattern.test(query))?.[1] ?? 'Latin or mixed script';
  return { detectedLanguage: script, responseLanguage: script === 'Latin or mixed script' ? 'the dominant language used by the user' : `${script} language`, confidence: script === 'Latin or mixed script' ? 0.45 : 0.75 };
}
