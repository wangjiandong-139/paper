export interface OperationLogListQueryDto {
  actorAdminUserId?: string
  actionType?: string
  targetType?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface OperationLogListItemDto {
  id: string
  actorAdminUserId: string
  actorUsername: string
  actionType: string
  targetType: string
  targetId: string
  summary: string
  createdAt: string
}

export interface OperationLogDetailDto extends OperationLogListItemDto {
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
}
