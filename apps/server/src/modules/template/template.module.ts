import { Module } from '@nestjs/common';
import { AdminTemplateController, TemplateController } from './template.controller';
import { TemplateParserService, TemplateService } from './template.service';

@Module({
  controllers: [TemplateController, AdminTemplateController],
  providers: [TemplateService, TemplateParserService],
  exports: [TemplateService, TemplateParserService],
})
export class TemplateModule {}
