import type { UniversalPlan } from '../planner';

export type ContextMessage = { role: 'user' | 'assistant'; content: string };
export type ActiveEntity = { type: string; name: string; id?: string };
export type ContextResolverInput = { currentQuery: string; recentMessages: ContextMessage[]; activeEntities: ActiveEntity[]; previousPlan?: Pick<UniversalPlan, 'entities' | 'requestedFields' | 'responseLanguage'> | null };
export type ResolvedReference = { original: string; entity: ActiveEntity | null; confidence: number };
export type ContextResolution = { standaloneQuery: string; referencedEntities: ActiveEntity[]; resolvedReferences: ResolvedReference[]; informationNeed: string; requestedAttributes: string[]; conversationDependencies: string[]; requiresClarification: boolean; clarificationQuestion: string | null; confidence: number; responseLanguage: string };
