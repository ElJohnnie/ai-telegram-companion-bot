import { ChatTurn } from '../../conversation/conversation.types';

/**
 * Provider-agnostic contract every LLM adapter implements. To add a new LLM,
 * create one adapter that wires its SDK's call into `generate` and classifies
 * its own transient errors in `isRetryable` — nothing else in the bot changes.
 */
export interface LlmAdapter {
  /** Stable identifier used to select the adapter via config (e.g. 'huggingface'). */
  readonly name: string;

  /** Whether the adapter has the credentials it needs (e.g. an API key). */
  isConfigured(): boolean;

  /**
   * SDK-specific classification of a thrown error as transient/retryable
   * (rate limit, connection error, 5xx). Drives whether the orchestrator falls
   * back to another provider.
   */
  isRetryable(err: unknown): boolean;

  /** Produce a single reply given the system prompt and conversation turns. */
  generate(systemPrompt: string, messages: ChatTurn[]): Promise<string>;
}

/** DI token for the Map<name, LlmAdapter> registry. */
export const LLM_ADAPTERS = 'LLM_ADAPTERS';
export type LlmAdapterRegistry = Map<string, LlmAdapter>;
