import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { ChatService } from '../chat/chat.service';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);
  private readonly botName: string;

  constructor(
    private readonly chat: ChatService,
    config: ConfigService,
  ) {
    this.botName = config.getOrThrow<string>('BOT_NAME').trim();
  }

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply(
      `Hi, I'm ${this.botName} 💬 — I'm here to chat whenever you are. What's on your mind?`,
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply(
      'Just talk to me like you would a friend — send a message and I’ll reply. I remember our recent conversation.',
    );
  }

  @On('text')
  async onText(@Ctx() ctx: Context): Promise<void> {
    if (!ctx.has(message('text'))) {
      return;
    }
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      return; // command handled elsewhere
    }

    const telegramId = String(ctx.from.id);
    const username = ctx.from.username;

    try {
      await ctx.sendChatAction('typing');
      const reply = await this.chat.handleMessage(telegramId, text, username);
      await ctx.reply(reply);
    } catch (err) {
      this.logger.error(`Failed to handle message from ${telegramId}: ${err}`);
      await ctx.reply(
        'Sorry — I had trouble responding just now. Could you try again in a moment?',
      );
    }
  }
}
