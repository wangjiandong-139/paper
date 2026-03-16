import { ProductStatus } from '../../enums/admin/order-status'

export interface AdminProductListItemDto {
  id: string
  productCode: string
  name: string
  status: ProductStatus
  priceFen: number
  revisionLimit: number | null
  aiRateThreshold: number | null
  createdAt: string
  updatedAt: string
}

export interface AdminProductDetailDto extends AdminProductListItemDto {
  benefitsJson: Record<string, unknown>
  description: string
}

export interface CreateProductDto {
  productCode: string
  name: string
  priceFen: number
  revisionLimit: number | null
  aiRateThreshold: number | null
  benefitsJson: Record<string, unknown>
  description: string
}

export interface UpdateProductDto {
  name?: string
  priceFen?: number
  revisionLimit?: number | null
  aiRateThreshold?: number | null
  benefitsJson?: Record<string, unknown>
  description?: string
}

export interface AdminPaymentListQueryDto {
  userId?: string
  orderId?: string
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}

export interface AdminPaymentListItemDto {
  id: string
  orderId: string
  userId: string
  amountFen: number
  productNameSnapshot: string
  wechatPayOrderId: string
  paidAt: string
}
