import type { Step1Data } from '@/types/wizard'
import { WORD_COUNT_MIN, WORD_COUNT_MAX, AI_FEED_MAX_LENGTH } from '@/types/wizard'

export type Step1Errors = Partial<Record<keyof Step1Data, string>>

export function validateStep1Form(formData: Step1Data): Step1Errors {
  const errors: Step1Errors = {}

  // 学科 / 方向 改为选填，因此不再强制校验

  if (!formData.title?.trim()) {
    errors.title = '请输入论文标题'
  }

  if (!formData.word_count || formData.word_count < WORD_COUNT_MIN) {
    errors.word_count = `字数不能少于 ${WORD_COUNT_MIN.toLocaleString()} 字`
  } else if (formData.word_count > WORD_COUNT_MAX) {
    errors.word_count = `字数不能超过 ${WORD_COUNT_MAX.toLocaleString()} 字`
  }

  const feed = formData.ai_feed ?? ''
  if (feed.length > AI_FEED_MAX_LENGTH) {
    errors.ai_feed = `AI 投喂内容不能超过 ${AI_FEED_MAX_LENGTH} 字`
  }

  return errors
}

export function isStep1Valid(formData: Step1Data): boolean {
  return Object.keys(validateStep1Form(formData)).length === 0
}
