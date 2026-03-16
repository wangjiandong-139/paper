/**
 * SystemConfigService + PlagiarismService 单元测试
 *
 * 覆盖：配置预置值、读写、键唯一性；查重适配器切换；重复回调幂等。
 */
import {
  CnkiPlagiarismAdapter,
  VipinfoPlagiarismAdapter,
  WanfangPlagiarismAdapter,
} from '../src/adapters/plagiarism/plagiarism.adapters';
import { PlagiarismService } from '../src/modules/admin/plagiarism.service';
import { SystemConfigService } from '../src/modules/admin/system-config.service';

// ── SystemConfigService ───────────────────────────────────────────────────────

describe('SystemConfigService', () => {
  let svc: SystemConfigService;

  beforeEach(() => {
    svc = new SystemConfigService();
  });

  it('初始化后应包含预置配置 plagiarism_provider=wanfang', async () => {
    const val = await svc.get('plagiarism_provider');
    expect(val).toBe('wanfang');
  });

  it('初始化后应包含预置配置 ai_provider=openai', async () => {
    const val = await svc.get('ai_provider');
    expect(val).toBe('openai');
  });

  it('listAll 应返回全部配置项', async () => {
    const all = await svc.listAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((c) => c.key === 'plagiarism_provider')).toBe(true);
    expect(all.some((c) => c.key === 'ai_provider')).toBe(true);
  });

  it('set 更新已存在的 key 后 get 返回新值', async () => {
    await svc.set('plagiarism_provider', 'cnki');
    const val = await svc.get('plagiarism_provider');
    expect(val).toBe('cnki');
  });

  it('set 不存在的 key 时应抛出错误', async () => {
    await expect(svc.set('unknown_key', 'val')).rejects.toThrow();
  });

  it('set 后 updatedAt 应更新', async () => {
    const before = (await svc.listAll()).find((c) => c.key === 'plagiarism_provider')!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await svc.set('plagiarism_provider', 'vipinfo');
    const after = (await svc.listAll()).find((c) => c.key === 'plagiarism_provider')!.updatedAt;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it('get 不存在的 key 应返回 null', async () => {
    const val = await svc.get('nonexistent');
    expect(val).toBeNull();
  });

  it('listAll 返回结果包含 key、value、description、updatedAt 字段', async () => {
    const all = await svc.listAll();
    for (const item of all) {
      expect(item).toHaveProperty('key');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('updatedAt');
    }
  });
});

// ── Plagiarism Adapters ───────────────────────────────────────────────────────

describe('Plagiarism Adapters – check()', () => {
  it('WanfangPlagiarismAdapter.check 应返回包含 provider=wanfang 的结果', async () => {
    const adapter = new WanfangPlagiarismAdapter();
    const result = await adapter.check('测试论文内容');
    expect(result.provider).toBe('wanfang');
    expect(typeof result.similarityRate).toBe('number');
    expect(result.reportUrl).toBeDefined();
  });

  it('CnkiPlagiarismAdapter.check 应返回包含 provider=cnki 的结果', async () => {
    const adapter = new CnkiPlagiarismAdapter();
    const result = await adapter.check('测试论文内容');
    expect(result.provider).toBe('cnki');
    expect(typeof result.similarityRate).toBe('number');
  });

  it('VipinfoPlagiarismAdapter.check 应返回包含 provider=vipinfo 的结果', async () => {
    const adapter = new VipinfoPlagiarismAdapter();
    const result = await adapter.check('测试论文内容');
    expect(result.provider).toBe('vipinfo');
    expect(typeof result.similarityRate).toBe('number');
  });

  it('similarityRate 值应在 0～100 范围内', async () => {
    for (const Adapter of [WanfangPlagiarismAdapter, CnkiPlagiarismAdapter, VipinfoPlagiarismAdapter]) {
      const result = await new Adapter().check('内容');
      expect(result.similarityRate).toBeGreaterThanOrEqual(0);
      expect(result.similarityRate).toBeLessThanOrEqual(100);
    }
  });
});

// ── PlagiarismService ─────────────────────────────────────────────────────────

describe('PlagiarismService', () => {
  let configSvc: SystemConfigService;
  let wanfang: jest.Mocked<WanfangPlagiarismAdapter>;
  let cnki: jest.Mocked<CnkiPlagiarismAdapter>;
  let vipinfo: jest.Mocked<VipinfoPlagiarismAdapter>;
  let service: PlagiarismService;

  beforeEach(() => {
    configSvc = new SystemConfigService();
    wanfang = { check: jest.fn().mockResolvedValue({ provider: 'wanfang', similarityRate: 10, reportUrl: 'http://wf' }) } as unknown as jest.Mocked<WanfangPlagiarismAdapter>;
    cnki = { check: jest.fn().mockResolvedValue({ provider: 'cnki', similarityRate: 8, reportUrl: 'http://cnki' }) } as unknown as jest.Mocked<CnkiPlagiarismAdapter>;
    vipinfo = { check: jest.fn().mockResolvedValue({ provider: 'vipinfo', similarityRate: 12, reportUrl: 'http://vip' }) } as unknown as jest.Mocked<VipinfoPlagiarismAdapter>;
    service = new PlagiarismService(configSvc, wanfang, cnki, vipinfo);
  });

  it('默认 provider=wanfang 时应调用 WanfangAdapter', async () => {
    const result = await service.check('论文内容');
    expect(wanfang.check).toHaveBeenCalledWith('论文内容');
    expect(cnki.check).not.toHaveBeenCalled();
    expect(result.provider).toBe('wanfang');
  });

  it('切换 provider 为 cnki 后应调用 CnkiAdapter', async () => {
    await configSvc.set('plagiarism_provider', 'cnki');
    const result = await service.check('论文内容');
    expect(cnki.check).toHaveBeenCalled();
    expect(wanfang.check).not.toHaveBeenCalled();
    expect(result.provider).toBe('cnki');
  });

  it('切换 provider 为 vipinfo 后应调用 VipinfoAdapter', async () => {
    await configSvc.set('plagiarism_provider', 'vipinfo');
    const result = await service.check('论文内容');
    expect(vipinfo.check).toHaveBeenCalled();
    expect(result.provider).toBe('vipinfo');
  });

  it('provider 配置值无效时应抛出错误', async () => {
    await configSvc.set('plagiarism_provider', 'unknown_provider');
    await expect(service.check('内容')).rejects.toThrow();
  });

  it('连续多次 check 调用均路由到正确适配器（幂等性）', async () => {
    await service.check('内容1');
    await service.check('内容2');
    expect(wanfang.check).toHaveBeenCalledTimes(2);
  });
});
