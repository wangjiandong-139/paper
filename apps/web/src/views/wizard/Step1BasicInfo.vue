<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- 顶部标题栏 -->
    <div class="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
      <h1 class="text-base font-semibold text-gray-800 text-center">第 1 步：基础信息</h1>
    </div>

    <div class="px-4 pt-4 space-y-3">
      <!-- 论文标题 -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field
          v-model="form.title"
          label="论文标题"
          placeholder="请输入论文标题或研究主题"
          required
          :error="!!errors.title"
          :error-message="errors.title"
          data-testid="field-title"
          @blur="validateTitle"
        />
      </div>

      <!-- 专业（可手动输入 + 自动补全） -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field
          v-model="form.subject"
          label="专业"
          placeholder="请输入专业名称，例如：计算机科学与技术"
          clearable
          data-testid="field-major"
          @keyup.enter="handleSubjectEnter"
        />
        <div v-if="subjectSuggestions.length" class="border-t border-gray-100 bg-gray-50">
          <ul class="max-h-40 overflow-y-auto text-sm text-gray-700">
            <li
              v-for="(item, index) in subjectSuggestions"
              :key="item"
              class="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100"
              @click="handleSubjectSelect(item)"
            >
              <span>{{ item }}</span>
              <span v-if="index === 0" class="text-[10px] text-gray-400">回车补全</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 论文语言 -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field label="论文语言" required>
          <template #input>
            <div class="flex gap-3 py-1" data-testid="field-language">
              <button
                v-for="opt in languageOptions"
                :key="opt.value"
                class="px-5 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px] min-w-[80px]"
                :class="
                  form.language === opt.value
                    ? 'bg-[#07c160] text-white border-[#07c160]'
                    : 'bg-white text-gray-600 border-gray-200'
                "
                @click="form.language = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </template>
        </van-field>
      </div>

      <!-- 学历 / 类型 -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field label="学历 / 类型" required>
          <template #input>
            <div class="flex flex-wrap gap-2 py-1" data-testid="field-degree">
              <button
                v-for="opt in degreeOptions"
                :key="opt.value"
                class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px]"
                :class="
                  form.degree_type === opt.value
                    ? 'bg-[#07c160] text-white border-[#07c160]'
                    : 'bg-white text-gray-600 border-gray-200'
                "
                @click="handleDegreeChange(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </template>
        </van-field>
      </div>

      <!-- 目标字数 -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field label="目标字数" required>
          <template #input>
            <div class="w-full" data-testid="field-word-count">
              <!-- 字数快选 -->
              <div v-if="wordCountOptions.length" class="flex flex-wrap gap-2 py-1 mb-2">
                <button
                  v-for="wc in wordCountOptions"
                  :key="wc"
                  class="px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px]"
                  :class="
                    form.word_count === wc
                      ? 'bg-[#07c160] text-white border-[#07c160]'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  "
                  @click="form.word_count = wc"
                >
                  {{ wc.toLocaleString() }} 字
                </button>
              </div>
              <!-- 自定义输入 -->
              <van-field
                v-model.number="wordCountInput"
                type="number"
                placeholder="或自定义字数（3000 ～ 100000）"
                :error="!!errors.word_count"
                :error-message="errors.word_count"
                @update:model-value="handleWordCountInput"
                @blur="validateWordCount"
              />
            </div>
          </template>
        </van-field>
      </div>

      <!-- 格式模板（学校） -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field
          :model-value="templateLabel"
          label="格式模板"
          placeholder="输入学校名称搜索"
          readonly
          is-link
          data-testid="field-template"
          @click="showTemplatePicker = true"
        />
      </div>

      <!-- 关键词（选填） -->
      <div class="bg-white rounded-xl overflow-hidden">
        <van-field
          v-model="form.ai_feed"
          label="关键词"
          type="textarea"
          :rows="3"
          placeholder="可输入研究思路、关键词、已有结论等（最多 1500 字，选填）"
          :maxlength="AI_FEED_MAX_LENGTH"
          show-word-limit
          :error="!!errors.ai_feed"
          :error-message="errors.ai_feed"
          data-testid="field-keywords"
          @blur="validateAiFeed"
        />
      </div>
    </div>

    <!-- 底部「下一步」按钮 -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 safe-bottom">
      <van-button
        type="primary"
        block
        size="large"
        :loading="saving"
        data-testid="next-btn"
        @click="handleSubmit"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl h-12"
      >
        下一步
      </van-button>
    </div>

    <!-- 格式模板选择器（占位，后续接口集成） -->
    <van-popup v-model:show="showTemplatePicker" position="bottom" round>
      <van-picker
        :columns="templateColumns"
        @confirm="onTemplateConfirm"
        @cancel="showTemplatePicker = false"
        title="选择格式模板"
        show-toolbar
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useWizardStore } from '@/stores/wizard'
import {
  Language,
  DegreeType,
  SUBJECTS,
  DEGREE_WORD_COUNT_OPTIONS,
  WORD_COUNT_MIN,
  WORD_COUNT_MAX,
  AI_FEED_MAX_LENGTH,
} from '@/types/wizard'
import type { Step1Data } from '@/types/wizard'
import { validateStep1Form } from './step1-validation'

const router = useRouter()
const wizardStore = useWizardStore()
const saving = ref(false)
const showTemplatePicker = ref(false)
const wordCountInput = ref<number | string>('')

