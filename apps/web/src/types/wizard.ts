// ─── 枚举 ──────────────────────────────────────────────────

export enum Language {
  ZH = 'zh',
  EN = 'en',
}

export enum DegreeType {
  UNDERGRADUATE = 'undergraduate',
  MASTER = 'master',
  DOCTOR = 'doctor',
  OTHER = 'other',
}

// ─── Step 1 ──────────────────────────────────────────────────

export interface Step1Data {
  subject: string
  title: string
  language: Language
  degree_type: DegreeType
  word_count: number
  template_id: string
  ai_feed?: string
  proposal_file_url?: string
}

// ─── Step 2 ──────────────────────────────────────────────────

export enum ReferenceSource {
  CNKI = 'CNKI',
  WANFANG = 'WANFANG',
  VIPINFO = 'VIPINFO',
  SEMANTIC_SCHOLAR = 'SEMANTIC_SCHOLAR',
  CROSSREF = 'CROSSREF',
  USER_INPUT = 'USER_INPUT',
}

export interface ReferenceItem {
  id: string
  source: ReferenceSource
  title: string
  authors: string[]
  journal?: string
  year?: number
  raw_citation?: string
}

export interface Step2Data {
  references: ReferenceItem[]
  confirmed: boolean
}

// ─── Step 3 ──────────────────────────────────────────────────

export interface OutlineNode {
  id: string
  title: string
  level: number
  word_count?: number
  children: OutlineNode[]
  placeholders?: Array<'figure' | 'table' | 'formula' | 'code'>
}

export interface Step3Data {
  outline: OutlineNode[]
  confirmed: boolean
}

// ─── Draft ──────────────────────────────────────────────────

export interface DraftDTO {
  id: string
  currentStep: number
  step1Data: Step1Data | null
  step2Data: Step2Data | null
  step3Data: Step3Data | null
  createdAt: string
  updatedAt: string
}

// ─── 学科列表 ──────────────────────────────────────────────────

export const SUBJECTS: string[] = [
  '文学与语言学',
  '历史学',
  '哲学',
  '教育学',
  '法学',
  '经济学',
  '管理学',
  '工学',
  '理学',
  '农学',
  '医学',
  '艺术学',
  '计算机科学与技术',
  '信息与通信工程',
  '机械工程',
  '土木工程',
  '电气工程',
  '化学工程',
  '材料科学',
  '金融学',
  '会计学',
  '市场营销',
  '人力资源管理',
  '心理学',
  '社会学',
  '政治学',
  '新闻与传播',
  '体育学',
  '环境科学',
  '其他',
]

// ─── 学历对应字数建议 ──────────────────────────────────────────────────

export const DEGREE_WORD_COUNT_OPTIONS: Record<DegreeType, number[]> = {
  [DegreeType.UNDERGRADUATE]: [3000, 5000, 6000, 8000],
  [DegreeType.MASTER]: [8000, 10000, 12000, 15000],
  [DegreeType.DOCTOR]: [15000, 20000, 30000, 50000],
  [DegreeType.OTHER]: [50000, 60000, 80000, 100000],
}

// ─── 校验常量 ──────────────────────────────────────────────────

export const WORD_COUNT_MIN = 3000
export const WORD_COUNT_MAX = 100000
export const AI_FEED_MAX_LENGTH = 1500
