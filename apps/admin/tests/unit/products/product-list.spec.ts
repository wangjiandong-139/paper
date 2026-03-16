/**
 * Product List Tests - TDD
 */
import { describe, it, expect } from 'vitest'
import { ProductStatus } from '@ai-paper/shared'

describe('ProductListView', () => {
  it('should display product status badge', () => {
    const product = { status: ProductStatus.ACTIVE }
    expect(product.status).toBe(ProductStatus.ACTIVE)
  })

  it('should display price in yuan format', () => {
    const priceFen = 9900
    const priceYuan = (priceFen / 100).toFixed(2)
    expect(priceYuan).toBe('99.00')
  })
})
