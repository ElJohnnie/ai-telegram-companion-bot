import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { LlmModule } from '../llm/llm.module';
import { ChatService } from './chat.service';

@Module({
  imports: [ConversationModule, LlmModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
