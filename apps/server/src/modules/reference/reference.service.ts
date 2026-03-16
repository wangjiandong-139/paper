import { Injectable } from '@nestjs/common';
import { ReferenceSource } from '../../../../../packages/shared/src/enums';
import { CnkiAdapter } from '../../adapters/reference/cnki.adapter';
import { CrossRefAdapter } from '../../adapters/reference/crossref.adapter';
import { IReferenceAdapter, ReferenceDTO } from '../../adapters/reference/reference.adapter.interface';
import { SemanticScholarAdapter } from '../../adapters/reference/semantic-scholar.adapter';
import { WanfangAdapter } from '../../adapters/reference/wanfang.adapter';

export interface SuggestQuery {
  subject: string;
  title: string;
  language: 'zh' | 'en';
  page?: number;
}

export interface SuggestResult {
  items: ReferenceDTO[];
  total: number;
}

export interface ParseErrorDTO {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  items: ReferenceDTO[];
  errors: ParseErrorDTO[];
}

/**
 * ???????????
 *
 * ???[1] ??,??.???????????????[J].?????,2021,44(3):1-15.
 *
 * groups:
 *   1 ? ?????????
 *   2 ? ??
 *   3 ? ???????J/M/C/D/P/G/N/R ??
 *   4 ? ??/??/?????????????
 *   5 ? ???4 ????
 */
const CNKI_LINE_RE =
  /^(?:\[?\d+\]\.?\s*)?(.+?)\.\s*(.+?)\[([A-Z])\]\.\s*([^,?]+)[,?]\s*(\d{4})/;

@Injectable()
export class ReferenceService {
  constructor(
    private readonly cnkiAdapter: CnkiAdapter,
    private readonly wanfangAdapter: WanfangAdapter,
    private readonly semanticScholarAdapter: SemanticScholarAdapter,
    private readonly crossRefAdapter: CrossRefAdapter,
  ) {}

  /** ???????????????? */
  async suggest(query: SuggestQuery): Promise<SuggestResult> {
    const page = query.page ?? 1;
    const searchStr = `${query.subject} ${query.title}`.trim();

    let adapters: IReferenceAdapter[];
    if (query.language === 'zh') {
      adapters = [this.cnkiAdapter, this.wanfangAdapter];
    } else {
      adapters = [this.semanticScholarAdapter, this.crossRefAdapter];
    }

    const results = await Promise.all(
      adapters.map((a) => a.search(searchStr, page)),
    );

    const items = results.flat();
    return { items, total: items.length };
  }

  /**
   * ????/GB/T 7714 ???????????
   * ???????????????????????
   */
  parseCitations(rawText: string): ParseResult {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const items: ReferenceDTO[] = [];
    const errors: ParseErrorDTO[] = [];

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const match = line.match(CNKI_LINE_RE);

      if (!match) {
        errors.push({
          line: lineNum,
          raw: line,
          reason: 'Format not recognized. Expected: authors.title[type].source,year',
        });
        return;
      }

      const [, authorsRaw, title, , journal, yearStr] = match;
      const authors = authorsRaw
        .split(/[,??]/)
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      items.push({
        id: `user-input-${lineNum}-${Date.now()}`,
        source: ReferenceSource.USER_INPUT,
        title: title.trim(),
        authors,
        journal: journal.trim(),
        year: parseInt(yearStr, 10),
        raw_citation: line,
      });
    });

    return { items, errors };
  }
}
