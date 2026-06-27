import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { LlmModule } from '../shared/llm/llm.module';

@Module({
  imports: [ConversationModule, LlmModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
