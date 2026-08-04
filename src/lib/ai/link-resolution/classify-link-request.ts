import { normalizeQuery } from '@/lib/ai/query-understanding/normalize-query';
import { detectPlatform } from './platform-config';
import type { LinkRequestClassification } from './types';

const LINK_SIGNAL = /\b(?:link|links|url|profile|account|website|web site|webpage|site)\b/;

/** Reads an entity immediately before a Hinglish/Gujarati possessive marker. */
export function findExplicitLinkEntityName(query: string) {
  const normalizedQuery = normalizeQuery(query);
  const match = normalizedQuery.match(/^(.+?)\s+(?:ka|ki|ke|no|ni)\s+/);
  if (!match) return null;
  const value = match[1].trim();
  if (!value || /\b(?:link|links|profile|account|website|url)\b/.test(value)) return null;
  if (detectPlatform(value) !== 'unknown') return null;
  return value.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/** Separates official platform links from links stored for a known entity. */
export function classifyLinkRequest(query: string, entityName: string | null): LinkRequestClassification | null {
  const normalizedQuery = normalizeQuery(query);
  const platform = detectPlatform(normalizedQuery);
  if (platform !== 'unknown') {
    return {
      linkRequestType: entityName ? 'entity_profile' : platform === 'website' ? 'ambiguous' : 'platform_homepage',
      platform,
      entityName,
    };
  }
  if (!LINK_SIGNAL.test(normalizedQuery)) return null;
  return { linkRequestType: 'ambiguous', platform: 'unknown', entityName };
}
