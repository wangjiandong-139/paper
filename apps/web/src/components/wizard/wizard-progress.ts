// ─── 步骤定义 ──────────────────────────────────────────────────

export const WIZARD_TOTAL_STEPS = 6

export interface WizardStepConfig {
  step: number
  label: string
  shortLabel: string
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { step: 1, label: '基础信息', shortLabel: '基础' },
  { step: 2, label: '参考文献', shortLabel: '文献' },
  { step: 3, label: '提纲编辑', shortLabel: '提纲' },
  { step: 4, label: '预览支付', shortLabel: '支付' },
  { step: 5, label: '生成中',   shortLabel: '生成' },
  { step: 6, label: '改稿编辑', shortLabel: '改稿' },
]

// ─── 步骤状态类型 ──────────────────────────────────────────────────

export type StepState = 'completed' | 'current' | 'upcoming'

// ─── 纯函数 ──────────────────────────────────────────────────

/**
 * 获取某一步的状态
 * @param step 目标步骤（1-6）
 * @param currentStep 当前所在步骤
 */
export function getStepState(step: number, currentStep: number): StepState {
  if (step < currentStep) return 'completed'
  if (step === currentStep) return 'current'
  return 'upcoming'
}

/**
 * 判断某一步是否可点击回退
 * 只有已完成的步骤（< currentStep）可以点击，当前步骤和未来步骤不可点击
 */
export function isStepClickable(step: number, currentStep: number): boolean {
  return step < currentStep
}

/**
 * 获取进度文本，如 "3/6"
 */
export function getProgressText(currentStep: number, total = WIZARD_TOTAL_STEPS): string {
  return `${currentStep}/${total}`
}

/**
 * 获取当前步骤的完整标签
 */
export function getCurrentStepLabel(currentStep: number): string {
  const config = WIZARD_STEPS.find((s) => s.step === currentStep)
  return config?.label ?? `步骤 ${currentStep}`
}

/**
 * 计算整体进度百分比（0-100）
 */
export function getProgressPercent(currentStep: number, total = WIZARD_TOTAL_STEPS): number {
  return Math.round(((currentStep - 1) / (total - 1)) * 100)
}
