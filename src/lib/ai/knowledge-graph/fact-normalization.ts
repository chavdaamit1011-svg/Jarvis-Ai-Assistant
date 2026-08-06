import { normalizeEntityName } from './normalize-entity';

const EQUIVALENTS: Array<[RegExp, string]> = [
  [/^react\s*\.?(?:js)?$/i, 'react.js'], [/^node\s*\.?(?:js)?$/i, 'node.js'], [/^mongo\s*db$/i, 'mongodb'],
  [/^java\s*script$/i, 'javascript'], [/^type\s*script$/i, 'typescript'], [/^web\s+developer$/i, 'web developer'],
];

export function normalizeGraphFactValue(value: string | number | boolean | string[]): string {
  const normalized = Array.isArray(value) ? value.map((item) => normalizeGraphFactValue(item)).join('|') : normalizeEntityName(String(value));
  return EQUIVALENTS.find(([pattern]) => pattern.test(normalized))?.[1] ?? normalized;
}

export function valuesConflict(predicate: string, values: Array<string | number | boolean | string[]>) {
  if (!new Set(['role', 'profession', 'experience', 'owner_of', 'ownerOf']).has(predicate)) return false;
  return new Set(values.map(normalizeGraphFactValue)).size > 1;
}
