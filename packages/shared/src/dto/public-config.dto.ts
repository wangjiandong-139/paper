/**
 * 前台可安全读取的全局配置（GET /api/config/public，无需登录）
 */
export interface PublicConfigDto {
  minReferenceCount: number
  maintenanceMode: boolean
}
