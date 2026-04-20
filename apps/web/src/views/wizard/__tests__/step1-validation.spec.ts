import { describe, it, expect } from 'vitest'
import { validateStep1Form, isStep1Valid } from '../step1-validation'
import { Language, DegreeType, WORD_COUNT_MIN, WORD_COUNT_MAX, AI_FEED_MAX_LENGTH } from '@/types/wizard'
import type { Step1Data } from '@/types/wizard'

function validForm(overrides: Partial<Step1Data> = {}): Step1Data {
  return {
    subject: '计算机科学与技术',
    title: '基于深度学习的图像识别研究',
    language: Language.ZH,
    degree_type: DegreeType.UNDERGRADUATE,
    word_count: 10000,
    template_id: 'default',
    ...overrides,
  }
}

describe('validateStep1Form', () => {
  describe('必填项校验', () => {
    it('全部填写合法时返回空错误对象', () => {
      expect(validateStep1Form(validForm())).toEqual({})
    })

    it('subject 为空时不报错（选填）', () => {
      const errs = validateStep1Form(validForm({ subject: '' }))
      expect(errs.subject).toBeUndefined()
    })

    it('subject 只有空白字符时不报错（选填）', () => {
      const errs = validateStep1Form(validForm({ subject: '   ' }))
      expect(errs.subject).toBeUndefined()
    })

    it('title 为空时报错', () => {
      const errs = validateStep1Form(validForm({ title: '' }))
      expect(errs.title).toBe('请输入论文标题')
    })

    it('title 只有空白字符时报错', () => {
      const errs = validateStep1Form(validForm({ title: '   ' }))
      expect(errs.title).toBe('请输入论文标题')
    })

    it('同时缺少 subject 和 title 时仅 title 报错', () => {
      const errs = validateStep1Form(validForm({ subject: '', title: '' }))
      expect(errs.subject).toBeUndefined()
      expect(errs.title).toBe('请输入论文标题')
    })
  })

  describe('字数范围校验', () => {
    it('字数等于下限 3000 时通过', () => {
      const errs = validateStep1Form(validForm({ word_count: WORD_COUNT_MIN }))
      expect(errs.word_count).toBeUndefined()
    })

    it('字数等于上限 100000 时通过', () => {
      const errs = validateStep1Form(validForm({ word_count: WORD_COUNT_MAX }))
      expect(errs.word_count).toBeUndefined()
    })

    it('字数为 0 时报错（少于下限）', () => {
      const errs = validateStep1Form(validForm({ word_count: 0 }))
      expect(errs.word_count).toMatch(/3,000/)
    })

    it('字数为 2999 时报错', () => {
      const errs = validateStep1Form(validForm({ word_count: WORD_COUNT_MIN - 1 }))
      expect(errs.word_count).toMatch(/3,000/)
    })

    it('字数为 100001 时报错', () => {
      const errs = validateStep1Form(validForm({ word_count: WORD_COUNT_MAX + 1 }))
      expect(errs.word_count).toMatch(/100,000/)
    })

    it('字数在正常范围内时无 word_count 错误', () => {
      const errs = validateStep1Form(validForm({ word_count: 20000 }))
      expect(errs.word_count).toBeUndefined()
    })
  })

  describe('AI 投喂长度校验', () => {
    it('ai_feed 为 undefined 时不报错', () => {
      const errs = validateStep1Form(validForm({ ai_feed: undefined }))
      expect(errs.ai_feed).toBeUndefined()
    })

    it('ai_feed 恰好 1500 字时通过', () => {
      const errs = validateStep1Form(validForm({ ai_feed: 'a'.repeat(AI_FEED_MAX_LENGTH) }))
      expect(errs.ai_feed).toBeUndefined()
    })

    it('ai_feed 超过 1500 字时报错', () => {
      const errs = validateStep1Form(validForm({ ai_feed: 'a'.repeat(AI_FEED_MAX_LENGTH + 1) }))
      expect(errs.ai_feed).toMatch(/1500/)
    })
  })

  describe('isStep1Valid', () => {
    it('合法表单返回 true', () => {
      expect(isStep1Valid(validForm())).toBe(true)
    })

    it('缺少 subject 仍可返回 true（选填）', () => {
      expect(isStep1Valid(validForm({ subject: '' }))).toBe(true)
    })

    it('字数超出范围返回 false', () => {
      expect(isStep1Valid(validForm({ word_count: 200000 }))).toBe(false)
    })
  })
})
