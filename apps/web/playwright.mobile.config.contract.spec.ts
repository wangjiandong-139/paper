import { describe, it, expect } from 'vitest'
import type { PlaywrightTestConfig } from '@playwright/test'
import mobileConfig from './playwright.mobile.config'

describe('playwright.mobile.config', () => {
  it('declares only the mobile-iphone14 project with iPhone 14 viewport', () => {
    const cfg = mobileConfig as PlaywrightTestConfig
    expect(cfg.testMatch).toBe('**/mobile-viewport.spec.ts')
    expect(cfg.projects).toBeDefined()
    expect(cfg.projects).toHaveLength(1)
    const [p] = cfg.projects!
    expect(p.name).toBe('mobile-iphone14')
    expect(p.use?.viewport).toEqual({ width: 375, height: 812 })
  })
})
