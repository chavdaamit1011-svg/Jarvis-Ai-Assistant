import type { QueryUnderstanding } from '@/lib/ai/query-understanding';

/** Stable graph vocabulary; add domain concepts here, never per entity. */
export const GRAPH_RELATIONSHIPS = {
  ownerOf: 'OWNER_OF',
  usesTechnology: 'USES_TECHNOLOGY',
  built: 'BUILT',
  workedOn: 'WORKED_ON',
} as const;

export const GRAPH_FACT_PREDICATES = {
  profession: 'profession', role: 'role', linkedinUrl: 'linkedin_url', githubUrl: 'github_url',
  portfolioUrl: 'portfolio_url', websiteUrl: 'website_url', email: 'email', phone: 'phone',
} as const;

export const QUERY_FIELD_TO_GRAPH_PREDICATE: Partial<Record<QueryUnderstanding['requestedField'], string>> = {
  linkedin_url: GRAPH_FACT_PREDICATES.linkedinUrl, github_url: GRAPH_FACT_PREDICATES.githubUrl,
  portfolio_url: GRAPH_FACT_PREDICATES.portfolioUrl, website_url: GRAPH_FACT_PREDICATES.websiteUrl,
  email: GRAPH_FACT_PREDICATES.email, phone: GRAPH_FACT_PREDICATES.phone, role: GRAPH_FACT_PREDICATES.role,
};
