import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { ChatTurn } from './conversation.types';

/** Recent turns kept for context assembly. */
const HISTORY_LIMIT = 1000;
// Redis cache TTL in seconds (60h).
const CACHE_TTL_SECONDS = 60 * 60 * 60;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  private cacheKey(telegramId: string): string {
    return `conv:${telegramId}`;
  }

  /**
   * Ensure a User row exists for this Telegram user, returning its id.
   */
  async ensureUser(telegramId: string, username?: string): Promise<string> {
    const user = await this.prisma.user.upsert({
      where: { telegramId },
      update: { username },
      create: { telegramId, username },
    });
    return user.id;
  }

  /**
   * Recent conversation turns, oldest-first. Reads the Redis hot cache and
   * hydrates from Postgres on a miss.
   */
  async getContext(telegramId: string): Promise<ChatTurn[]> {
    const key = this.cacheKey(telegramId);
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as ChatTurn[];
      }
    } catch (err) {
      this.logger.warn(`Redis read failed, hydrating from Postgres: ${err}`);
    }

    const rows = await this.prisma.message.findMany({
      where: { user: { telegramId } },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    
    const turns: ChatTurn[] = rows
      .reverse()
      .map((r: any) => ({ role: r.role, content: r.content }));

    await this.writeCache(key, turns);
    return turns;
  }

  /**
   * Persist a user turn and the assistant reply to Postgres (source of truth)
   * and refresh the Redis hot cache. `priorContext` is the history the caller
   * already loaded for this turn (the state before this exchange).
   */
  async append(
    telegramId: string,
    userId: string,
    priorContext: ChatTurn[],
    userText: string,
    assistantText: string,
  ): Promise<void> {
    await this.prisma.message.createMany({
      data: [
        { userId, role: 'user', content: userText },
        { userId, role: 'assistant', content: assistantText },
      ],
    });

    const updated = [
      ...priorContext,
      { role: 'user' as const, content: userText },
      { role: 'assistant' as const, content: assistantText },
    ].slice(-HISTORY_LIMIT);
    await this.writeCache(this.cacheKey(telegramId), updated);
  }

  private async writeCache(key: string, turns: ChatTurn[]): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(turns),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Redis write failed (non-fatal): ${err}`);
    }
  }
}
