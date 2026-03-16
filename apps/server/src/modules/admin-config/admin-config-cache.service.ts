import { Injectable } from '@nestjs/common'

interface ConfigCacheEntry {
  configVersion: number
  resolvedConfig: Record<string, unknown>
  cachedAt: Date
}

@Injectable()
export class AdminConfigCacheService {
  private readonly cache = new Map<string, ConfigCacheEntry>()

  set(configType: string, configVersion: number, resolvedConfig: Record<string, unknown>): void {
    this.cache.set(configType, {
      configVersion,
      resolvedConfig,
      cachedAt: new Date(),
    })
  }

  get(configType: string): ConfigCacheEntry | undefined {
    return this.cache.get(configType)
  }

  invalidate(configType: string): void {
    this.cache.delete(configType)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  isValid(configType: string, expectedVersion: number): boolean {
    const entry = this.cache.get(configType)
    return entry !== undefined && entry.configVersion === expectedVersion
  }
}
