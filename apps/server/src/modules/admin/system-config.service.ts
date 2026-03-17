import { BadRequestException, Injectable } from '@nestjs/common';

export interface SystemConfigDTO {
  key: string;
  value: string;
  description?: string;
  updatedAt: Date;
}

type ConfigKey = 'plagiarism_provider' | 'ai_provider' | 'min_reference_count' | 'maintenance_mode';

interface ConfigEntry {
  value: string;
  description: string;
  updatedAt: Date;
}

const ALLOWED_KEYS: ReadonlySet<string> = new Set<ConfigKey>([
  'plagiarism_provider',
  'ai_provider',
  'min_reference_count',
  'maintenance_mode',
]);

const PRESETS: Record<ConfigKey, Pick<ConfigEntry, 'value' | 'description'>> = {
  plagiarism_provider: {
    value: 'wanfang',
    description: '当前启用的查重服务商（wanfang / cnki / vipinfo）',
  },
  ai_provider: {
    value: 'openai',
    description: '当前 AI 接口提供商（openai / deepseek）',
  },
  min_reference_count: {
    value: '1',
    description: '步骤 2 最低文献数量，正整数，默认 1',
  },
  maintenance_mode: {
    value: 'false',
    description: '维护模式（true/false），开启时阻止新建草稿与支付',
  },
};

@Injectable()
export class SystemConfigService {
  private readonly store = new Map<string, ConfigEntry>();

  constructor() {
    const now = new Date();
    for (const [key, preset] of Object.entries(PRESETS)) {
      this.store.set(key, { ...preset, updatedAt: now });
    }
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key)?.value ?? null;
  }

  async listAll(): Promise<SystemConfigDTO[]> {
    return Array.from(this.store.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      description: entry.description,
      updatedAt: entry.updatedAt,
    }));
  }

  async set(key: string, value: string): Promise<SystemConfigDTO> {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Unknown config key: "${key}". Allowed keys: ${[...ALLOWED_KEYS].join(', ')}`);
    }
    if (key === 'min_reference_count') {
      const n = parseInt(value, 10);
      if (Number.isNaN(n) || n < 1 || n !== Math.floor(n)) {
        throw new BadRequestException('min_reference_count 必须为正整数（≥ 1）');
      }
      value = String(n);
    }
    if (key === 'maintenance_mode') {
      if (value !== 'true' && value !== 'false') {
        throw new BadRequestException('maintenance_mode 必须为 true 或 false');
      }
    }
    const existing = this.store.get(key)!;
    const updated: ConfigEntry = { ...existing, value, updatedAt: new Date() };
    this.store.set(key, updated);
    return { key, value: updated.value, description: updated.description, updatedAt: updated.updatedAt };
  }
}
