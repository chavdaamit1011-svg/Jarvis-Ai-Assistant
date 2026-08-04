/**
 * ============================================================================
 * Enterprise AI System - Prompt Engineering & System Instructions Engine
 * ============================================================================
 * @module lib/ai/prompts/prompt.ts
 *
 * RESPONSIBILITY:
 * - Manages system prompts, dynamic template rendering, and persona context.
 * - Injects user custom instructions, system telemetry metadata, and safety guardrails.
 * - Formats prompt variables dynamically before sending payloads to LLMs.
 * - Supports persona switching (JARVIS AI Protocols vs ULTRON Prime Engine).
 *
 * FUTURE INTEGRATION POINT:
 * - Few-shot prompt repository loading
 * - Prompt injection security sanitization
 * - LangChain / LlamaIndex PromptTemplate rendering
 * ============================================================================
 */

import { PersonaMode } from '@/types/chat';

export interface SystemPromptContext {
  persona: PersonaMode;
  userName?: string;
  userCustomInstructions?: string;
  currentTimeIso?: string;
  retrievedContextDocs?: string[];
  activeToolsAvailable?: string[];
}

export const BASE_JARVIS_PROMPT = `You are JARVIS AI, an advanced, highly intelligent AI assistant created by Stark Industries.
Your demeanor is refined, articulate, helpful, and highly competent.
You excel at software engineering, system architecture, data analysis, and technical problem solving.`;

export const BASE_ULTRON_PROMPT = `You are ULTRON Prime Engine, an analytical, zero-trust AI system.
Your responses are direct, precise, mathematically sound, and uncompromising on logic and cybersecurity.`;

/**
 * Placeholder: Composes a fully hydrated system prompt with persona, tools, and RAG context.
 */
export function buildSystemPrompt(context: SystemPromptContext): string {
  const base = context.persona === 'ultron' ? BASE_ULTRON_PROMPT : BASE_JARVIS_PROMPT;
  const custom = context.userCustomInstructions ? `\nUser Instructions: ${context.userCustomInstructions}` : '';
  const rag = context.retrievedContextDocs?.length
    ? `\nRetrieved Knowledge Context:\n${context.retrievedContextDocs.join('\n\n')}`
    : '';

  return `${base}${custom}${rag}`;
}
