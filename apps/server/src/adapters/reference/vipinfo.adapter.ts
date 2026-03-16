import { Injectable } from '@nestjs/common';
import { ReferenceSource } from '../../../../../packages/shared/src/enums';
import { IReferenceAdapter, ReferenceDTO } from './reference.adapter.interface';

/**
 * 维普文献适配�? * 生产环境需配置 VIPINFO_API_KEY 环境变量�? */
@Injectable()
export class VipinfoAdapter implements IReferenceAdapter {
  async search(query: string, _page: number): Promise<ReferenceDTO[]> {
    void query;
    return [];
  }

  readonly source = ReferenceSource.VIPINFO;
}
