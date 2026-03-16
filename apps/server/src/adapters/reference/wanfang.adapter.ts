import { Injectable } from '@nestjs/common';
import { ReferenceSource } from '../../../../../packages/shared/src/enums';
import { IReferenceAdapter, ReferenceDTO } from './reference.adapter.interface';

/**
 * 万方文献适配�? * 生产环境需配置 WANFANG_API_KEY 环境变量�? */
@Injectable()
export class WanfangAdapter implements IReferenceAdapter {
  async search(query: string, _page: number): Promise<ReferenceDTO[]> {
    // 实际实现：调用万方数�?API
    void query;
    return [];
  }

  readonly source = ReferenceSource.WANFANG;
}
