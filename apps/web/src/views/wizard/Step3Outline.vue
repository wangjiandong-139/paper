<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- 顶部 -->
    <div class="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <h1 class="text-base font-semibold text-gray-800">第 3 步：论文提纲</h1>
        <button
          v-if="generationStatus === 'done' && outline.length > 0"
          class="text-xs text-[#07c160] py-1 px-2 rounded border border-[#07c160] min-h-[36px]"
          data-testid="regenerate-btn"
          @click="showRegenerateConfirm = true"
        >
          重新生成
        </button>
      </div>
    </div>

    <!-- 生成中状态 -->
    <div v-if="generationStatus === 'generating'" class="px-4 pt-8 text-center" data-testid="generating-state">
      <div class="text-4xl mb-4 animate-pulse">🤖</div>
      <p class="text-gray-600 font-medium mb-2">AI 正在生成提纲…</p>
      <p class="text-xs text-gray-400 mb-6">根据您的论文信息和参考文献自动生成</p>
      <div v-if="generationText" class="bg-white rounded-xl p-4 text-left text-xs text-gray-500 font-mono whitespace-pre-wrap max-h-64 overflow-auto">
        {{ generationText }}
      </div>
    </div>

    <!-- 生成失败 -->
    <div v-else-if="generationStatus === 'error'" class="px-4 pt-8 text-center" data-testid="error-state">
      <div class="text-4xl mb-4">😞</div>
      <p class="text-red-500 font-medium mb-4">提纲生成失败，请重试</p>
      <van-button
        type="primary"
        data-testid="retry-btn"
        @click="generateOutline"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl"
      >
        重新生成
      </van-button>
    </div>

    <!-- 提纲树形编辑器 -->
    <div v-else-if="outline.length > 0" class="px-4 pt-4" data-testid="outline-tree">
      <!-- 节点列表 -->
      <div class="space-y-2">
        <outline-node-item
          v-for="(node, i) in outline"
          :key="node.id"
          :node="node"
          :index="i"
          :total="outline.length"
          :is-first="i === 0"
          :is-last="i === outline.length - 1"
          @add-child="handleAddChild"
          @delete="handleDelete"
          @edit="handleEdit"
          @move-up="moveUp"
          @move-down="moveDown"
          @toggle-placeholder="togglePlaceholder"
        />
      </div>

      <!-- 添加顶层章节 -->
      <div class="mt-3">
        <button
          class="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#07c160] hover:text-[#07c160] transition-colors min-h-[44px]"
          data-testid="add-chapter-btn"
          @click="showAddNodeDialog(null)"
        >
          + 添加章节
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="generationStatus === 'idle'" class="px-4 pt-8 text-center text-gray-400 text-sm">
      提纲加载中…
    </div>

    <!-- 底部按钮 -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
      <van-button
        type="primary"
        block
        size="large"
        :disabled="outline.length === 0 || generationStatus === 'generating'"
        data-testid="next-btn"
        @click="openConfirmDialog"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl h-12"
      >
        下一步
      </van-button>
    </div>

    <!-- 添加/编辑节点弹窗 -->
    <van-dialog
      v-model:show="showNodeDialog"
      :title="nodeDialogMode === 'add' ? '添加节点' : '编辑节点'"
      show-cancel-button
      data-testid="node-dialog"
      @confirm="handleNodeDialogConfirm"
      @cancel="showNodeDialog = false"
    >
      <div class="px-4 py-3">
        <van-field
          v-model="nodeDialogTitle"
          placeholder="请输入节点标题"
          autofocus
          data-testid="node-title-input"
        />
      </div>
    </van-dialog>

    <!-- 确认弹窗 -->
    <van-popup
      v-model:show="showConfirmDialog"
      position="bottom"
      round
      :style="{ maxHeight: '80vh' }"
      data-testid="confirm-dialog"
    >
      <div class="p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-4">确认提纲</h3>

        <!-- 统计信息 -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <p class="text-2xl font-bold text-gray-800">{{ outline.length }}</p>
            <p class="text-xs text-gray-500 mt-0.5">顶层章节</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <p class="text-2xl font-bold text-gray-800">{{ estimatedWords.toLocaleString() }}</p>
            <p class="text-xs text-gray-500 mt-0.5">预估字数</p>
          </div>
        </div>

        <div
          v-if="placeholderCounts.total > 0"
          class="flex gap-3 mb-4"
          data-testid="placeholder-stats"
        >
          <span v-if="placeholderCounts.figure > 0" class="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
            图 ×{{ placeholderCounts.figure }}
          </span>
          <span v-if="placeholderCounts.table > 0" class="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">
            表 ×{{ placeholderCounts.table }}
          </span>
          <span v-if="placeholderCounts.formula > 0" class="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
            公式 ×{{ placeholderCounts.formula }}
          </span>
          <span v-if="placeholderCounts.code > 0" class="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded">
            代码 ×{{ placeholderCounts.code }}
          </span>
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
            确定生成
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 重新生成确认弹窗 -->
    <van-dialog
      v-model:show="showRegenerateConfirm"
      title="重新生成提纲"
      message="重新生成将覆盖当前提纲，是否继续？"
      show-cancel-button
      data-testid="regenerate-dialog"
      @confirm="confirmRegenerate"
      @cancel="cancelRegenerate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useWizardStore } from '@/stores/wizard'
