import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../conversation/conversation.service';
import { LlmService } from '../shared/llm/llm.service';
import { buildPersonaPrompt } from './persona';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly botName: string;
  private readonly personaPrompt: string;

  constructor(
    private readonly conversation: ConversationService,
    private readonly llm: LlmService,
    config: ConfigService,
  ) {
    this.botName = config.getOrThrow<string>('BOT_NAME').trim();
    this.personaPrompt = buildPersonaPrompt(this.botName);
    this.logger.log(`Persona loaded for bot '${this.botName}'`);
  }

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

    const reply = await this.llm.generateReply(this.personaPrompt, [
      ...context,
      { role: 'user', content: text },
    ]);

    await this.conversation.append(telegramId, userId, context, text, reply);
    return reply;
  }
}
