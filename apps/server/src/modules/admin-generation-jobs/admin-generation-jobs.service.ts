import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  GenerationJobStatus,
  GenerationJobTriggerSource,
  GenerationJobEventType,
  GenerationJobDetailDto,
  GenerationJobSummaryDto,
  PaginatedDto,
} from '@ai-paper/shared'

const OVERDUE_THRESHOLD_MS = 2 * 60 * 60 * 1000

export interface GenerationJobRecord {
  id: string
  orderId: string
  attemptNo: number
  status: GenerationJobStatus
  bullmqJobId: string | null
  triggerSource: GenerationJobTriggerSource
  terminalReason: string | null
  failureMessage: string | null
  queuedAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  attentionRequiredAt: Date | null
  operatorAdminUserId: string | null
  eventLogs: Array<{
    id: string
    chapterNo: number | null
    eventType: GenerationJobEventType
    message: string
    createdAt: Date
  }>
}

@Injectable()
export class AdminGenerationJobsService {
  private readonly jobs = new Map<string, GenerationJobRecord>()

  async listJobs(query: {
    status?: GenerationJobStatus
    orderId?: string
    page?: number
    pageSize?: number
  }): Promise<PaginatedDto<GenerationJobSummaryDto>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    let items = Array.from(this.jobs.values())
    if (query.status) items = items.filter((j) => j.status === query.status)
    if (query.orderId) items = items.filter((j) => j.orderId === query.orderId)

    const total = items.length
    const paged = items
      .sort((a, b) => b.queuedAt.getTime() - a.queuedAt.getTime())
      .slice((page - 1) * pageSize, page * pageSize)
      .map(this.toSummaryDto)

    return { items: paged, total, page, pageSize }
  }

  async getJobDetail(jobId: string): Promise<GenerationJobDetailDto> {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`GenerationJob ${jobId} not found`)
    return this.toDetailDto(job)
  }

  createJob(params: {
    orderId: string
    triggerSource: GenerationJobTriggerSource
    operatorAdminUserId?: string
  }): GenerationJobRecord {
    const existingJobs = Array.from(this.jobs.values()).filter((j) => j.orderId === params.orderId)
    const maxAttemptNo = existingJobs.reduce((max, j) => Math.max(max, j.attemptNo), 0)

    const job: GenerationJobRecord = {
      id: randomUUID(),
      orderId: params.orderId,
      attemptNo: maxAttemptNo + 1,
      status: GenerationJobStatus.QUEUED,
      bullmqJobId: null,
      triggerSource: params.triggerSource,
      terminalReason: null,
      failureMessage: null,
      queuedAt: new Date(),
      startedAt: null,
      finishedAt: null,
      attentionRequiredAt: null,
      operatorAdminUserId: params.operatorAdminUserId ?? null,
      eventLogs: [],
    }
    this.jobs.set(job.id, job)
    return job
  }

  getRunningJobForOrder(orderId: string): GenerationJobRecord | undefined {
    return Array.from(this.jobs.values()).find(
      (j) => j.orderId === orderId && j.status === GenerationJobStatus.RUNNING,
    )
  }

  findById(jobId: string): GenerationJobRecord | undefined {
    return this.jobs.get(jobId)
  }

  updateJobStatus(jobId: string, status: GenerationJobStatus, extra?: {
    terminalReason?: string
    failureMessage?: string
    finishedAt?: Date
  }): GenerationJobRecord {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`GenerationJob ${jobId} not found`)
    job.status = status
    if (extra?.terminalReason) job.terminalReason = extra.terminalReason
    if (extra?.failureMessage) job.failureMessage = extra.failureMessage
    if (extra?.finishedAt) job.finishedAt = extra.finishedAt
    return job
  }

  addEventLog(jobId: string, params: {
    chapterNo?: number
    eventType: GenerationJobEventType
    message: string
  }): void {
    const job = this.jobs.get(jobId)
    if (!job) return
    job.eventLogs.push({
      id: randomUUID(),
      chapterNo: params.chapterNo ?? null,
      eventType: params.eventType,
      message: params.message,
      createdAt: new Date(),
    })
  }

  private toSummaryDto(job: GenerationJobRecord): GenerationJobSummaryDto {
    const isOverdue =
      job.status === GenerationJobStatus.RUNNING &&
      job.startedAt !== null &&
      Date.now() - job.startedAt.getTime() > OVERDUE_THRESHOLD_MS

    return {
      id: job.id,
      attemptNo: job.attemptNo,
      status: job.status,
      triggerSource: job.triggerSource,
      terminalReason: job.terminalReason,
      failureMessage: job.failureMessage,
      queuedAt: job.queuedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      attentionRequiredAt: job.attentionRequiredAt?.toISOString() ?? null,
      isOverdue,
    }
  }

  private toDetailDto(job: GenerationJobRecord): GenerationJobDetailDto {
    return {
      ...this.toSummaryDto(job),
      orderId: job.orderId,
      operatorAdminUserId: job.operatorAdminUserId,
      eventLogs: job.eventLogs.map((e) => ({
        id: e.id,
        chapterNo: e.chapterNo,
        eventType: e.eventType,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      })),
    }
  }
}
