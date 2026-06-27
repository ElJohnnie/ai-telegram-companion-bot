import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceClient } from '@huggingface/inference';
import { LlmAdapter } from '../llm-adapter.interface';
import { ChatTurn } from '../../../conversation/conversation.types';

const MAX_TOKENS = 512;

/**
 * HuggingFace Inference API adapter. Uses a free instruct model (configurable
 * via `HF_MODEL`). Active provider by default.
 */
@Injectable()
export class HuggingFaceAdapter implements LlmAdapter {
  readonly name = 'huggingface';
  private readonly apiKey?: string;
  private readonly model: string;
  private client?: InferenceClient;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('HUGGINGFACE_API_KEY');
    this.model = config.get<string>(
      'HF_MODEL',
      'meta-llama/Llama-3.2-3B-Instruct',
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  isRetryable(err: unknown): boolean {
    // Best-effort: HF's client throws plain errors. Treat network/timeout/5xx
    // as transient; everything else (4xx, bad request) as non-retryable.
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

    const response = await this.client.chatCompletion({
      model: this.model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

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
