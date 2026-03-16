import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/lib/http'
import type { DraftDTO, Step1Data, Step2Data, Step3Data } from '@/types/wizard'

export const useWizardStore = defineStore('wizard', () => {
  const drafts = ref<DraftDTO[]>([])
  const currentDraftId = ref<string | null>(null)
  const loading = ref(false)

  const currentDraft = computed<DraftDTO | null>(
    () => drafts.value.find((d) => d.id === currentDraftId.value) ?? null,
  )

  const step1Data = computed<Step1Data | null>(() => currentDraft.value?.step1Data ?? null)
  const step2Data = computed<Step2Data | null>(() => currentDraft.value?.step2Data ?? null)
  const step3Data = computed<Step3Data | null>(() => currentDraft.value?.step3Data ?? null)

  async function loadDrafts(): Promise<void> {
    loading.value = true
    try {
      const { data } = await http.get<DraftDTO[]>('/drafts')
      drafts.value = data
    } finally {
      loading.value = false
    }
  }

  async function createDraft(): Promise<DraftDTO> {
    loading.value = true
    try {
      const { data } = await http.post<DraftDTO>('/drafts', {})
      drafts.value.push(data)
      currentDraftId.value = data.id
      return data
    } finally {
      loading.value = false
    }
  }

  function selectDraft(id: string): void {
    currentDraftId.value = id
  }

  async function ensureCurrentDraft(): Promise<string> {
    if (currentDraftId.value) return currentDraftId.value
    if (drafts.value.length === 0) {
      await loadDrafts()
    }
    if (drafts.value.length > 0) {
      currentDraftId.value = drafts.value[0].id
      return drafts.value[0].id
    }
    const draft = await createDraft()
    return draft.id
  }

  async function saveStep1(data: Step1Data): Promise<void> {
    const draftId = await ensureCurrentDraft()
    await http.patch(`/drafts/${draftId}/step/1`, data)
    const draft = drafts.value.find((d) => d.id === draftId)
    if (draft) {
      draft.step1Data = data
      draft.currentStep = Math.max(draft.currentStep, 1)
    }
  }

  async function saveStep2(data: Step2Data): Promise<void> {
    const draftId = await ensureCurrentDraft()
    await http.patch(`/drafts/${draftId}/step/2`, data)
    const draft = drafts.value.find((d) => d.id === draftId)
    if (draft) {
      draft.step2Data = data
      draft.currentStep = Math.max(draft.currentStep, 2)
    }
  }

  async function saveStep3(data: Step3Data): Promise<void> {
    const draftId = await ensureCurrentDraft()
    await http.patch(`/drafts/${draftId}/step/3`, data)
    const draft = drafts.value.find((d) => d.id === draftId)
    if (draft) {
      draft.step3Data = data
      draft.currentStep = Math.max(draft.currentStep, 3)
    }
  }

  async function deleteDraft(id: string): Promise<void> {
    await http.delete(`/drafts/${id}`)
    drafts.value = drafts.value.filter((d) => d.id !== id)
    if (currentDraftId.value === id) {
      currentDraftId.value = drafts.value[0]?.id ?? null
    }
  }

  function reset(): void {
    drafts.value = []
    currentDraftId.value = null
  }

  return {
    drafts,
    currentDraftId,
    loading,
    currentDraft,
    step1Data,
    step2Data,
    step3Data,
    loadDrafts,
    createDraft,
    selectDraft,
    ensureCurrentDraft,
    saveStep1,
    saveStep2,
    saveStep3,
    deleteDraft,
    reset,
  }
})
