import { CapabilityRegistry } from './capability-registry';
import { createCapabilityHandlers } from './capability-handler';
import type { ExecutionAdapters } from './executor-types';

export function createDefaultCapabilityRegistry(adapters: ExecutionAdapters = {}) {
  const registry = new CapabilityRegistry();
  createCapabilityHandlers(adapters).forEach((handler) => registry.register(handler));
  return registry;
}

export * from './executor-types';
export * from './executor-result-schema';
export * from './capability-registry';
export * from './capability-handler';
export * from './execute-plan';
export * from './executor-errors';
