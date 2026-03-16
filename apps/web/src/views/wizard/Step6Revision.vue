<template>
  <div class="step6-revision min-h-screen flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700">步骤 6：编辑论文</span>
          <span
            v-if="isSaving"
            class="text-xs text-gray-400"
            data-testid="saving-indicator"
          >保存中…</span>
          <span
            v-else-if="lastSavedAt"
            class="text-xs text-gray-400"
            data-testid="saved-indicator"
          >已保存 {{ formatSavedTime }}</span>
        </div>
        <!-- 改稿次数 -->
        <div class="flex items-center gap-1 text-xs" data-testid="revision-count">
          <span class="text-gray-500">剩余改稿：</span>
          <span
            :class="remainingRevisions > 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'"
          >{{ remainingRevisions }}/{{ MAX_AI_REVISIONS }}</span>
        </div>
      </div>
    </div>

    <!-- 内容加载状态 -->
    <div v-if="isLoadingContent" class="flex-1 flex items-center justify-center py-12">
      <div class="text-center">
        <van-loading size="32" color="#07c160" />
        <p class="text-sm text-gray-500 mt-3">正在加载论文内容…</p>
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="contentLoadError" class="px-4 py-6" data-testid="load-error">
      <van-notice-bar
        :text="contentLoadError"
        color="#ed6a0c"
        background="#fffbe8"
        left-icon="warning-o"
      />
      <van-button class="mt-3" round block type="primary" color="#07c160" @click="loadContent">
        重试
      </van-button>
    </div>

    <!-- 主体：编辑器 + 侧边面板 -->
    <div v-else class="flex-1 flex flex-col">
      <!-- AI 改稿工具栏 -->
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div class="flex flex-wrap gap-2">
          <van-button
            v-for="action in revisionActions"
            :key="action.type"
            size="mini"
            round
            :disabled="!canRevise || isRevising"
            :loading="isRevising && activeRevisionType === action.type"
            :data-testid="`btn-revision-${action.type}`"
            @click="triggerRevision(action.type)"
          >
            {{ action.label }}
          </van-button>
        </div>
        <div v-if="revisionError" class="mt-2 text-xs text-red-500" data-testid="revision-error">
          {{ revisionError }}
        </div>
        <div v-if="!canRevise && !isRevising" class="mt-1 text-xs text-red-400" data-testid="revision-limit-notice">
          AI 改稿次数已用完（基础版 {{ MAX_AI_REVISIONS }} 次）
        </div>
      </div>

      <!-- Tiptap 编辑器 -->
      <div class="flex-1 px-4 py-4">
        <div
          class="prose prose-sm max-w-none bg-white rounded-lg border border-gray-200 min-h-[400px] p-4 focus-within:border-green-400 transition-colors"
          data-testid="editor-container"
        >
          <editor-content :editor="tiptapEditor" class="outline-none" />
        </div>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
      <div class="grid grid-cols-3 gap-2 mb-2">
        <!-- 引用核对 -->
        <van-button
          round
          block
          size="small"
          :loading="isCitationChecking"
          :type="hasCitationCheckResult ? 'primary' : 'default'"
          :color="hasCitationCheckResult ? '#07c160' : undefined"
          data-testid="btn-citation-check"
          @click="runCitationCheck"
        >
          {{ hasCitationCheckResult ? '已核对引用' : '引用核对' }}
        </van-button>

        <!-- 查重 -->
        <van-button
          round
          block
          size="small"
          :loading="isPlagiarismChecking"
          :type="hasPlagiarismResult ? 'primary' : 'default'"
          :color="hasPlagiarismResult ? '#07c160' : undefined"
          data-testid="btn-plagiarism"
          @click="runPlagiarismCheck"
        >
          {{ hasPlagiarismResult ? `查重 ${plagiarismResult?.overallRate ?? 0}%` : '发起查重' }}
        </van-button>

        <!-- 下载（加图/表入口也放这里，P2） -->
        <van-button
          round
          block
          size="small"
          type="primary"
          color="#07c160"
          :loading="isDownloading"
          data-testid="btn-download"
          @click="showDownloadDialog = true"
        >
          下载论文
        </van-button>
      </div>

      <!-- 下载错误 -->
      <p v-if="downloadError" class="text-xs text-red-500 text-center mt-1" data-testid="download-error">
        {{ downloadError }}
      </p>
    </div>

    <!-- 引用核对结果面板 -->
    <van-popup
      v-model:show="showCitationPanel"
      position="bottom"
      round
      :style="{ height: '60%' }"
      data-testid="citation-panel"
    >
      <div class="p-4 h-full overflow-y-auto">
        <h3 class="text-base font-bold mb-3">引用核对结果</h3>
        <div v-if="citationCheckResult">
          <p class="text-sm text-green-600 mb-2">
            ✓ 可追溯引用：{{ citationCheckResult.traceable.length }} 条
          </p>
          <p class="text-sm text-red-500 mb-3">
            ✗ 不可追溯：{{ citationCheckResult.untraceable.length }} 条
          </p>
          <div v-if="citationCheckResult.untraceable.length > 0">
            <p class="text-xs font-semibold text-gray-600 mb-2">问题引用：</p>
            <van-cell-group inset>
              <van-cell
                v-for="(item, i) in citationCheckResult.untraceable"
                :key="i"
                :title="item.text"
                :label="item.reference"
                value="❗"
              />
            </van-cell-group>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 下载格式确认弹窗 -->
    <van-dialog
      v-model:show="showDownloadDialog"
      title="选择下载格式"
      show-cancel-button
      cancel-button-text="取消"
      confirm-button-text="Word (.docx)"
      confirm-button-color="#07c160"
      data-testid="download-dialog"
      @confirm="handleDownload('docx')"
    >
      <div class="py-3 px-4 text-center text-sm text-gray-600">
        <p>建议下载 Word 格式（.docx），便于后续排版。</p>
        <van-button
          class="mt-3"
          round
          block
          size="small"
          type="default"
          @click="handleDownload('pdf')"
        >
          PDF (.pdf)
        </van-button>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useRevision } from '@/composables/useRevision'
