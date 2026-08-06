import type { RetrievedChunk } from './rag-types';

export type SupportedProjectFact = {
  projectName: string;
  description: string | null;
  technologies: string[];
  projectUrl: string | null;
  documentId: string;
  chunkId: string;
  supportingText: string;
  confidence: number;
};

const URL = /https?:\/\/[^\s|]+/i;
const TECH = /\b(?:Next\.js|React\.js|Node\.js|Express\.js|MongoDB|JavaScript|TypeScript|HTML|CSS|Bootstrap|Tailwind CSS|PHP)\b/gi;
const HEADING = /^(?:project(?:\s+work)?|projects|portfolio projects)$/i;
const NOT_A_PROJECT = /^(?:project work|projects?|web development projects?|technical|education|experience|certification|skills?)$/i;

function title(line: string) {
  const clean = line.replace(/^[-*•\d.)\s]+/, '').trim();
  if (!clean || clean.length > 100 || NOT_A_PROJECT.test(clean)) return null;
  // A project title is either explicitly labelled, a product-style title, or a
  // short title directly under a Projects heading. Sentences are never titles.
  if (/^(?:project|product)\s*:/i.test(clean)) return clean.replace(/^(?:project|product)\s*:/i, '').trim();
  if (/^(?:e-?commerce|[A-Z][\w.-]*(?:\s+[A-Z][\w.-]*){0,5})\s*(?:\([^)]{2,80}\))?$/i.test(clean) && !/[.!?]$/.test(clean)) return clean;
  return null;
}

/** Extracts only explicitly named project records; it never infers projects from skills. */
export function extractSupportedProjects(chunks: RetrievedChunk[]): SupportedProjectFact[] {
  const results: SupportedProjectFact[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const lines = chunk.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    let inProjects = false;
    for (let index = 0; index < lines.length; index += 1) {
      if (HEADING.test(lines[index])) { inProjects = true; continue; }
      if (/^[A-Z][A-Z\s&]{4,}$/.test(lines[index]) && !HEADING.test(lines[index])) inProjects = false;
      const projectName = title(lines[index]);
      if (!projectName || !inProjects && !/^(?:project|product)\s*:/i.test(lines[index])) continue;

      const details = lines.slice(index + 1, index + 8).filter((line) => !title(line) && !HEADING.test(line));
      const supportingText = [lines[index], ...details].join('\n');
      const key = `${projectName.toLowerCase()}|${chunk.documentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        projectName,
        description: details.find((line) => !URL.test(line)) ?? null,
        technologies: [...new Set(supportingText.match(TECH) ?? [])],
        projectUrl: supportingText.match(URL)?.[0] ?? null,
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        supportingText,
        confidence: 1,
      });
    }
  }
  return results;
}

export function formatSupportedProjects(projects: SupportedProjectFact[], language: 'english' | 'hinglish' | 'hindi' | 'gujarati_roman' | 'mixed', subject?: string | null) {
  const heading = language === 'english'
    ? `Supported projects${subject ? ` for ${subject}` : ''}:`
    : language === 'gujarati_roman'
      ? `${subject ?? 'Aa person'} na supported projects:`
      : `${subject ?? 'Is person'} ke supported projects:`;
  return `${heading}\n\n${projects.map((project) => {
    const parts = [`- **${project.projectName}**`];
    if (project.description) parts.push(`— ${project.description}`);
    if (project.technologies.length) parts.push(`(${project.technologies.join(', ')})`);
    if (project.projectUrl) parts.push(project.projectUrl);
    return parts.join(' ');
  }).join('\n')}`;
}
