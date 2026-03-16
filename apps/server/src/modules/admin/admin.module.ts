import { Module } from '@nestjs/common';
import {
  CnkiPlagiarismAdapter,
  VipinfoPlagiarismAdapter,
  WanfangPlagiarismAdapter,
} from '../../adapters/plagiarism/plagiarism.adapters';
import { AdminConfigController } from './admin.controller';
import { PlagiarismService } from './plagiarism.service';
import { SystemConfigService } from './system-config.service';

@Module({
  controllers: [AdminConfigController],
  providers: [
    SystemConfigService,
    PlagiarismService,
    WanfangPlagiarismAdapter,
    CnkiPlagiarismAdapter,
    VipinfoPlagiarismAdapter,
  ],
  exports: [SystemConfigService, PlagiarismService],
})
export class AdminModule {}
