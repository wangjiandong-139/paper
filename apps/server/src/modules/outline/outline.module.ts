import { Module } from '@nestjs/common';
import { OpenAiAdapter } from '../../adapters/ai/openai.adapter';
import { WizardModule } from '../wizard/wizard.module';
import { OutlineController } from './outline.controller';
import { OutlineService } from './outline.service';

@Module({
  imports: [WizardModule],
  controllers: [OutlineController],
  providers: [OutlineService, OpenAiAdapter],
  exports: [OutlineService],
})
export class OutlineModule {}
