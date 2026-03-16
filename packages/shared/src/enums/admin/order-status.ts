export enum AdminOrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum GenerationJobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum GenerationJobTriggerSource {
  SYSTEM = 'SYSTEM',
  MANUAL_RETRY = 'MANUAL_RETRY',
}

export enum GenerationJobEventType {
  QUEUED = 'QUEUED',
  CHAPTER_STARTED = 'CHAPTER_STARTED',
  CHAPTER_COMPLETED = 'CHAPTER_COMPLETED',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum SchoolTemplateStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum DegreeType {
  COLLEGE = 'COLLEGE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTOR = 'DOCTOR',
}

export enum TemplateRequestStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  IGNORED = 'IGNORED',
}

export enum ApiConfigType {
  PLAGIARISM = 'PLAGIARISM',
  CITATION_CHECK = 'CITATION_CHECK',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
