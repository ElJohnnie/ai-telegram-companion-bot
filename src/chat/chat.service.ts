import { Injectable, Logger } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { LlmService } from '../shared/llm/llm.service';
import { AYLA_SYSTEM_PROMPT } from './persona';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversation: ConversationService,
    private readonly llm: LlmService,
  ) {}

  /**
   * Handle one inbound message: assemble context, generate a reply, persist
   * the exchange, and return the reply text.
   */
  async handleMessage(
    telegramId: string,
    text: string,
    username?: string,
  ): Promise<string> {
    const userId = await this.conversation.ensureUser(telegramId, username);
    const context = await this.conversation.getContext(telegramId);

    const reply = await this.llm.generateReply(AYLA_SYSTEM_PROMPT, [
      ...context,
      { role: 'user', content: text },
    ]);

    await this.conversation.append(telegramId, userId, context, text, reply);
    return reply;
  }
}
