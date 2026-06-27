import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatTurn } from '../conversation/conversation.types';
import {
  LLM_ADAPTERS,
  LlmAdapter,
  LlmAdapterRegistry,
} from './llm-adapter.interface';

/**
 * Provider-agnostic orchestrator. Selects the active LLM (and optional
 * fallback) from config and generates replies, falling back only on a
 * retryable failure of the primary provider.
 */
@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private primary!: LlmAdapter;
  private fallback?: LlmAdapter;

  constructor(
    @Inject(LLM_ADAPTERS) private readonly registry: LlmAdapterRegistry,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const primaryName = this.config.get<string>('LLM_PROVIDER', 'huggingface');
    const primary = this.registry.get(primaryName);
    if (!primary) {
      throw new Error(
        `LLM_PROVIDER='${primaryName}' is not a known adapter. Available: ${[...this.registry.keys()].join(', ')}`,
      );
    }

    // Resolve the optional fallback (known + configured + distinct from primary).
    const fallbackName = this.config.get<string>('LLM_FALLBACK_PROVIDER');
    let fallback: LlmAdapter | undefined;
    if (fallbackName) {
      const candidate = this.registry.get(fallbackName);
      if (!candidate || !candidate.isConfigured()) {
        this.logger.warn(
          `LLM_FALLBACK_PROVIDER='${fallbackName}' is unknown or not configured; running without a fallback.`,
        );
      } else if (candidate.name === primary.name) {
        this.logger.warn(
          'LLM_FALLBACK_PROVIDER equals LLM_PROVIDER; ignoring the fallback.',
        );
      } else {
        fallback = candidate;
      }
    }

    // If the selected primary isn't configured (e.g. missing API key), don't
    // crash the bot — promote a configured fallback to primary so we can keep
    // serving. Only fail when there is nothing usable at all.
    if (!primary.isConfigured()) {
      if (!fallback) {
        throw new Error(
          `LLM provider '${primaryName}' is not configured (missing API key) and no usable fallback is available.`,
        );
      }
      this.logger.warn(
        `LLM provider '${primaryName}' is not configured; promoting fallback '${fallback.name}' to primary.`,
      );
      this.primary = fallback;
      this.fallback = undefined;
    } else {
      this.primary = primary;
      this.fallback = fallback;
    }

    this.logger.log(
      `LLM provider: '${this.primary.name}'${this.fallback ? `, fallback: '${this.fallback.name}'` : ' (no fallback)'}`,
    );
  }

  /**
   * Generate a reply via the active provider. Fall back to the configured
   * fallback only when the primary throws a retryable error (rate limit,
   * connection error, 5xx). Non-retryable errors (4xx, auth) are rethrown.
   */
  async generateReply(
    systemPrompt: string,
    messages: ChatTurn[],
  ): Promise<string> {
    try {
      return await this.primary.generate(systemPrompt, messages);
    } catch (err) {
      if (!this.fallback || !this.primary.isRetryable(err)) {
        this.logger.error(
          `'${this.primary.name}' failed (${this.describe(err)})` +
            (this.fallback ? '; non-retryable, not falling back' : '; no fallback configured'),
        );
        throw err;
      }
      this.logger.warn(
        `'${this.primary.name}' unavailable (${this.describe(err)}); falling back to '${this.fallback.name}'`,
      );
      return this.fallback.generate(systemPrompt, messages);
    }
  }

  private describe(err: unknown): string {
    if (err && typeof err === 'object' && 'status' in err) {
      const e = err as { status?: unknown; constructor?: { name?: string } };
      return `${e.constructor?.name ?? 'Error'} status=${e.status ?? 'n/a'}`;
    }
    return err instanceof Error ? err.message : String(err);
  }
}
