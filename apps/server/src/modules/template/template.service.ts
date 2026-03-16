import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CitationFormat = 'GB/T 7714' | 'APA' | 'MLA';

export interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FontConfig {
  body: string;
  heading: string;
  sizeBody: number;
  sizeH1: number;
  sizeH2: number;
  sizeH3: number;
}

export interface FormatTemplateConfig {
  margins: MarginConfig;
  font: FontConfig;
  lineSpacing: number;
  citationFormat: CitationFormat;
}

export interface FormatTemplateDTO {
  id: string;
  name: string;
  schoolKeywords: string[];
  isDefault: boolean;
  config: FormatTemplateConfig;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FormatTemplateCreateDTO {
  name: string;
  schoolKeywords?: string[];
  isDefault?: boolean;
  config: FormatTemplateConfig;
}

// ── Default values ────────────────────────────────────────────────────────────

const DEFAULT_MARGINS: MarginConfig = { top: 25, bottom: 25, left: 30, right: 25 };
const DEFAULT_FONT: FontConfig = {
  body: '宋体',
  heading: '黑体',
  sizeBody: 12,
  sizeH1: 16,
  sizeH2: 14,
  sizeH3: 12,
};
const DEFAULT_NATIONAL_STANDARD: FormatTemplateConfig = {
  margins: DEFAULT_MARGINS,
  font: DEFAULT_FONT,
  lineSpacing: 1.5,
  citationFormat: 'GB/T 7714',
};

// ── TemplateParserService ─────────────────────────────────────────────────────

export interface ParseConfigInput {
  margins?: Partial<MarginConfig>;
  font?: Partial<FontConfig>;
  lineSpacing?: number;
  citationFormat?: CitationFormat;
}

@Injectable()
export class TemplateParserService {
  /**
   * 根据输入参数（来自 Word 模板解析结果或手动指定）构建完整 FormatTemplateConfig。
   * 未提供的字段使用国标/通用默认值。
   */
  buildConfig(input: ParseConfigInput): FormatTemplateConfig {
    return {
      margins: { ...DEFAULT_MARGINS, ...(input.margins ?? {}) },
      font: { ...DEFAULT_FONT, ...(input.font ?? {}) },
      lineSpacing: input.lineSpacing ?? DEFAULT_NATIONAL_STANDARD.lineSpacing,
      citationFormat: input.citationFormat ?? DEFAULT_NATIONAL_STANDARD.citationFormat,
    };
  }

  /**
   * 从 Word 模板文件 Buffer 中提取排版参数。
   * 当前实现返回默认参数；实际 Word 解析逻辑通过 `mammoth` 等库扩展。
   */
  parseWordBuffer(_buffer: Buffer): FormatTemplateConfig {
    return this.buildConfig({});
  }
}

// ── TemplateService ───────────────────────────────────────────────────────────

@Injectable()
export class TemplateService {
  private readonly store = new Map<string, FormatTemplateDTO>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults(): void {
    const now = new Date();
    const defaultTemplate: FormatTemplateDTO = {
      id: randomUUID(),
      name: '国标/通用',
      schoolKeywords: ['国标', '通用'],
      isDefault: true,
      config: DEFAULT_NATIONAL_STANDARD,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.store.set(defaultTemplate.id, defaultTemplate);
  }

  async list(keyword?: string): Promise<FormatTemplateDTO[]> {
    const active = Array.from(this.store.values()).filter((t) => t.deletedAt === null);
    if (!keyword) return active;

    const kw = keyword.toLowerCase();
    return active.filter(
      (t) =>
        t.name.toLowerCase().includes(kw) ||
        t.schoolKeywords.some((k) => k.toLowerCase().includes(kw)),
    );
  }

  async findById(id: string): Promise<FormatTemplateDTO | null> {
    const t = this.store.get(id);
    if (!t || t.deletedAt !== null) return null;
    return t;
  }

  /** 返回包含已软删除的原始记录，供内部使用 */
  async findByIdRaw(id: string): Promise<FormatTemplateDTO | null> {
    return this.store.get(id) ?? null;
  }

  async create(dto: FormatTemplateCreateDTO): Promise<FormatTemplateDTO> {
    const now = new Date();
    const template: FormatTemplateDTO = {
      id: randomUUID(),
      name: dto.name,
      schoolKeywords: dto.schoolKeywords ?? [],
      isDefault: dto.isDefault ?? false,
      config: dto.config,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.store.set(template.id, template);
    return template;
  }

  async update(id: string, dto: Partial<FormatTemplateCreateDTO>): Promise<FormatTemplateDTO | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: FormatTemplateDTO = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.schoolKeywords !== undefined && { schoolKeywords: dto.schoolKeywords }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      ...(dto.config !== undefined && { config: dto.config }),
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const existing = this.store.get(id);
    if (!existing || existing.deletedAt !== null) return false;

    this.store.set(id, { ...existing, deletedAt: new Date() });
    return true;
  }
}