import { RevisionType, REVISION_TYPE_LABELS, BASIC_MAX_AI_REVISIONS } from '@/types/revision'
import type { DownloadFormat } from '@/types/revision'

const MAX_AI_REVISIONS = BASIC_MAX_AI_REVISIONS

const route = useRoute()
const orderId = ref<string | null>(
  typeof route.query.orderId === 'string' ? route.query.orderId : null,
)

// ─── Tiptap 编辑器 ──────────────────────────────────────────────────

const tiptapEditor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: '论文内容加载中…' }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none',
    },
  },
})

const editorRef = computed(() => tiptapEditor.value ?? null)

// ─── useRevision composable ──────────────────────────────────────────────────

const {
  paperHtml,
  isLoadingContent,
  contentLoadError,
  isRevising,
  revisionError,
  remainingRevisions,
  canRevise,
  aiRevisionCount: _aiRevisionCount,
  citationCheckResult,
  isCitationChecking,
  hasCitationCheckResult,
  plagiarismResult,
  isPlagiarismChecking,
  hasPlagiarismResult,
  isDownloading,
  downloadError,
  isSaving,
  lastSavedAt,
  loadContent,
  applyAiRevision,
  runCitationCheck,
  runPlagiarismCheck,
  downloadPaper,
  setupAutoSave,
} = useRevision({ orderId, editor: editorRef })

// ─── UI 状态 ──────────────────────────────────────────────────

const showCitationPanel = ref(false)
const showDownloadDialog = ref(false)
const activeRevisionType = ref<RevisionType | null>(null)

// ─── 改稿操作列表 ──────────────────────────────────────────────────

const revisionActions = [
  { type: RevisionType.REWRITE, label: REVISION_TYPE_LABELS[RevisionType.REWRITE] },
  { type: RevisionType.REDUCE_AI, label: REVISION_TYPE_LABELS[RevisionType.REDUCE_AI] },
  { type: RevisionType.REDUCE_PLAGIARISM, label: REVISION_TYPE_LABELS[RevisionType.REDUCE_PLAGIARISM] },
  { type: RevisionType.POLISH, label: REVISION_TYPE_LABELS[RevisionType.POLISH] },
  { type: RevisionType.EXPAND, label: REVISION_TYPE_LABELS[RevisionType.EXPAND] },
  { type: RevisionType.SHRINK, label: REVISION_TYPE_LABELS[RevisionType.SHRINK] },
]

async function triggerRevision(type: RevisionType): Promise<void> {
  activeRevisionType.value = type
  await applyAiRevision(type)
  activeRevisionType.value = null
}

// ─── 下载 ──────────────────────────────────────────────────

async function handleDownload(format: DownloadFormat): Promise<void> {
  showDownloadDialog.value = false
  await downloadPaper(format)
}

// ─── 格式化保存时间 ──────────────────────────────────────────────────

const formatSavedTime = computed(() => {
  if (!lastSavedAt.value) return ''
  const now = new Date()
  const diff = Math.floor((now.getTime() - lastSavedAt.value.getTime()) / 1000)
  if (diff < 60) return `${diff} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  return lastSavedAt.value.toLocaleTimeString()
})

// ─── 论文内容加载后写入编辑器 ──────────────────────────────────────────────────

watch(paperHtml, (html) => {
  if (tiptapEditor.value && html) {
    tiptapEditor.value.commands.setContent(html)
  }
})

// ─── 引用核对查看后显示面板 ──────────────────────────────────────────────────

watch(hasCitationCheckResult, (has) => {
  if (has) showCitationPanel.value = true
})

// ─── 生命周期 ──────────────────────────────────────────────────

onMounted(async () => {
  await loadContent()
  setupAutoSave()
})

onBeforeUnmount(() => {
  tiptapEditor.value?.destroy()
})
</script>

<style scoped>
.step6-revision {
  padding-bottom: 120px;
}

:deep(.tiptap) {
  outline: none;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
</style>
