/**
 * TemplateService 单元测试
 *
 * 覆盖：模板 CRUD、关键词搜索、软删除、Word 解析、引文格式。
 */
import {
  CitationFormat,
  FormatTemplateConfig,
  TemplateParserService,
  TemplateService,
} from '../src/modules/template/template.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: FormatTemplateConfig = {
  margins: { top: 25, bottom: 25, left: 30, right: 25 },
  font: {
    body: '宋体',
    heading: '黑体',
    sizeBody: 12,
    sizeH1: 16,
    sizeH2: 14,
    sizeH3: 12,
  },
  lineSpacing: 1.5,
  citationFormat: 'GB/T 7714',
};

function makeService() {
  return new TemplateService();
}

// ── list ──────────────────────────────────────────────────────────────────────

describe('TemplateService – list()', () => {
  it('初始状态应返回内置默认模板', async () => {
    const svc = makeService();
    const list = await svc.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((t) => t.isDefault)).toBe(true);
  });

  it('keyword 过滤：仅返回名称或关键词中包含搜索词的模板', async () => {
    const svc = makeService();
    await svc.create({ name: '北京大学模板', schoolKeywords: ['北大', '北京大学'], config: DEFAULT_CONFIG });
    await svc.create({ name: '清华大学模板', schoolKeywords: ['清华'], config: DEFAULT_CONFIG });

    const result = await svc.list('北京');
    expect(result.every((t) => t.name.includes('北京') || t.schoolKeywords.some((k) => k.includes('北京')))).toBe(true);
  });

  it('keyword 为空时返回全部未删除模板', async () => {
    const svc = makeService();
    await svc.create({ name: '模板A', config: DEFAULT_CONFIG });
    await svc.create({ name: '模板B', config: DEFAULT_CONFIG });
    const all = await svc.list();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('已软删除的模板不出现在列表中', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '将被删除', config: DEFAULT_CONFIG });
    await svc.remove(t.id);
    const list = await svc.list();
    expect(list.find((x) => x.id === t.id)).toBeUndefined();
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe('TemplateService – findById()', () => {
  it('存在的 id 应返回模板', async () => {
    const svc = makeService();
    const created = await svc.create({ name: '详情模板', config: DEFAULT_CONFIG });
    const found = await svc.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('不存在的 id 应返回 null', async () => {
    const svc = makeService();
    const found = await svc.findById('non-existent-id');
    expect(found).toBeNull();
  });

  it('已软删除的模板应返回 null', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '已删除', config: DEFAULT_CONFIG });
    await svc.remove(t.id);
    const found = await svc.findById(t.id);
    expect(found).toBeNull();
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe('TemplateService – create()', () => {
  it('创建后应分配 id 并出现在列表中', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '新模板', config: DEFAULT_CONFIG });
    expect(t.id).toBeTruthy();
    const list = await svc.list();
    expect(list.some((x) => x.id === t.id)).toBe(true);
  });

  it('schoolKeywords 缺省时应为空数组', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '无关键词', config: DEFAULT_CONFIG });
    expect(t.schoolKeywords).toEqual([]);
  });

  it('isDefault 缺省时应为 false', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '非默认', config: DEFAULT_CONFIG });
    expect(t.isDefault).toBe(false);
  });

  it('config 字段应完整写入', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '带配置', config: DEFAULT_CONFIG });
    expect(t.config.citationFormat).toBe('GB/T 7714');
    expect(t.config.lineSpacing).toBe(1.5);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('TemplateService – update()', () => {
  it('更新 name 后可读回新值', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '旧名', config: DEFAULT_CONFIG });
    const updated = await svc.update(t.id, { name: '新名' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('新名');
  });

  it('更新 config.citationFormat 后值正确', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '模板', config: DEFAULT_CONFIG });
    const updated = await svc.update(t.id, { config: { ...DEFAULT_CONFIG, citationFormat: 'APA' } });
    expect(updated!.config.citationFormat).toBe('APA');
  });

  it('更新不存在的 id 应返回 null', async () => {
    const svc = makeService();
    const result = await svc.update('ghost-id', { name: 'X' });
    expect(result).toBeNull();
  });

  it('更新已软删除的模板应返回 null', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '已删', config: DEFAULT_CONFIG });
    await svc.remove(t.id);
    const result = await svc.update(t.id, { name: '改名' });
    expect(result).toBeNull();
  });

  it('updatedAt 在更新后应变化', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '模板', config: DEFAULT_CONFIG });
    const before = t.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    const updated = await svc.update(t.id, { name: '新名' });
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(before);
  });
});

// ── remove ────────────────────────────────────────────────────────────────────

describe('TemplateService – remove()', () => {
  it('软删除后 deletedAt 不为 null', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '待删', config: DEFAULT_CONFIG });
    await svc.remove(t.id);
    const raw = await svc.findByIdRaw(t.id);
    expect(raw).not.toBeNull();
    expect(raw!.deletedAt).not.toBeNull();
  });

  it('不存在的 id 软删除应返回 false', async () => {
    const svc = makeService();
    const result = await svc.remove('ghost');
    expect(result).toBe(false);
  });

  it('成功软删除应返回 true', async () => {
    const svc = makeService();
    const t = await svc.create({ name: '模板', config: DEFAULT_CONFIG });
    const result = await svc.remove(t.id);
    expect(result).toBe(true);
  });
});

// ── TemplateParserService ─────────────────────────────────────────────────────

describe('TemplateParserService', () => {
  const parser = new TemplateParserService();

  it('解析 GB/T 7714 引文格式配置应返回正确格式', () => {
    const config = parser.buildConfig({ citationFormat: 'GB/T 7714' });
    expect(config.citationFormat).toBe('GB/T 7714');
  });

  it('解析 APA 引文格式配置应返回正确格式', () => {
    const config = parser.buildConfig({ citationFormat: 'APA' });
    expect(config.citationFormat).toBe('APA');
  });

  it('解析 MLA 引文格式配置应返回正确格式', () => {
    const config = parser.buildConfig({ citationFormat: 'MLA' });
    expect(config.citationFormat).toBe('MLA');
  });

  it('默认 config 应包含完整的排版字段', () => {
    const config = parser.buildConfig({});
    expect(config.margins).toBeDefined();
    expect(config.font).toBeDefined();
    expect(config.lineSpacing).toBeGreaterThan(0);
    expect(config.citationFormat).toBeDefined();
  });

  it('自定义 margins 应覆盖默认值', () => {
    const config = parser.buildConfig({ margins: { top: 30, bottom: 30, left: 35, right: 30 } });
    expect(config.margins.top).toBe(30);
    expect(config.margins.left).toBe(35);
  });

  it('自定义 font 应覆盖默认值', () => {
    const config = parser.buildConfig({ font: { body: 'Times New Roman', heading: 'Arial', sizeBody: 10, sizeH1: 14, sizeH2: 12, sizeH3: 11 } });
    expect(config.font.body).toBe('Times New Roman');
    expect(config.font.sizeBody).toBe(10);
  });

  it('自定义 lineSpacing 应覆盖默认值', () => {
    const config = parser.buildConfig({ lineSpacing: 2.0 });
    expect(config.lineSpacing).toBe(2.0);
  });

  it('支持的引文格式类型应包含 GB/T 7714、APA、MLA', () => {
    const supported: CitationFormat[] = ['GB/T 7714', 'APA', 'MLA'];
    for (const fmt of supported) {
      const config = parser.buildConfig({ citationFormat: fmt });
      expect(config.citationFormat).toBe(fmt);
    }
  });
});
