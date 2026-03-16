/**
 * ReferenceService 单元测试
 *
 * 外部依赖（CNKI/Wanfang/SemanticScholar/CrossRef 适配器）全部 Mock，
 * 仅测试 ReferenceService 本身的业务逻辑。
 */
import { ReferenceSource } from '../../../packages/shared/src/enums';
import { CnkiAdapter } from '../src/adapters/reference/cnki.adapter';
import { CrossRefAdapter } from '../src/adapters/reference/crossref.adapter';
import { ReferenceDTO } from '../src/adapters/reference/reference.adapter.interface';
import { SemanticScholarAdapter } from '../src/adapters/reference/semantic-scholar.adapter';
import { WanfangAdapter } from '../src/adapters/reference/wanfang.adapter';
import { ReferenceService } from '../src/modules/reference/reference.service';

const makeRef = (id: string, source: ReferenceSource): ReferenceDTO => ({
  id,
  source,
  title: `Title ${id}`,
  authors: ['Author One'],
  year: 2021,
});

describe('ReferenceService', () => {
  let service: ReferenceService;
  let cnki: jest.Mocked<CnkiAdapter>;
  let wanfang: jest.Mocked<WanfangAdapter>;
  let semanticScholar: jest.Mocked<SemanticScholarAdapter>;
  let crossRef: jest.Mocked<CrossRefAdapter>;

  beforeEach(() => {
    cnki = { search: jest.fn() } as unknown as jest.Mocked<CnkiAdapter>;
    wanfang = { search: jest.fn() } as unknown as jest.Mocked<WanfangAdapter>;
    semanticScholar = { search: jest.fn() } as unknown as jest.Mocked<SemanticScholarAdapter>;
    crossRef = { search: jest.fn() } as unknown as jest.Mocked<CrossRefAdapter>;

    service = new ReferenceService(cnki, wanfang, semanticScholar, crossRef);
  });

  // ── suggest ───────────────────────────────────────────────────────────────

  describe('suggest()', () => {
    it('中文模式应调用 CNKI + Wanfang 适配器，不调用英文适配器', async () => {
      const cnkiItems = [makeRef('cnki-1', ReferenceSource.CNKI)];
      const wanfangItems = [makeRef('wf-1', ReferenceSource.WANFANG)];
      cnki.search.mockResolvedValue(cnkiItems);
      wanfang.search.mockResolvedValue(wanfangItems);
      semanticScholar.search.mockResolvedValue([]);
      crossRef.search.mockResolvedValue([]);

      const result = await service.suggest({
        subject: '计算机科学',
        title: '深度学习',
        language: 'zh',
      });

      expect(cnki.search).toHaveBeenCalledTimes(1);
      expect(wanfang.search).toHaveBeenCalledTimes(1);
      expect(semanticScholar.search).not.toHaveBeenCalled();
      expect(crossRef.search).not.toHaveBeenCalled();

      expect(result.items).toHaveLength(2);
      expect(result.items).toContainEqual(cnkiItems[0]);
      expect(result.items).toContainEqual(wanfangItems[0]);
      expect(result.total).toBe(2);
    });

    it('英文模式应调用 SemanticScholar + CrossRef 适配器，不调用中文适配器', async () => {
      const ssItems = [makeRef('ss-1', ReferenceSource.SEMANTIC_SCHOLAR)];
      const crItems = [makeRef('cr-1', ReferenceSource.CROSSREF)];
      semanticScholar.search.mockResolvedValue(ssItems);
      crossRef.search.mockResolvedValue(crItems);
      cnki.search.mockResolvedValue([]);
      wanfang.search.mockResolvedValue([]);

      const result = await service.suggest({
        subject: 'Computer Science',
        title: 'Deep Learning',
        language: 'en',
      });

      expect(semanticScholar.search).toHaveBeenCalledTimes(1);
      expect(crossRef.search).toHaveBeenCalledTimes(1);
      expect(cnki.search).not.toHaveBeenCalled();
      expect(wanfang.search).not.toHaveBeenCalled();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('搜索字符串应包含 subject 和 title', async () => {
      cnki.search.mockResolvedValue([]);
      wanfang.search.mockResolvedValue([]);

      await service.suggest({ subject: '教育学', title: '素质教育', language: 'zh', page: 2 });

      expect(cnki.search).toHaveBeenCalledWith('教育学 素质教育', 2);
      expect(wanfang.search).toHaveBeenCalledWith('教育学 素质教育', 2);
    });

    it('适配器返回空列表时应返回 total=0', async () => {
      cnki.search.mockResolvedValue([]);
      wanfang.search.mockResolvedValue([]);

      const result = await service.suggest({
        subject: 'test',
        title: 'test',
        language: 'zh',
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ── parseCitations ────────────────────────────────────────────────────────

  describe('parseCitations()', () => {
    it('解析标准知网引文格式（期刊文章）', () => {
      const raw =
        '[1] 张三,李四.深度学习在自然语言处理中的应用[J].计算机学报,2021,44(3):1-15.';

      const { items, errors } = service.parseCitations(raw);

      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(1);

      const item = items[0];
      expect(item.title).toBe('深度学习在自然语言处理中的应用');
      expect(item.authors).toContain('张三');
      expect(item.authors).toContain('李四');
      expect(item.journal).toBe('计算机学报');
      expect(item.year).toBe(2021);
      expect(item.source).toBe(ReferenceSource.USER_INPUT);
      expect(item.raw_citation).toBe(raw);
    });

    it('解析多行引文，每行独立处理', () => {
      const raw = [
        '[1] 王五.机器学习基础理论[M].清华大学出版社,2020.',
        '[2] 赵六.神经网络与深度学习[J].中国科学,2019,49(1):100-110.',
      ].join('\n');

      const { items, errors } = service.parseCitations(raw);

      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(2);
      expect(items[0].title).toBe('机器学习基础理论');
      expect(items[1].title).toBe('神经网络与深度学习');
    });

    it('无法解析的行应记录到 errors，不影响其他行', () => {
      const raw = [
        '[1] 张三.有效行[J].期刊A,2020.',
        'this is not a valid citation',
        '[3] 李四.另一有效行[J].期刊B,2021.',
      ].join('\n');

      const { items, errors } = service.parseCitations(raw);

      expect(items).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(2);
      expect(errors[0].raw).toBe('this is not a valid citation');
      expect(errors[0].reason).toBeTruthy();
    });

    it('空文本返回空结果', () => {
      const { items, errors } = service.parseCitations('');
      expect(items).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it('只有空白行时返回空结果', () => {
      const { items, errors } = service.parseCitations('   \n\n   ');
      expect(items).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it('不带 [n] 编号的引文行也能正确解析', () => {
      const raw = '张三,李四.标题示例[J].来源期刊,2022,10(1):1-5.';
      const { items, errors } = service.parseCitations(raw);

      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('标题示例');
      expect(items[0].year).toBe(2022);
    });

    it('解析结果中 raw_citation 字段应保留原始行文本', () => {
      const line = '[2] 测试作者.测试题目[J].测试期刊,2023.';
      const { items } = service.parseCitations(line);
      expect(items[0].raw_citation).toBe(line);
    });
  });
});
