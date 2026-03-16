import { Module } from '@nestjs/common';
import { OpenAiAdapter } from '../../adapters/ai/openai.adapter';
import { OrderModule } from '../order/order.module';
import { OrderService } from '../order/order.service';
import { RevisionController } from './revision.controller';
import { RevisionService } from './revision.service';

@Module({
  imports: [OrderModule],
  controllers: [RevisionController],
  providers: [
    OpenAiAdapter,
    {
      provide: RevisionService,
      useFactory: (orderSvc: OrderService, openAi: OpenAiAdapter) =>
        new RevisionService(orderSvc, openAi),
      inject: [OrderService, OpenAiAdapter],
    },
  ],
  exports: [RevisionService],
})
export class RevisionModule {}
