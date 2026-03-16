import { Module } from '@nestjs/common';
import { OpenAiAdapter } from '../../adapters/ai/openai.adapter';
import { GenerationController } from './generation.controller';
import { GenerationProgressService } from './generation-progress.service';
import { GenerationQueueService } from './generation-queue.service';
import { GenerationWorkerService } from './generation-worker.service';

@Module({
  controllers: [GenerationController],
  providers: [
    OpenAiAdapter,
    GenerationProgressService,
    GenerationQueueService,
    {
      provide: GenerationWorkerService,
      useFactory: (openAi: OpenAiAdapter, progressSvc: GenerationProgressService) =>
        new GenerationWorkerService(openAi, progressSvc),
      inject: [OpenAiAdapter, GenerationProgressService],
    },
  ],
  exports: [GenerationWorkerService, GenerationQueueService, GenerationProgressService],
})
export class GenerationModule {}
