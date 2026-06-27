import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { llmAdapterProviders, llmRegistryProvider } from './llm.registry';

@Module({
  providers: [...llmAdapterProviders, llmRegistryProvider, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
