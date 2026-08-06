import type { KnowledgeGraphEntityType } from './types';

export function normalizeEntityName(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s.-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function createTemporaryEntityId(entityType: KnowledgeGraphEntityType, name: string) {
  const normalized = normalizeEntityName(name).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return `${entityType}:${normalized || 'unknown'}`;
}

export function normalizeAliases(name: string, aliases: string[] = []) {
  const values = new Set([name, ...aliases].map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean));
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words.length <= 3) values.add([...words].reverse().join(' '));
  return [...values];
}
