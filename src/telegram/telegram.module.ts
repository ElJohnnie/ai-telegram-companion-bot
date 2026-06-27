import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
