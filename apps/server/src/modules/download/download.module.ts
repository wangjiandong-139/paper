import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { RevisionModule } from '../revision/revision.module';
import { TemplateModule } from '../template/template.module';
import { DownloadController } from './download.controller';
import { DocumentBuilderService } from './document-builder.service';
import { DownloadService } from './download.service';

@Module({
  imports: [OrderModule, RevisionModule, TemplateModule],
  controllers: [DownloadController],
  providers: [DocumentBuilderService, DownloadService],
  exports: [DownloadService],
})
export class DownloadModule {}
