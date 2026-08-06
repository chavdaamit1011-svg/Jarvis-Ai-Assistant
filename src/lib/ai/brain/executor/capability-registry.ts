import { ExecutorError } from './executor-errors';
import type { CapabilityHandler, ExecutorCapability } from './executor-types';

export class CapabilityRegistry {
  private readonly handlers = new Map<ExecutorCapability, CapabilityHandler>();

  register(handler: CapabilityHandler) {
    if (this.handlers.has(handler.capability)) {
      throw new ExecutorError('DUPLICATE_HANDLER', `A handler for ${handler.capability} is already registered.`);
    }
    this.handlers.set(handler.capability, handler);
    return this;
  }

  get(capability: ExecutorCapability) {
    const handler = this.handlers.get(capability);
    if (!handler) throw new ExecutorError('HANDLER_NOT_FOUND', `No handler is registered for ${capability}.`);
    if (!handler.enabled) throw new ExecutorError('HANDLER_DISABLED', `The ${capability} handler is disabled.`);
    return handler;
  }

  list() { return [...this.handlers.values()]; }
}
