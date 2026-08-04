import type { ClarificationInput } from './clarification-types';

export function buildClarification(input: ClarificationInput) {
  if (input.ambiguousEntities?.length) return `Kis person ya entity ke baare mein puch rahe hain? ${input.ambiguousEntities.join(', ')}`;
  const query = input.query.toLowerCase();
  const isLinks = /\b(?:link|links|url|profile|account|website)\b/.test(query);
  const isContact = /\b(?:contact|details)\b/.test(query);
  const isProjects = /\b(?:project|projects|app|application)\b/.test(query);
  if (isLinks && !input.entityName) {
    if (/\b(?:profile|account)\b/.test(query)) return 'Kis person ka profile chahiye—LinkedIn, GitHub, Portfolio ya Website?';
    return 'Kis person ya project ki links chahiye?';
  }
  if (isLinks && input.entityName) {
    const options = input.availableLinkTypes.length ? input.availableLinkTypes.join(', ') : 'LinkedIn, GitHub, Portfolio ya Website';
    return `${input.entityName} ki kaunsi link chahiye—${options}?`;
  }
  if (isContact && !input.entityName) return 'Kiski contact details chahiye—email, phone ya dono?';
  if (isContact) return `${input.entityName} ki kaunsi contact detail chahiye—email, phone ya dono?`;
  if (isProjects) return 'Kis person ya organization ke projects dekhne hain?';
  return 'Kripya thoda aur specific bataiye.';
}
