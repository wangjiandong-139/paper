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
  step1Count: number        // 进入向导
  step2Count: number        // 填写题目
  outlineConfirmedCount: number // 确认大纲
  paidCount: number         // 支付成功
  generatingCount: number   // 生成中
  completedCount: number    // 生成完成
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
