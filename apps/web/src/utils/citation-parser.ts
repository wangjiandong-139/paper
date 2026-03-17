import { ReferenceSource } from '@/types/wizard'
import type { ReferenceItem } from '@/types/wizard'

// ─── 类型定义 ──────────────────────────────────────────────────

export interface ParsedCitationLine {
  raw: string
  valid: boolean
  item?: ReferenceItem
  error?: string
}

export interface CitationParseResult {
  valid: ParsedCitationLine[]
  invalid: ParsedCitationLine[]
  all: ParsedCitationLine[]
}

// ─── 正则模式 ──────────────────────────────────────────────────

/** 匹配开头序号，如 [1] 或 1. */
const RE_LEADING_NUM = /^\[?\d+\]?\s*/

/** 匹配 4 位年份 */
const RE_YEAR = /\b(19|20)\d{2}\b/

/** 匹配文献类型标记，如 [J]、[M]、[D]、[C]、[N]、[R]、[P]、[S] */
const RE_TYPE_TAG = /\[([JMDCNRPSA])\]/i

/** 最短标题长度 */
const MIN_TITLE_LENGTH = 3

// ─── 解析单行 ──────────────────────────────────────────────────

function generateId(): string {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * 解析单行知网引文格式
 *
 * 支持格式（示例）：
 *   [1] 张三, 李四. 基于深度学习的图像识别[J]. 计算机学报, 2022, 45(3): 100-110.
 *   [2] 王五. 机器学习导论[M]. 北京: 清华大学出版社, 2020.
 *   [3] 赵六. 自然语言处理研究[D]. 清华大学, 2021.
 */
export function parseCitationLine(raw: string): ParsedCitationLine {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { raw, valid: false, error: '空行' }
  }

  // 去除序号
  const withoutNum = trimmed.replace(RE_LEADING_NUM, '')

  // 提取年份
  const yearMatch = withoutNum.match(RE_YEAR)
  const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined

  // 按句号分段
  const parts = withoutNum.split(/\.\s*/)
  if (parts.length < 2) {
    return { raw, valid: false, error: '格式不完整，缺少必要分隔符（.）' }
  }

  // 第一段为作者
  const authorsPart = parts[0].trim()
  if (!authorsPart) {
    return { raw, valid: false, error: '无法识别作者' }
  }
  const authors = authorsPart
    .split(/[,，;；]/)
    .map((a) => a.trim())
    .filter(Boolean)

  // 第二段（含文献类型标记）为标题
  const titlePart = parts[1]?.trim() ?? ''
  const title = titlePart.replace(RE_TYPE_TAG, '').trim()

  if (title.length < MIN_TITLE_LENGTH) {
    return { raw, valid: false, error: `标题过短（至少 ${MIN_TITLE_LENGTH} 字）` }
  }

  // 提取来源（期刊/书名/学校）
  const sourcePart = parts.slice(2).join('. ').trim()
  const journal = sourcePart
    ? sourcePart.split(/[,，]/)[0].trim().replace(RE_YEAR, '').trim() || undefined
    : undefined

  const item: ReferenceItem = {
    id: generateId(),
    source: ReferenceSource.USER_INPUT,
    title,
    authors,
    journal,
    year,
    raw_citation: raw,
  }

  return { raw, valid: true, item }
}

// ─── 批量解析 ──────────────────────────────────────────────────

/**
 * 批量解析多行知网引文格式文本
 *
 * @param text 多行引文文本，每行一条
 */
export function parseCitationText(text: string): CitationParseResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const all = lines.map(parseCitationLine)
  const valid = all.filter((r) => r.valid)
  const invalid = all.filter((r) => !r.valid)

  return { valid, invalid, all }
}

// ─── 最少文献数量建议 ──────────────────────────────────────────────────
// 方便测试暂定为 1；后续改为从 admin 后端配置（全局参数「文献数量建议」）读取。

import { DegreeType } from '@/types/wizard'

export const REFERENCE_MIN_COUNT: Record<DegreeType, number> = {
  [DegreeType.UNDERGRADUATE]: 1,
  [DegreeType.MASTER]: 1,
  [DegreeType.DOCTOR]: 1,
  [DegreeType.OTHER]: 1,
}

export const REFERENCE_SUGGEST_MAX: Record<DegreeType, number> = {
  [DegreeType.UNDERGRADUATE]: 15,
  [DegreeType.MASTER]: 25,
  [DegreeType.DOCTOR]: 50,
  [DegreeType.OTHER]: 20,
}

export function getMinReferenceCount(degreeType: DegreeType): number {
  return REFERENCE_MIN_COUNT[degreeType] ?? 1
}
