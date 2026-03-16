import { Injectable } from '@nestjs/common';

export interface SystemConfigDTO {
  key: string;
  value: string;
  description?: string;
  updatedAt: Date;
}

type ConfigKey = 'plagiarism_provider' | 'ai_provider';

interface ConfigEntry {
  value: string;
  description: string;
  updatedAt: Date;
}

const ALLOWED_KEYS: ReadonlySet<string> = new Set<ConfigKey>([
  'plagiarism_provider',
  'ai_provider',
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
    const existing = this.store.get(key)!;
    const updated: ConfigEntry = { ...existing, value, updatedAt: new Date() };
    this.store.set(key, updated);
    return { key, value: updated.value, description: updated.description, updatedAt: updated.updatedAt };
  }
}
