import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LlmAdapter } from '../llm-adapter.interface';
import { ChatTurn } from '../../../conversation/conversation.types';

/**
 * Anthropic (Claude) adapter. Haiku 4.5 — fastest/cheapest tier. Note: Haiku
 * does NOT support `thinking` or `output_config.effort` (both 400), so we send
 * a plain system + messages request. Kept available but inactive unless
 * selected via `LLM_PROVIDER`/`LLM_FALLBACK_PROVIDER`.
 */
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

@Injectable()
export class AnthropicAdapter implements LlmAdapter {
  readonly name = 'anthropic';
  private readonly apiKey?: string;
  private client?: Anthropic;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('ANTHROPIC_API_KEY');
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  isRetryable(err: unknown): boolean {
    if (
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.APIConnectionError
    ) {
      return true;
    }
    if (err instanceof Anthropic.APIError) {
      return typeof err.status === 'number' && err.status >= 500;
    }
    return false;
  }

  async generate(systemPrompt: string, messages: ChatTurn[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic adapter is not configured (missing ANTHROPIC_API_KEY)');
    }
    this.client ??= new Anthropic({ apiKey: this.apiKey });

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map(
        (m): Anthropic.MessageParam => ({ role: m.role, content: m.content }),
      ),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      throw new Error(
        `Anthropic returned no text (stop_reason=${response.stop_reason})`,
      );
    }
    return text;
  }
}
