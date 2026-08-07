import { Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiJob, AiJobSchema } from '../../schemas/ai-job.schema';
import { AiFeedback, AiFeedbackSchema } from '../../schemas/ai-feedback.schema';
import { AiJobRepository } from './repositories/ai-job.repository';
import { AiFeedbackRepository } from './repositories/ai-feedback.repository';
import { NoneProvider } from './providers/none.provider';
import { IAIProvider } from './providers/ai-provider.interface';
import type { AppConfig } from '../../config/configuration';

const AiProviderFactory: Provider = {
  provide: 'AI_PROVIDER',
  useFactory: (config: ConfigService<AppConfig>): IAIProvider => {
    const provider = config.get<string>('aiProvider', { infer: true }) ?? 'none';
    if (provider === 'none') {
      return new NoneProvider();
    }
    return new NoneProvider();
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiJob.name, schema: AiJobSchema },
      { name: AiFeedback.name, schema: AiFeedbackSchema },
    ]),
    ConfigModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiJobRepository,
    AiFeedbackRepository,
    AiProviderFactory,
  ],
  exports: [AiService],
})
export class AiModule {}
