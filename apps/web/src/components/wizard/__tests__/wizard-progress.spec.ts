import { describe, it, expect } from 'vitest'
import {
  getStepState,
  isStepClickable,
  getProgressText,
  getCurrentStepLabel,
  getProgressPercent,
  WIZARD_STEPS,
  WIZARD_TOTAL_STEPS,
} from '@/components/wizard/wizard-progress'

describe('wizard-progress 纯函数', () => {
  // ─── WIZARD_STEPS 定义 ──────────────────────────────────────────────────

  describe('WIZARD_STEPS', () => {
    it('共 6 个步骤', () => {
      expect(WIZARD_STEPS).toHaveLength(WIZARD_TOTAL_STEPS)
    })

    it('步骤编号从 1 到 6 连续', () => {
      WIZARD_STEPS.forEach((s, i) => {
        expect(s.step).toBe(i + 1)
      })
    })

    it('每个步骤都有 label 和 shortLabel', () => {
      WIZARD_STEPS.forEach((s) => {
        expect(s.label).toBeTruthy()
        expect(s.shortLabel).toBeTruthy()
      })
    })
  })

  // ─── getStepState ──────────────────────────────────────────────────

  describe('getStepState', () => {
    it('小于当前步骤的返回 completed', () => {
      expect(getStepState(1, 3)).toBe('completed')
      expect(getStepState(2, 3)).toBe('completed')
    })

    it('等于当前步骤的返回 current', () => {
      expect(getStepState(3, 3)).toBe('current')
    })

    it('大于当前步骤的返回 upcoming', () => {
      expect(getStepState(4, 3)).toBe('upcoming')
      expect(getStepState(6, 3)).toBe('upcoming')
    })

    it('步骤 1 为当前步骤时不存在 completed', () => {
      expect(getStepState(1, 1)).toBe('current')
    })

    it('步骤 6 为当前步骤时，步骤 1-5 均为 completed', () => {
      for (let i = 1; i <= 5; i++) {
        expect(getStepState(i, 6)).toBe('completed')
      }
    })
  })

  // ─── isStepClickable ──────────────────────────────────────────────────

  describe('isStepClickable', () => {
    it('步骤小于当前步骤时可点击', () => {
      expect(isStepClickable(1, 3)).toBe(true)
      expect(isStepClickable(2, 3)).toBe(true)
    })

    it('当前步骤不可点击', () => {
      expect(isStepClickable(3, 3)).toBe(false)
    })

    it('未来步骤不可点击', () => {
      expect(isStepClickable(4, 3)).toBe(false)
      expect(isStepClickable(6, 3)).toBe(false)
    })

    it('步骤 1 为当前步骤时无步骤可点击', () => {
      for (let i = 1; i <= 6; i++) {
        expect(isStepClickable(i, 1)).toBe(false)
      }
    })
  })

  // ─── getProgressText ──────────────────────────────────────────────────

  describe('getProgressText', () => {
    it('步骤 1 返回 "1/6"', () => {
      expect(getProgressText(1)).toBe('1/6')
    })

    it('步骤 3 返回 "3/6"', () => {
      expect(getProgressText(3)).toBe('3/6')
    })

    it('步骤 6 返回 "6/6"', () => {
      expect(getProgressText(6)).toBe('6/6')
    })

    it('自定义 total 时正确显示', () => {
      expect(getProgressText(2, 4)).toBe('2/4')
    })
  })

  // ─── getCurrentStepLabel ──────────────────────────────────────────────────

  describe('getCurrentStepLabel', () => {
    it('步骤 1 返回基础信息', () => {
      expect(getCurrentStepLabel(1)).toBe('基础信息')
    })

    it('步骤 4 返回预览支付', () => {
      expect(getCurrentStepLabel(4)).toBe('预览支付')
    })

    it('步骤 6 返回改稿编辑', () => {
      expect(getCurrentStepLabel(6)).toBe('改稿编辑')
    })

    it('不存在的步骤返回兜底文本', () => {
      expect(getCurrentStepLabel(99)).toBe('步骤 99')
    })
  })

  // ─── getProgressPercent ──────────────────────────────────────────────────

  describe('getProgressPercent', () => {
    it('步骤 1 进度为 0%', () => {
      expect(getProgressPercent(1)).toBe(0)
    })

    it('步骤 6 进度为 100%', () => {
      expect(getProgressPercent(6)).toBe(100)
    })

    it('步骤 3 进度约为 40%（(3-1)/(6-1)*100）', () => {
      expect(getProgressPercent(3)).toBe(40)
    })

    it('步骤 4 进度为 60%', () => {
      expect(getProgressPercent(4)).toBe(60)
    })

    it('返回值在 0-100 范围内', () => {
      for (let s = 1; s <= 6; s++) {
        const p = getProgressPercent(s)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThanOrEqual(100)
      }
    })
  })
})
