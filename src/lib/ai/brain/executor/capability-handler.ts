import { utilitySchema } from '@/lib/ai/tools/utility/utility-schema';
import { runUtility } from '@/lib/ai/tools/utility/utility-service';
import type { CapabilityHandler, ExecutionAdapters, ExecutionPlan, ExecutionResult } from './executor-types';

const DEFAULT_TIMEOUT_MS = 12_000;

function base(plan: ExecutionPlan, overrides: Partial<ExecutionResult>): ExecutionResult {
  return {
    status: 'unavailable', capability: plan.capability, answerSource: 'system', data: null,
    supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false,
    fallbackReason: null, errorCode: null, traceMetadata: {}, ...overrides,
  };
}

function adapterHandler(capability: 'knowledge' | 'general_ai' | 'file', adapters: ExecutionAdapters): CapabilityHandler {
  return {
    capability, timeout: DEFAULT_TIMEOUT_MS, enabled: true,
    canHandle: (plan) => plan.capability === capability,
    async execute(plan, context) {
      const adapter = adapters[capability];
      if (adapter) return adapter(plan, context);
      const fallbackAllowed = capability === 'knowledge' && context.assistantMode === 'knowledge_hybrid';
      return base(plan, {
        status: 'unavailable', answerSource: capability === 'file' ? 'file' : capability === 'knowledge' ? 'knowledge_graph' : 'general_ai',
        fallbackAllowed,
        fallbackReason: fallbackAllowed ? 'Knowledge adapter returned no supported answer.' : null,
        errorCode: 'ADAPTER_NOT_WIRED',
      });
    },
  };
}

export function createCapabilityHandlers(adapters: ExecutionAdapters = {}): CapabilityHandler[] {
  const utility: CapabilityHandler = {
    capability: 'utility', timeout: 3_000, enabled: true,
    canHandle: (plan) => plan.capability === 'utility',
    async execute(plan) {
      const parsed = utilitySchema.safeParse(plan.arguments);
      if (!parsed.success) return base(plan, {
        status: 'clarification', answerSource: 'tool',
        data: { question: plan.clarificationQuestion ?? 'Please provide the required calculation or time details.' },
        errorCode: 'MISSING_UTILITY_ARGUMENTS',
      });
      const data = runUtility(parsed.data);
      return base(plan, { status: 'success', answerSource: 'tool', data });
    },
  };

  const clarification: CapabilityHandler = {
    capability: 'clarification', timeout: 1_000, enabled: true,
    canHandle: (plan) => plan.capability === 'clarification',
    async execute(plan) { return base(plan, { status: 'clarification', answerSource: 'system', data: { question: plan.clarificationQuestion ?? 'Please clarify your request.' } }); },
  };

  const unavailable = (capability: 'web_search' | 'unsupported'): CapabilityHandler => ({
    capability, timeout: 1_000, enabled: true,
    canHandle: (plan) => plan.capability === capability,
    async execute(plan) { return base(plan, { status: 'unavailable', answerSource: 'system', errorCode: capability === 'web_search' ? 'WEB_SEARCH_UNAVAILABLE' : 'UNSUPPORTED_CAPABILITY' }); },
  });

  return [adapterHandler('knowledge', adapters), adapterHandler('general_ai', adapters), utility, unavailable('web_search'), adapterHandler('file', adapters), clarification, unavailable('unsupported')];
}
