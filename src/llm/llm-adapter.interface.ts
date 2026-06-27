import { ChatTurn } from '../conversation/conversation.types';

export interface LlmAdapter {
  readonly name: string;
  isConfigured(): boolean;
  isRetryable(err: unknown): boolean;
  generate(systemPrompt: string, messages: ChatTurn[]): Promise<string>;
}

export const LLM_ADAPTERS = 'LLM_ADAPTERS';
export type LlmAdapterRegistry = Map<string, LlmAdapter>;
