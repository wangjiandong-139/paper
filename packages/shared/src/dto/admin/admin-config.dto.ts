import { ApiConfigType } from '../../enums/admin/order-status'

export interface ApiConfigListItemDto {
  id: string
  configType: ApiConfigType
  providerName: string
  baseUrl: string
  maskedSecret: string | null
  isEnabled: boolean
  configVersion: number
  updatedAt: string
}

export interface UpdateApiConfigDto {
  providerName?: string
  baseUrl?: string
  secret?: string
  rateLimitConfigJson?: Record<string, unknown> | null
  isEnabled?: boolean
}

export interface TestApiConfigConnectivityDto {
  configType: ApiConfigType
  baseUrl: string
  secret?: string
}

export interface ConnectivityTestResultDto {
  success: boolean
  latencyMs: number | null
  errorMessage: string | null
}

export interface SystemConfigDto {
  maintenanceMode: boolean
  defaultSuggestedTopic: string | null
  maxDailyGenerationDefault: number
  minReferenceCount: number
}

export interface UpdateSystemConfigDto {
  maintenanceMode?: boolean
  defaultSuggestedTopic?: string | null
  maxDailyGenerationDefault?: number
}
