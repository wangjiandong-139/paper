import { Module } from '@nestjs/common';
import { CnkiAdapter } from '../../adapters/reference/cnki.adapter';
import { CrossRefAdapter } from '../../adapters/reference/crossref.adapter';
import { SemanticScholarAdapter } from '../../adapters/reference/semantic-scholar.adapter';
import { WanfangAdapter } from '../../adapters/reference/wanfang.adapter';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';

@Module({
  controllers: [ReferenceController],
  providers: [
    ReferenceService,
    CnkiAdapter,
    WanfangAdapter,
    SemanticScholarAdapter,
    CrossRefAdapter,
  ],
  exports: [ReferenceService],
})
export class ReferenceModule {}
