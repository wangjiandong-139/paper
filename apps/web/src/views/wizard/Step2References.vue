<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- 顶部 -->
    <div class="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
      <h1 class="text-base font-semibold text-gray-800 text-center">第 2 步：参考文献</h1>
      <p class="text-xs text-gray-400 text-center mt-0.5">
        建议至少选 {{ minCount }} 篇文献
      </p>
    </div>

    <!-- Tab 切换 -->
    <div class="bg-white border-b border-gray-100">
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === tab.key
              ? 'text-[#07c160] border-[#07c160]'
              : 'text-gray-500 border-transparent'
          "
          :data-testid="`tab-${tab.key}`"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 推荐文献 Tab -->
    <div v-if="activeTab === 'suggest'" class="px-4 pt-4 space-y-3">
      <div v-if="suggestLoading" class="text-center py-10 text-gray-400 text-sm">
        正在加载推荐文献…
      </div>
      <div v-else-if="suggestedRefs.length === 0" class="text-center py-10 text-gray-400 text-sm">
        暂无推荐文献，请使用手动添加
      </div>
      <div
        v-for="ref in suggestedRefs"
        :key="ref.id"
        class="bg-white rounded-xl p-4 shadow-sm"
        :data-testid="`suggest-ref-${ref.id}`"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 line-clamp-2">{{ ref.title }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ ref.authors.join(', ') }}
              <span v-if="ref.year"> · {{ ref.year }}</span>
              <span v-if="ref.journal"> · {{ ref.journal }}</span>
            </p>
          </div>
          <button
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-lg transition-colors min-h-[44px] min-w-[44px]"
            :class="isAdded(ref.id) ? 'bg-gray-300' : 'bg-[#07c160]'"
            :data-testid="`add-suggest-${ref.id}`"
            :disabled="isAdded(ref.id)"
            @click="handleAddSuggest(ref)"
          >
            {{ isAdded(ref.id) ? '✓' : '+' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 手动添加 Tab -->
    <div v-if="activeTab === 'manual'" class="px-4 pt-4 space-y-3">
      <!-- 示例提示 -->
      <div class="bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
        <p class="font-medium mb-1">知网引文格式示例：</p>
        <p class="font-mono leading-relaxed">
          [1] 张三, 李四. 基于深度学习的图像识别[J]. 计算机学报, 2022, 45(3): 100-110.<br />
          [2] 王五. 机器学习导论[M]. 北京: 清华大学出版社, 2020.
        </p>
      </div>

      <div class="bg-white rounded-xl overflow-hidden">
        <van-field
          v-model="citationInput"
          type="textarea"
          :rows="6"
          placeholder="每行粘贴一条引文，支持知网引文格式…"
          data-testid="citation-input"
          @update:model-value="clearParseResult"
        />
      </div>

      <van-button
        type="primary"
        block
        :disabled="!citationInput.trim()"
        data-testid="parse-btn"
        @click="handleParse"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl"
      >
        解析引文
      </van-button>

      <!-- 解析结果 -->
      <div v-if="parseResult" data-testid="parse-result">
        <!-- 异常条目 -->
        <div v-if="parseResult.invalid.length > 0" class="space-y-2">
          <p class="text-xs font-medium text-red-500 px-1">
            ⚠ {{ parseResult.invalid.length }} 条解析异常，请修改后重新解析：
          </p>
          <div
            v-for="(line, i) in parseResult.invalid"
            :key="i"
            class="bg-red-50 border border-red-200 rounded-xl p-3"
            :data-testid="`invalid-line-${i}`"
          >
            <p class="text-xs text-red-700 font-mono line-clamp-2">{{ line.raw }}</p>
            <p class="text-xs text-red-500 mt-1">{{ line.error }}</p>
          </div>
        </div>

        <!-- 合法条目预览 -->
        <div v-if="parseResult.valid.length > 0" class="space-y-2 mt-2">
          <p class="text-xs font-medium text-gray-500 px-1">
            ✓ {{ parseResult.valid.length }} 条可添加：
          </p>
          <div
            v-for="(line, i) in parseResult.valid"
            :key="i"
            class="bg-green-50 border border-green-200 rounded-xl p-3"
            :data-testid="`valid-line-${i}`"
          >
            <p class="text-sm font-medium text-gray-800">{{ line.item!.title }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ line.item!.authors.join(', ') }}</p>
          </div>
          <van-button
            v-if="!hasParseErrors"
            type="primary"
            block
            data-testid="add-all-btn"
            @click="handleAddAll"
            class="!bg-[#07c160] !border-[#07c160] rounded-xl"
          >
            全部添加到列表（{{ parseResult.valid.length }} 条）
          </van-button>
          <p v-else class="text-xs text-red-500 text-center">
            请先修复所有解析异常，再添加到列表
          </p>
        </div>
      </div>
    </div>

    <!-- 已选文献列表 -->
    <div v-if="selectedRefs.length > 0" class="px-4 mt-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-medium text-gray-700">
          已选文献（{{ count }} 篇）
          <span v-if="!meetsMinCount" class="text-red-400 font-normal ml-1">
            / 至少 {{ minCount }} 篇
          </span>
        </p>
      </div>
      <div class="space-y-2" data-testid="selected-list">
        <div
          v-for="(ref, index) in selectedRefs"
          :key="ref.id"
          class="bg-white rounded-xl p-3 flex items-start gap-3 shadow-sm"
          :data-testid="`selected-ref-${ref.id}`"
        >
          <span class="text-xs text-gray-400 mt-1 shrink-0 w-5 text-center">{{ index + 1 }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 line-clamp-2">{{ ref.title }}</p>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ ref.authors.slice(0, 2).join(', ') }}
              <span v-if="ref.year"> · {{ ref.year }}</span>
            </p>
          </div>
          <div class="flex flex-col gap-1 shrink-0">
            <button
              v-if="index > 0"
              class="text-gray-400 hover:text-gray-600 p-1 min-h-[32px]"
              :data-testid="`move-up-${ref.id}`"
              @click="moveUp(index)"
            >
              ▲
            </button>
            <button
              v-if="index < selectedRefs.length - 1"
              class="text-gray-400 hover:text-gray-600 p-1 min-h-[32px]"
              :data-testid="`move-down-${ref.id}`"
              @click="moveDown(index)"
            >
              ▼
            </button>
            <button
              class="text-red-400 hover:text-red-600 p-1 min-h-[32px]"
              :data-testid="`remove-${ref.id}`"
              @click="removeReference(ref.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
      <van-button
        type="primary"
        block
        size="large"
        :disabled="!meetsMinCount"
        data-testid="next-btn"
        @click="handleNext"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl h-12 disabled:opacity-50"
      >
        {{ meetsMinCount ? '下一步' : `请至少选满 ${minCount} 篇` }}
      </van-button>
    </div>

    <!-- 确认弹窗 -->
    <van-popup
      v-model:show="showConfirmDialog"
      position="bottom"
      round
      :style="{ maxHeight: '80vh' }"
      data-testid="confirm-dialog"
    >
      <div class="p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-3">确认参考文献列表</h3>
        <p class="text-xs text-gray-500 mb-4">
          以下 {{ count }} 篇文献将作为论文生成的唯一引用来源，确认后不可更改。
        </p>
        <div class="space-y-2 max-h-64 overflow-y-auto mb-4">
          <div
            v-for="(ref, i) in selectedRefs"
            :key="ref.id"
            class="text-sm text-gray-700 border-b border-gray-50 pb-2"
          >
            <span class="text-gray-400 mr-2">{{ i + 1 }}.</span>
            <span class="font-medium">{{ ref.title }}</span>
            <span class="text-gray-400 ml-1">
              ({{ ref.authors[0] }}{{ ref.authors.length > 1 ? ' 等' : '' }}
              {{ ref.year ? `, ${ref.year}` : '' }})
            </span>
          </div>
        </div>
        <div class="flex gap-3">
          <van-button
            plain
            block
            data-testid="dialog-cancel-btn"
            @click="closeConfirmDialog"
            class="!border-gray-200 !text-gray-600 rounded-xl"
          >
            返回修改
          </van-button>
          <van-button
            type="primary"
            block
            :loading="saving"
            data-testid="dialog-confirm-btn"
            @click="handleConfirm"
            class="!bg-[#07c160] !border-[#07c160] rounded-xl"
          >
            确认
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useWizardStore } from '@/stores/wizard'
import { useReferences } from '@/composables/useReferences'
import { DegreeType } from '@/types/wizard'
import type { ReferenceItem } from '@/types/wizard'
import { http } from '@/lib/http'

const router = useRouter()
const wizardStore = useWizardStore()
const saving = ref(false)

// 从当前草稿的 step1Data 取学历类型
const degreeType = ref<DegreeType>(
  (wizardStore.step1Data?.degree_type as DegreeType) ?? DegreeType.UNDERGRADUATE,
)

const {
  selectedRefs,
  citationInput,
  parseResult,
  showConfirmDialog,
  count,
  minCount,
  meetsMinCount,
  hasParseErrors,
  addReference,
  removeReference,
  moveUp,
  moveDown,
  isAdded,
  parseCitations,
  addValidParsedRefs,
  clearParseResult,
  tryOpenConfirmDialog,
  closeConfirmDialog,
} = useReferences({ degreeType })

const tabs = [
  { key: 'suggest', label: '推荐文献' },
  { key: 'manual', label: '手动添加' },
]
const activeTab = ref<'suggest' | 'manual'>('suggest')

const suggestLoading = ref(false)
const suggestedRefs = ref<ReferenceItem[]>([])

// ─── 事件处理 ──────────────────────────────────────────────────

function handleAddSuggest(ref: ReferenceItem): void {
  addReference(ref)
}

function handleParse(): void {
  parseCitations()
}

function handleAddAll(): void {
  addValidParsedRefs()
  clearParseResult()
  citationInput.value = ''
  showToast({ message: '已添加到文献列表', position: 'bottom' })
  activeTab.value = 'suggest'
}

function handleNext(): void {
  const opened = tryOpenConfirmDialog()
  if (!opened) {
    showToast({ message: `请至少选满 ${minCount.value} 篇`, position: 'bottom' })
  }
}

async function handleConfirm(): Promise<void> {
  saving.value = true
  try {
    await wizardStore.saveStep2({
      references: selectedRefs.value,
      confirmed: true,
    })
    closeConfirmDialog()
    await router.push('/wizard/3')
  } catch {
    showToast('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// ─── 初始化：加载推荐文献 & 恢复已选 ──────────────────────────────────────

onMounted(async () => {
  // 恢复已选文献
  const saved = wizardStore.step2Data
  if (saved?.references.length) {
    saved.references.forEach((r) => addReference(r))
  }

  // 加载推荐文献
  const step1 = wizardStore.step1Data
  if (step1?.subject || step1?.title) {
    suggestLoading.value = true
    try {
      const params = new URLSearchParams()
      if (step1.subject) params.set('subject', step1.subject)
      if (step1.title) params.set('title', step1.title)
      const { data } = await http.get<ReferenceItem[]>(`/references/suggest?${params}`)
      suggestedRefs.value = data
    } catch {
      // 推荐失败不阻断流程
    } finally {
      suggestLoading.value = false
    }
  }
})
</script>
