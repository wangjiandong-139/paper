export type DashboardTimeRange = 'day' | 'week' | 'month'

export interface DashboardOverviewDto {
  totalOrders: number
  completedOrders: number
  failedOrders: number
  generatingOrders: number
  totalRevenueFen: number
  timeRange: DashboardTimeRange
}

export interface DashboardFunnelDto {
  step1Count: number
  step2Count: number
  outlineConfirmedCount: number
  paidCount: number
  completedCount: number
  timeRange: DashboardTimeRange
}

export interface FailureReasonItemDto {
  reason: string
  count: number
}

export interface DashboardFailureReasonsDto {
  items: FailureReasonItemDto[]
  timeRange: DashboardTimeRange
}

export interface RevenueByProductDto {
  productCode: string
  productName: string
  orderCount: number
  totalRevenueFen: number
}

export interface DashboardRevenueDto {
  items: RevenueByProductDto[]
  totalRevenueFen: number
  timeRange: DashboardTimeRange
}
