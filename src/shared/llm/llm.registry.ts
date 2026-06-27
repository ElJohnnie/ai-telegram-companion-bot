import { Provider } from '@nestjs/common';
import {
  LLM_ADAPTERS,
  LlmAdapter,
  LlmAdapterRegistry,
} from './llm-adapter.interface';
import { HuggingFaceAdapter } from './adapters/huggingface.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';

/**
 * All adapters known to the app. Register a new LLM by adding its class here
 * (and to the module's `providers`); it becomes selectable by its `name`.
 */
const ADAPTER_CLASSES = [HuggingFaceAdapter, AnthropicAdapter];

/**
 * Builds the Map<name, LlmAdapter> registry that `LlmService` resolves the
 * active provider (and optional fallback) from.
 */
export const llmRegistryProvider: Provider = {
  provide: LLM_ADAPTERS,
  inject: ADAPTER_CLASSES,
  useFactory: (...adapters: LlmAdapter[]): LlmAdapterRegistry =>
    new Map(adapters.map((a) => [a.name, a])),
};

export const llmAdapterProviders = ADAPTER_CLASSES;
