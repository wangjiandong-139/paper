import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  AdminOrderStatus,
  GenerationJobStatus,
  GenerationJobTriggerSource,
  AdminOrderListQueryDto,
  AdminOrderListItemDto,
  AdminOrderDetailDto,
  GenerationJobSummaryDto,
  PaginatedDto,
} from '@ai-paper/shared'
import { AdminOperationLogService } from '../admin-logs/admin-operation-log.service'

const OVERDUE_THRESHOLD_MS = 2 * 60 * 60 * 1000

function isJobOverdue(job: { status: GenerationJobStatus; startedAt: Date | null }): boolean {
  return (
    job.status === GenerationJobStatus.RUNNING &&
    job.startedAt !== null &&
    Date.now() - job.startedAt.getTime() > OVERDUE_THRESHOLD_MS
  )
}

@Injectable()
export class AdminOrdersService {
  private readonly orders: Map<string, AdminOrderDetailDto & { _raw: boolean }> = new Map()

  constructor(private readonly logService: AdminOperationLogService) {}

  async listOrders(query: AdminOrderListQueryDto): Promise<PaginatedDto<AdminOrderListItemDto>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    let items = Array.from(this.orders.values())

    if (query.status) {
      items = items.filter((o) => o.status === query.status)
    }
    if (query.userId) {
      items = items.filter((o) => o.userId === query.userId)
    }
    if (query.search) {
      const kw = query.search.toLowerCase()
      items = items.filter((o) => o.title.toLowerCase().includes(kw))
    }
    if (query.startDate) {
      const start = new Date(query.startDate)
      items = items.filter((o) => new Date(o.createdAt) >= start)
    }
    if (query.endDate) {
      const end = new Date(query.endDate)
      items = items.filter((o) => new Date(o.createdAt) <= end)
    }

    const total = items.length
    const paged = items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice((page - 1) * pageSize, page * pageSize)
      .map((o): AdminOrderListItemDto => ({
        id: o.id,
        userId: o.userId,
        title: o.title,
        status: o.status,
        productNameSnapshot: o.productNameSnapshot,
        paidAmountFen: o.paidAmountFen,
        paidAt: o.paidAt,
        failedAt: o.failedAt,
        latestFailureReason: o.latestFailureReason,
        createdAt: o.createdAt,
        hasOverdueJob: o.generationJobs.some((j) =>
          j.status === GenerationJobStatus.RUNNING && j.isOverdue,
        ),
      }))

    return { items: paged, total, page, pageSize }
  }

  async getOrderDetail(orderId: string): Promise<AdminOrderDetailDto> {
    const order = this.orders.get(orderId)
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)
    return order
  }

  async updateOrderNote(orderId: string, note: string, actorAdminUserId = 'unknown'): Promise<void> {
    const order = this.orders.get(orderId)
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)
    const previousNote = order.note
    order.note = note
    await this.logService.log({
      actorAdminUserId,
      actorUsername: actorAdminUserId,
      actionType: 'ORDER_NOTE_UPDATE',
      targetType: 'Order',
      targetId: orderId,
      summary: `Updated note for order ${orderId}`,
      beforeJson: { note: previousNote },
      afterJson: { note },
    })
  }

  async exportOrdersCsv(query: {
    status?: AdminOrderStatus
    startDate?: string
    endDate?: string
    maxRows?: number
  }): Promise<string> {
    const MAX_ROWS = 10000
    const limit = Math.min(query.maxRows ?? MAX_ROWS, MAX_ROWS)

    let items = Array.from(this.orders.values())

    if (query.status) items = items.filter((o) => o.status === query.status)
    if (query.startDate) {
      const start = new Date(query.startDate)
      items = items.filter((o) => new Date(o.createdAt) >= start)
    }
    if (query.endDate) {
      const end = new Date(query.endDate)
      items = items.filter((o) => new Date(o.createdAt) <= end)
    }

    const rows = items.slice(0, limit)
    const header = 'id,userId,title,status,productNameSnapshot,paidAmountFen,paidAt,createdAt'
    const csvRows = rows.map((o) =>
      [o.id, o.userId, `"${o.title}"`, o.status, `"${o.productNameSnapshot}"`, o.paidAmountFen ?? '', o.paidAt ?? '', o.createdAt].join(','),
    )
    return [header, ...csvRows].join('\n')
  }

  // ─── Internal: used by other services ─────────────────────────────────────

  _seedOrder(order: Omit<AdminOrderDetailDto, 'generationJobs'> & { generationJobs: GenerationJobSummaryDto[] }): void {
    this.orders.set(order.id, { ...order, _raw: true })
  }

  _getJobsForOrder(orderId: string): GenerationJobSummaryDto[] {
    return this.orders.get(orderId)?.generationJobs ?? []
  }

  _updateOrderStatus(orderId: string, status: AdminOrderStatus): void {
    const order = this.orders.get(orderId)
    if (order) order.status = status
  }
}
