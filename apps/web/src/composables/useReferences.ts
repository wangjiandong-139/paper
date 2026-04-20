import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { DegreeType } from '@/types/wizard'
import type { ReferenceItem } from '@/types/wizard'
import { parseCitationText, getMinReferenceCount } from '@/utils/citation-parser'
import type { ParsedCitationLine, CitationParseResult } from '@/utils/citation-parser'

// ─── 类型 ──────────────────────────────────────────────────

export interface UseReferencesOptions {
  /** 学历类型（当未提供 minReferenceCount 时用于回退） */
  degreeType: Ref<DegreeType>
  /** 最低文献数量固定值（来自 GET /api/config/public），优先于 degreeType */
  minReferenceCount?: Ref<number>
}

export interface UseReferencesReturn {
  selectedRefs: Ref<ReferenceItem[]>
  citationInput: Ref<string>
  parseResult: Ref<CitationParseResult | null>
  showConfirmDialog: Ref<boolean>
  count: ReturnType<typeof computed<number>>
  minCount: ReturnType<typeof computed<number>>
  meetsMinCount: ReturnType<typeof computed<boolean>>
  hasParseErrors: ReturnType<typeof computed<boolean>>
  addReference: (item: ReferenceItem) => void
  removeReference: (id: string) => void
  moveUp: (index: number) => void
  moveDown: (index: number) => void
  isAdded: (id: string) => boolean
  parseCitations: () => void
  addValidParsedRefs: () => void
  clearParseResult: () => void
  tryOpenConfirmDialog: () => boolean
  closeConfirmDialog: () => void
}

// ─── 组合式函数 ──────────────────────────────────────────────────

export function useReferences(options: UseReferencesOptions): UseReferencesReturn {
  const { degreeType, minReferenceCount } = options

  const selectedRefs = ref<ReferenceItem[]>([])
  const citationInput = ref('')
  const parseResult = ref<CitationParseResult | null>(null)
  const showConfirmDialog = ref(false)

  const count = computed(() => selectedRefs.value.length)
  const minCount = computed(() =>
    minReferenceCount !== undefined ? minReferenceCount.value : getMinReferenceCount(degreeType.value),
  )
  const meetsMinCount = computed(() => count.value >= minCount.value)
  const hasParseErrors = computed(() => (parseResult.value?.invalid.length ?? 0) > 0)

  function addReference(item: ReferenceItem): void {
    if (!selectedRefs.value.some((r) => r.id === item.id)) {
      selectedRefs.value.push(item)
    }
  }

  function removeReference(id: string): void {
    selectedRefs.value = selectedRefs.value.filter((r) => r.id !== id)
  }

  function moveUp(index: number): void {
    if (index <= 0 || index >= selectedRefs.value.length) return
    const arr = [...selectedRefs.value]
    ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
    selectedRefs.value = arr
  }

  function moveDown(index: number): void {
    if (index < 0 || index >= selectedRefs.value.length - 1) return
    const arr = [...selectedRefs.value]
    ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
    selectedRefs.value = arr
  }

  function isAdded(id: string): boolean {
    return selectedRefs.value.some((r) => r.id === id)
  }

  function parseCitations(): void {
    const text = citationInput.value.trim()
    if (!text) {
      parseResult.value = null
      return
    }
    parseResult.value = parseCitationText(text)
  }

  function addValidParsedRefs(): void {
    if (!parseResult.value) return
    parseResult.value.valid.forEach((line: ParsedCitationLine) => {
      if (line.item) addReference(line.item)
    })
  }

  function clearParseResult(): void {
    parseResult.value = null
  }

  /**
   * 尝试打开确认弹窗
   * @returns false 若文献数量不足（由调用方展示提示）
   */
  function tryOpenConfirmDialog(): boolean {
    if (!meetsMinCount.value) return false
    showConfirmDialog.value = true
    return true
  }

  function closeConfirmDialog(): void {
    showConfirmDialog.value = false
  }

  return {
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
  }
}
