export interface OnboardingStep {
  icon: string
  title: string
  desc: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { icon: '📝', title: '填写论文信息', desc: '输入标题、学科、字数等基本信息，让 AI 了解你的需求' },
  { icon: '📚', title: '添加参考文献', desc: '粘贴知网引文或搜索推荐文献，AI 将基于真实文献生成内容' },
  { icon: '📋', title: 'AI 生成提纲', desc: 'AI 自动生成逻辑清晰的论文提纲，支持拖拽调整章节顺序' },
  { icon: '💳', title: '确认并支付', desc: '确认论文信息后完成支付，AI 开始生成完整论文' },
  { icon: '✅', title: '下载与改稿', desc: 'AI 生成完成后可手动编辑、AI 改稿、查重，最终下载 Word 文件' },
]
