import { InferenceClient } from '@huggingface/inference';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatTurn } from '../../../conversation/conversation.types';
import { LlmAdapter } from '../llm-adapter.interface';

const MAX_TOKENS = 512;

/**
 * HuggingFace Inference API adapter. Uses a free instruct model (configurable
 * via `HF_MODEL`). Active provider by default.
 */
@Injectable()
export class HuggingFaceAdapter implements LlmAdapter {
  readonly name = 'huggingface';
  private readonly logger = new Logger(HuggingFaceAdapter.name);
  private readonly apiKey?: string;
  private readonly model: string;
  private client?: InferenceClient;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('HUGGINGFACE_API_KEY');
    this.model = config.get<string>('HF_MODEL', 'Qwen/Qwen2.5-7B-Instruct');
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  isRetryable(err: unknown): boolean {
    const status = this.statusOf(err);
    if (status !== undefined) {
      return status >= 500;
    }
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('econn') ||
      msg.includes('fetch failed')
    );
  }

  async generate(systemPrompt: string, messages: ChatTurn[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('HuggingFace adapter is not configured (missing HUGGINGFACE_API_KEY)');
    }
    this.client ??= new InferenceClient(this.apiKey);

    let response;
    try {
      response = await this.client.chatCompletion({
        model: this.model,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
    } catch (err) {
      const status = this.statusOf(err);
      this.logger.error(
        `Inference failed for model '${this.model}'` +
          `${status !== undefined ? ` (status ${status})` : ''}: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('HuggingFace returned an empty completion');
    }
    return text;
  }

  private statusOf(err: unknown): number | undefined {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: unknown }).status;
      return typeof status === 'number' ? status : undefined;
    }
    return undefined;
  }
}
