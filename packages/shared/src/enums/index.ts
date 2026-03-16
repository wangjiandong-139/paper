export * from './admin/index';

export enum PlanType {
  BASIC = 'BASIC', // 基础版（当前唯一支持套餐）
  // 预留扩展：
  // AI_RATE = 'AI_RATE',
  // UNLIMITED = 'UNLIMITED',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ChapterStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum ReferenceSource {
  CNKI = 'CNKI',
  WANFANG = 'WANFANG',
  VIPINFO = 'VIPINFO',
  SEMANTIC_SCHOLAR = 'SEMANTIC_SCHOLAR',
  CROSSREF = 'CROSSREF',
  USER_INPUT = 'USER_INPUT',
}

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

export enum RevisionType {
  REWRITE = 'rewrite',
  REDUCE_PLAGIARISM = 'reduce_plagiarism',
  REDUCE_AI = 'reduce_ai',
  EXPAND = 'expand',
  SHRINK = 'shrink',
  POLISH = 'polish',
}
