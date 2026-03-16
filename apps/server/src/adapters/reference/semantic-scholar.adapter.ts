import { Injectable } from '@nestjs/common';
import { ReferenceSource } from '../../../../../packages/shared/src/enums';
import { IReferenceAdapter, ReferenceDTO } from './reference.adapter.interface';

/**
 * Semantic Scholar 开�?API 适配器（英文文献�? * 公开 API，无需 API Key，但有速率限制�? */
@Injectable()
export class SemanticScholarAdapter implements IReferenceAdapter {
  async search(query: string, _page: number): Promise<ReferenceDTO[]> {
    // 实际实现示例�?    // const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${(_page-1)*10}&limit=10&fields=title,authors,year,venue`;
    // const res = await fetch(url);
    // const data = await res.json();
    // return data.data.map((p: ...) => ({ id: p.paperId, source: ReferenceSource.SEMANTIC_SCHOLAR, ... }));
    void query;
    return [];
  }

  readonly source = ReferenceSource.SEMANTIC_SCHOLAR;
}