// ─── 表单数据 ──────────────────────────────────────────────────

const form = ref<Step1Data>({
  subject: '',
  title: '基于X射线衍射的晶体结构分析技术及其优化探讨',
  language: Language.ZH,
  degree_type: DegreeType.UNDERGRADUATE,
  word_count: 0,
  template_id: 'default',
  ai_feed: '',
})

// ─── 错误信息 ──────────────────────────────────────────────────

const errors = ref<Partial<Record<keyof Step1Data, string>>>({})

// ─── 选项列表 ──────────────────────────────────────────────────

const languageOptions = [
  { label: '中文', value: Language.ZH },
  { label: '英文', value: Language.EN },
]

const degreeOptions = [
  { label: '专科', value: DegreeType.UNDERGRADUATE },
  { label: '本科', value: DegreeType.MASTER },
  { label: '硕士', value: DegreeType.DOCTOR },
  { label: '博士', value: DegreeType.OTHER },
]

const templateColumns = [
  { text: '国标 / 通用（默认）', value: 'default' },
]

const templateLabel = computed(() => {
  const found = templateColumns.find((item) => item.value === form.value.template_id)
  return found ? found.text : ''
})

const wordCountOptions = computed(() => DEGREE_WORD_COUNT_OPTIONS[form.value.degree_type] ?? [])

// ─── 事件处理 ──────────────────────────────────────────────────

const subjectSuggestions = computed(() => {
  const keyword = form.value.subject.trim()
  if (keyword.length < 2) return []
  const lower = keyword.toLowerCase()
  return SUBJECTS.filter((item) => item.toLowerCase().includes(lower)).slice(0, 8)
})

function handleSubjectSelect(value: string): void {
  form.value.subject = value
}

function handleSubjectEnter(): void {
  if (!subjectSuggestions.value.length) return
  form.value.subject = subjectSuggestions.value[0]
}

function handleDegreeChange(value: DegreeType): void {
  form.value.degree_type = value
  const opts = DEGREE_WORD_COUNT_OPTIONS[value]
  if (opts.length > 0) {
    form.value.word_count = opts[0]
    wordCountInput.value = opts[0]
  } else {
    form.value.word_count = 0
    wordCountInput.value = ''
  }
  errors.value.word_count = undefined
}

function handleWordCountInput(val: string | number): void {
  const n = Number(val)
  if (!isNaN(n) && n > 0) {
    form.value.word_count = n
  }
}

function onTemplateConfirm(value: { selectedValues: string[] }): void {
  form.value.template_id = value.selectedValues[0] ?? 'default'
  showTemplatePicker.value = false
}

// ─── 校验函数 ──────────────────────────────────────────────────

function validateTitle(): boolean {
  if (!form.value.title.trim()) {
    errors.value.title = '请输入论文标题'
    return false
  }
  errors.value.title = undefined
  return true
}

function validateWordCount(): boolean {
  const wc = form.value.word_count
  if (!wc || wc < WORD_COUNT_MIN) {
    errors.value.word_count = `字数不能少于 ${WORD_COUNT_MIN.toLocaleString()} 字`
    return false
  }
  if (wc > WORD_COUNT_MAX) {
    errors.value.word_count = `字数不能超过 ${WORD_COUNT_MAX.toLocaleString()} 字`
    return false
  }
  errors.value.word_count = undefined
  return true
}

function validateAiFeed(): boolean {
  const feed = form.value.ai_feed ?? ''
  if (feed.length > AI_FEED_MAX_LENGTH) {
    errors.value.ai_feed = `AI 投喂内容不能超过 ${AI_FEED_MAX_LENGTH} 字`
    return false
  }
  errors.value.ai_feed = undefined
  return true
}

function validate(): boolean {
  const errs = validateStep1Form(form.value)
  errors.value = errs as Partial<Record<keyof Step1Data, string>>
  return Object.keys(errs).length === 0
}

// ─── 提交 ──────────────────────────────────────────────────

async function handleSubmit(): Promise<void> {
  if (!validate()) {
    showToast({ message: '请完善必填信息', position: 'bottom' })
    return
  }
  saving.value = true
  try {
    await wizardStore.saveStep1({ ...form.value })
    await router.push('/wizard/2')
  } catch (err: unknown) {
    const status = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { status?: number }).status === 'number'
      ? (err.response as { status: number }).status
      : 0
    if (status === 401) {
      showToast('登录已过期，请重新登录')
    } else {
      showToast('保存失败，请重试')
    }
  } finally {
    saving.value = false
  }
}

// ─── 初始化：恢复已保存的数据 ──────────────────────────────────────

onMounted(async () => {
  if (!wizardStore.currentDraftId) {
    await wizardStore.loadDrafts()
    if (wizardStore.drafts.length > 0) {
      wizardStore.selectDraft(wizardStore.drafts[0].id)
    }
  }
  const saved = wizardStore.step1Data
  if (saved) {
    form.value = { ...saved }
    wordCountInput.value = saved.word_count ?? ''
  } else {
    const opts = wordCountOptions.value
    if (opts.length > 0) {
      form.value.word_count = opts[0]
      wordCountInput.value = opts[0]
    }
  }
})

watch(
  () => form.value.degree_type,
  () => {
    errors.value = {}
  },
)
</script>
