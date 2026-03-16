import { ReferenceSource } from '../../../../../packages/shared/src/enums';

export interface ReferenceDTO {
  id: string;
  source: ReferenceSource;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  raw_citation?: string;
}

export interface IReferenceAdapter {
  /** 搜索文献，返回一页结果（�?10 条） */
  search(query: string, page: number): Promise<ReferenceDTO[]>;
}
