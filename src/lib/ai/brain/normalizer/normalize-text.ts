import type { NormalizerCorrection } from './normalizer-types';

const PROTECTED = /(?:https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|`[^`]+`)/g;

export function normalizeText(rawQuery: string) {
  const raw = rawQuery.normalize('NFKC').trim(); const corrections: NormalizerCorrection[] = [];
  const protectedValues: string[] = [];
  let text = raw.replace(PROTECTED, (value) => { protectedValues.push(value); return `__VALUE_${protectedValues.length - 1}__`; });
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[!?]{2,}/g, '?').replace(/\s+/g, ' ').trim();
  text = text.replace(/\b([\p{L}])\1{2,}\b/gu, (word, character) => { const corrected = `${character}${character}`; corrections.push({ original: word, corrected, confidence: 0.9 }); return corrected; });
  text = text.replace(/\b(about|project|skill|technology|education|experience)s\b/gi, (word, root) => { const corrected = root.toLowerCase(); if (word.toLowerCase() !== corrected) corrections.push({ original: word, corrected, confidence: 0.97 }); return corrected; });
  text = text.replace(/\b([\p{L}]{2,})s(?=\s+(?:education|projects?|skills?|technologies|experience)\b)/giu, (word, root) => { corrections.push({ original: word, corrected: root, confidence: 0.76 }); return root; });
  text = text.replace(/__VALUE_(\d+)__/g, (_, index) => protectedValues[Number(index)] ?? '');
  return { cleanedQuery: text, corrections };
}
