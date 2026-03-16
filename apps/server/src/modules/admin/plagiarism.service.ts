import { Injectable } from '@nestjs/common';
import {
  CnkiPlagiarismAdapter,
  VipinfoPlagiarismAdapter,
  WanfangPlagiarismAdapter,
} from '../../adapters/plagiarism/plagiarism.adapters';
import { IPlagiarismAdapter, PlagiarismResultDTO } from '../../adapters/plagiarism/plagiarism.adapter.interface';
import { SystemConfigService } from './system-config.service';

@Injectable()
export class PlagiarismService {
  private readonly adapters: Record<string, IPlagiarismAdapter>;

  constructor(
    private readonly configService: SystemConfigService,
    private readonly wanfang: WanfangPlagiarismAdapter,
    private readonly cnki: CnkiPlagiarismAdapter,
    private readonly vipinfo: VipinfoPlagiarismAdapter,
  ) {
    this.adapters = {
      wanfang: this.wanfang,
      cnki: this.cnki,
      vipinfo: this.vipinfo,
    };
  }

  async check(content: string): Promise<PlagiarismResultDTO> {
    const provider = await this.configService.get('plagiarism_provider');
    const adapter = provider ? this.adapters[provider] : undefined;
    if (!adapter) {
      throw new Error(
        `Invalid plagiarism provider: "${provider}". Valid providers: ${Object.keys(this.adapters).join(', ')}`,
      );
    }
    return adapter.check(content);
  }
}
