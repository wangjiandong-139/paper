export interface AdminUserListQueryDto {
  search?: string
  isDisabled?: boolean
  page?: number
  pageSize?: number
}

export interface AdminEndUserListItemDto {
  id: string
  nickname: string | null
  wechatOpenId: string
  isDisabled: boolean
  dailyGenerationLimit: number | null
  orderCount: number
  createdAt: string
}

export interface AdminEndUserDetailDto extends AdminEndUserListItemDto {
  riskControl: UserRiskControlDto | null
  recentOrders: RecentOrderSummaryDto[]
}

export interface UserRiskControlDto {
  isDisabled: boolean
  dailyGenerationLimit: number | null
  reason: string | null
  updatedAt: string
}

export interface UpsertUserRiskControlDto {
  isDisabled: boolean
  dailyGenerationLimit: number | null
  reason: string | null
}

export interface RecentOrderSummaryDto {
  id: string
  title: string
  status: string
  paidAmountFen: number | null
  createdAt: string
}