import { useOutlineEditor } from '@/composables/useOutlineEditor'
import type { OutlineNode } from '@/types/wizard'
import type { PlaceholderType } from '@/utils/outline-utils'

// ─── 内联节点组件（避免拆分文件） ──────────────────────────────────────

const OutlineNodeItem = {
  name: 'OutlineNodeItem',
  props: ['node', 'index', 'total', 'isFirst', 'isLast'],
  emits: ['add-child', 'delete', 'edit', 'move-up', 'move-down', 'toggle-placeholder'],
  template: `
    <div class="bg-white rounded-xl p-3 shadow-sm" :style="{ marginLeft: (node.level - 1) * 16 + 'px' }">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 w-5">{{ node.level === 1 ? '第' + (index + 1) + '章' : '' }}</span>
        <span class="flex-1 text-sm font-medium text-gray-800">{{ node.title }}</span>
        <div class="flex gap-1">
          <button v-if="!isFirst" @click="$emit('move-up', node.id)" class="text-gray-400 p-1 min-h-[32px] text-xs">▲</button>
          <button v-if="!isLast" @click="$emit('move-down', node.id)" class="text-gray-400 p-1 min-h-[32px] text-xs">▼</button>
          <button v-if="node.level < 3" @click="$emit('add-child', node.id)" class="text-[#07c160] p-1 min-h-[32px] text-xs">+子</button>
          <button @click="$emit('edit', node.id, node.title)" class="text-blue-400 p-1 min-h-[32px] text-xs">编辑</button>
          <button @click="$emit('delete', node.id)" class="text-red-400 p-1 min-h-[32px] text-xs">删</button>
        </div>
      </div>
      <div v-if="node.children.length > 0" class="mt-2 space-y-1 pl-4">
        <outline-node-item
          v-for="(child, ci) in node.children"
          :key="child.id"
          :node="child"
          :index="ci"
          :total="node.children.length"
          :is-first="ci === 0"
          :is-last="ci === node.children.length - 1"
          @add-child="$emit('add-child', $event)"
          @delete="$emit('delete', $event)"
          @edit="$emit('edit', $event, child.title)"
          @move-up="$emit('move-up', $event)"
          @move-down="$emit('move-down', $event)"
          @toggle-placeholder="$emit('toggle-placeholder', $event)"
        />
      </div>
    </div>
  `,
}

const router = useRouter()
const wizardStore = useWizardStore()
const saving = ref(false)
const showNodeDialog = ref(false)
const nodeDialogMode = ref<'add' | 'edit'>('add')
const nodeDialogTitle = ref('')
const nodeDialogParentId = ref<string | null>(null)
const nodeDialogTargetId = ref<string | null>(null)

const draftId = ref<string | null>(wizardStore.currentDraftId)
const totalWordCount = ref<number>(wizardStore.step1Data?.word_count ?? 10000)

const {
  outline,
  generationStatus,
  generationText,
  showConfirmDialog,
  showRegenerateConfirm,
  placeholderCounts,
  estimatedWords,
  generateOutline,
  confirmRegenerate,
  cancelRegenerate,
  addChildNode,
  deleteNode,
  editNode,
  togglePlaceholder,
  moveUp,
  moveDown,
  openConfirmDialog,
  closeConfirmDialog,
  setOutline,
} = useOutlineEditor({ draftId, totalWordCount })

// ─── 节点操作弹窗 ──────────────────────────────────────────────────

function showAddNodeDialog(parentId: string | null): void {
  nodeDialogMode.value = 'add'
  nodeDialogParentId.value = parentId
  nodeDialogTitle.value = ''
  showNodeDialog.value = true
}

function handleAddChild(parentId: string): void {
  showAddNodeDialog(parentId)
}

function handleDelete(id: string): void {
  deleteNode(id)
}

function handleEdit(id: string, title: string): void {
  nodeDialogMode.value = 'edit'
  nodeDialogTargetId.value = id
  nodeDialogTitle.value = title
  showNodeDialog.value = true
}

function handleNodeDialogConfirm(): void {
  const title = nodeDialogTitle.value.trim()
  if (!title) return
  if (nodeDialogMode.value === 'add') {
    addChildNode(nodeDialogParentId.value, title)
  } else if (nodeDialogTargetId.value) {
    editNode(nodeDialogTargetId.value, title)
  }
  showNodeDialog.value = false
}

// ─── 确认保存 ──────────────────────────────────────────────────

async function handleConfirm(): Promise<void> {
  saving.value = true
  try {
    await wizardStore.saveStep3({
      outline: outline.value,
      confirmed: true,
    })
    closeConfirmDialog()
    await router.push('/wizard/4')
  } catch {
    showToast('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// ─── 初始化 ──────────────────────────────────────────────────

onMounted(async () => {
  // 恢复已保存的提纲
  const saved = wizardStore.step3Data
  if (saved?.outline.length) {
    setOutline(saved.outline)
    generationStatus.value = 'done'
    return
  }
  // 自动生成
  try {
    await generateOutline()
  } catch {
    showToast('提纲生成失败，请重试')
  }
})
</script>
