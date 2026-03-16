// ─── 改稿操作类型 ──────────────────────────────────────────────────

export enum RevisionType {
  REWRITE = 'REWRITE',
  REDUCE_PLAGIARISM = 'REDUCE_PLAGIARISM',
  REDUCE_AI = 'REDUCE_AI',
  EXPAND = 'EXPAND',
  SHRINK = 'SHRINK',
  POLISH = 'POLISH',
}

export const REVISION_TYPE_LABELS: Record<RevisionType, string> = {
  [RevisionType.REWRITE]: 'AI 改写',
  [RevisionType.REDUCE_PLAGIARISM]: '降重',
  [RevisionType.REDUCE_AI]: '降 AI 痕迹',
  [RevisionType.EXPAND]: '扩写',
  [RevisionType.SHRINK]: '缩写',
  [RevisionType.POLISH]: '润色',
}

// 计入改稿次数的操作（BASIC 套餐最多 3 次）
export const COUNTED_REVISION_TYPES: RevisionType[] = [
  RevisionType.REWRITE,
  RevisionType.REDUCE_PLAGIARISM,
  RevisionType.REDUCE_AI,
  RevisionType.EXPAND,
  RevisionType.SHRINK,
  RevisionType.POLISH,
]

export const BASIC_MAX_AI_REVISIONS = 3

// ─── 改稿请求/响应 ──────────────────────────────────────────────────

export interface RevisionAiRequest {
  type: RevisionType
  chapterIndex?: number
  instruction?: string
  selectedText?: string
}

export interface RevisionChunk {
  text: string
  done?: boolean
}

// ─── 引用核对 ──────────────────────────────────────────────────

export interface CitationItem {
  text: string
  reference: string
}

export interface CitationCheckResult {
  traceable: CitationItem[]
  untraceable: CitationItem[]
  checkedAt: string
}

// ─── 查重结果 ──────────────────────────────────────────────────

export interface PlagiarismResult {
  overallRate: number   // 0-100 百分比
  reportUrl?: string
  provider: string
  checkedAt: string
}

// ─── 下载 ──────────────────────────────────────────────────

export type DownloadFormat = 'docx' | 'pdf'

export interface DownloadResult {
  downloadUrl: string
}

// ─── 改稿保存 ──────────────────────────────────────────────────

export interface RevisionSaveRequest {
  chapterIndex?: number
  content: string
}

// ─── 论文内容 ──────────────────────────────────────────────────

export interface PaperContent {
  html: string
  aiRevisionCount: number
}
