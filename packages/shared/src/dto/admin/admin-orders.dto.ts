import { AdminOrderStatus, GenerationJobStatus, GenerationJobTriggerSource, GenerationJobEventType } from '../../enums/admin/order-status'

export interface AdminOrderListQueryDto {
  status?: AdminOrderStatus
  userId?: string
  search?: string
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}

export interface AdminOrderListItemDto {
  id: string
  userId: string
  title: string
  status: AdminOrderStatus
  productNameSnapshot: string
  paidAmountFen: number | null
  paidAt: string | null
  failedAt: string | null
  latestFailureReason: string | null
  createdAt: string
  hasOverdueJob: boolean
}

export interface GenerationJobSummaryDto {
  id: string
  attemptNo: number
  status: GenerationJobStatus
  triggerSource: GenerationJobTriggerSource
  terminalReason: string | null
  failureMessage: string | null
  queuedAt: string
  startedAt: string | null
  finishedAt: string | null
  attentionRequiredAt: string | null
  isOverdue: boolean
}

export interface AdminOrderDetailDto {
  id: string
  userId: string
  title: string
  status: AdminOrderStatus
  productSnapshotJson: Record<string, unknown>
  productNameSnapshot: string
  productCodeSnapshot: string
  paidAmountFen: number | null
  paidAt: string | null
  completedAt: string | null
  failedAt: string | null
  latestFailureReason: string | null
  generationJobs: GenerationJobSummaryDto[]
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerationJobEventLogDto {
  id: string
  chapterNo: number | null
  eventType: GenerationJobEventType
  message: string
  createdAt: string
}

export interface GenerationJobDetailDto extends GenerationJobSummaryDto {
  orderId: string
  operatorAdminUserId: string | null
  eventLogs: GenerationJobEventLogDto[]
}

export interface RetryOrderDto {
  reason?: string
}

export interface RetryGenerationJobDto {
  reason?: string
}

export interface UpdateOrderNoteDto {
  note: string
}

export interface OrderExportQueryDto {
  status?: AdminOrderStatus
  startDate?: string
  endDate?: string
  maxRows?: number
}
