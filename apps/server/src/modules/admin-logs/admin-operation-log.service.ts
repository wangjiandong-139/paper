import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { OperationLogListQueryDto, OperationLogListItemDto } from '@ai-paper/shared'

export interface OperationLogRecord {
  id: string
  actorAdminUserId: string
  actorUsername: string
  actionType: string
  targetType: string
  targetId: string
  summary: string
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
  createdAt: Date
}

@Injectable()
export class AdminOperationLogService {
  private readonly logs: OperationLogRecord[] = []

  async log(params: {
    actorAdminUserId: string
    actorUsername: string
    actionType: string
    targetType: string
    targetId: string
    summary: string
    beforeJson?: Record<string, unknown> | null
    afterJson?: Record<string, unknown> | null
  }): Promise<void> {
    this.logs.push({
      id: randomUUID(),
      actorAdminUserId: params.actorAdminUserId,
      actorUsername: params.actorUsername,
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId,
      summary: params.summary,
      beforeJson: params.beforeJson ?? null,
      afterJson: params.afterJson ?? null,
      createdAt: new Date(),
    })
  }

  async query(dto: OperationLogListQueryDto): Promise<{ items: OperationLogListItemDto[]; total: number }> {
    const page = dto.page ?? 1
    const pageSize = dto.pageSize ?? 20

    let filtered = [...this.logs]

    if (dto.actorAdminUserId) {
      filtered = filtered.filter((l) => l.actorAdminUserId === dto.actorAdminUserId)
    }
    if (dto.actionType) {
      filtered = filtered.filter((l) => l.actionType === dto.actionType)
    }
    if (dto.targetType) {
      filtered = filtered.filter((l) => l.targetType === dto.targetType)
    }
    if (dto.startDate) {
      const start = new Date(dto.startDate)
      filtered = filtered.filter((l) => l.createdAt >= start)
    }
    if (dto.endDate) {
      const end = new Date(dto.endDate)
      filtered = filtered.filter((l) => l.createdAt <= end)
    }

    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = filtered.length
    const items = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map((l) => ({
        id: l.id,
        actorAdminUserId: l.actorAdminUserId,
        actorUsername: l.actorUsername,
        actionType: l.actionType,
        targetType: l.targetType,
        targetId: l.targetId,
        summary: l.summary,
        createdAt: l.createdAt.toISOString(),
      }))

    return { items, total }
  }

  deleteOlderThan(cutoffDate: Date): number {
    const before = this.logs.length
    const toDelete = this.logs
      .map((l, i) => ({ idx: i, log: l }))
      .filter(({ log }) => log.createdAt < cutoffDate)
      .map(({ idx }) => idx)
      .sort((a, b) => b - a)

    for (const idx of toDelete) {
      this.logs.splice(idx, 1)
    }
    return before - this.logs.length
  }
}
