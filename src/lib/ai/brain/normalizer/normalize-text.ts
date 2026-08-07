import type { NormalizerCorrection } from './normalizer-types';

const PROTECTED = /(?:https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|`[^`]+`)/g;

// These are request-intent anchors, not names or sentence templates. Restricting
// correction to this small semantic vocabulary prevents us from "correcting"
// user entities, URLs, emails, code, or other exact values.
const INTENT_ANCHORS = [
  'who', 'what', 'where', 'when', 'about', 'profile', 'education', 'degree',
  'university', 'college', 'project', 'skill', 'technology', 'language',
  'backend', 'frontend', 'course', 'training', 'current', 'completed', 'pursuing',
  'location', 'city', 'state', 'portfolio', 'contact',
];

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function correctIntentTypos(value: string, corrections: NormalizerCorrection[]) {
  return value.replace(/\b[\p{L}]{3,}\b/gu, (word) => {
    const normalized = word.toLowerCase();
    if (INTENT_ANCHORS.includes(normalized)) return word;
    const candidate = INTENT_ANCHORS.find((anchor) => anchor.length >= 3 && Math.abs(anchor.length - normalized.length) <= 1 && editDistance(normalized, anchor) === 1);
    if (!candidate) return word;
    corrections.push({ original: word, corrected: candidate, confidence: 0.86 });
    return candidate;
  });
}

export function normalizeText(rawQuery: string) {
  const raw = rawQuery.normalize('NFKC').trim(); const corrections: NormalizerCorrection[] = [];
  const protectedValues: string[] = [];
  let text = raw.replace(PROTECTED, (value) => { protectedValues.push(value); return `__VALUE_${protectedValues.length - 1}__`; });
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[!?]{2,}/g, '?').replace(/\s+/g, ' ').trim();
  text = text.replace(/\b([\p{L}])\1{2,}\b/gu, (word, character) => { const corrected = `${character}${character}`; corrections.push({ original: word, corrected, confidence: 0.9 }); return corrected; });
  text = text.replace(/\b(about|project|skill|technology|education|experience)s\b/gi, (word, root) => { const corrected = root.toLowerCase(); if (word.toLowerCase() !== corrected) corrections.push({ original: word, corrected, confidence: 0.97 }); return corrected; });
  text = text.replace(/\b([\p{L}]{2,})s(?=\s+(?:education|projects?|skills?|technologies|experience)\b)/giu, (word, root) => { corrections.push({ original: word, corrected: root, confidence: 0.76 }); return root; });
  text = correctIntentTypos(text, corrections);
  text = text.replace(/__VALUE_(\d+)__/g, (_, index) => protectedValues[Number(index)] ?? '');
  return { cleanedQuery: text, corrections };
}
