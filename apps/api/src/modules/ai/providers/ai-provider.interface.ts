import { AiCompletionRequest, AiCompletionResponse } from '@constructtrack/types';

export interface IAIProvider {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  embed?(text: string): Promise<number[]>;
}
