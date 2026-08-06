export * from './entity-types';
export * from './entity-manager';
import { conversationEntityManager } from './entity-manager';
export const setActiveEntity = conversationEntityManager.setActiveEntity.bind(conversationEntityManager);
export const getActiveEntity = conversationEntityManager.getActiveEntity.bind(conversationEntityManager);
export const clearActiveEntity = conversationEntityManager.clearActiveEntity.bind(conversationEntityManager);
export const resolvePronouns = conversationEntityManager.resolvePronouns.bind(conversationEntityManager);
