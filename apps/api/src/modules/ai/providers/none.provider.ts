import { Injectable } from '@nestjs/common';
import { AiCompletionRequest, AiCompletionResponse } from '@constructtrack/types';
import { IAIProvider } from './ai-provider.interface';

@Injectable()
export class NoneProvider implements IAIProvider {
  async complete(_request: AiCompletionRequest): Promise<AiCompletionResponse> {
    return {
      content: 'AI Assistant is not configured. Set the AI_PROVIDER environment variable and restart the server to enable AI features.',
      provider: 'none',
      model: 'none',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }
}
