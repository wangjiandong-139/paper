import { ref } from 'vue'
import { http } from '@/lib/http'

export interface PublicConfig {
  minReferenceCount: number
  maintenanceMode: boolean
}

const DEFAULT_CONFIG: PublicConfig = {
  minReferenceCount: 1,
  maintenanceMode: false,
}

const state = {
  config: ref<PublicConfig>({ ...DEFAULT_CONFIG }),
  loaded: ref(false),
}

/**
 * 前台全局配置（GET /api/config/public），固定值；失败时降级为默认值。
 */
export function usePublicConfig() {
  const { config, loaded } = state

  async function fetchPublicConfig(): Promise<void> {
    try {
      const { data } = await http.get<PublicConfig>('/config/public')
      config.value = {
        minReferenceCount: Math.max(1, Number(data?.minReferenceCount) || 1),
        maintenanceMode: Boolean(data?.maintenanceMode),
      }
    } catch {
      config.value = { ...DEFAULT_CONFIG }
    } finally {
      loaded.value = true
    }
  }

  return {
    config,
    loaded,
    fetchPublicConfig,
  }
}
