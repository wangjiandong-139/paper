<template>
  <div class="step4-payment">
    <!-- 论文预览摘要 -->
    <van-cell-group inset class="mb-4" title="论文信息确认">
      <van-cell label="论文标题" :value="step1Data?.title ?? '—'" />
      <van-cell label="学科方向" :value="step1Data?.subject ?? '—'" />
      <van-cell label="学位类型" :value="degreeLabel" />
      <van-cell label="目标字数" :value="wordCountLabel" />
      <van-cell label="参考文献" :value="refCountLabel" />
      <van-cell label="提纲章节" :value="outlineCountLabel" />
    </van-cell-group>

    <!-- 套餐选择 -->
    <div class="px-4 mb-4">
      <p class="text-sm font-semibold text-gray-700 mb-2">选择套餐</p>
      <div
        v-for="plan in PLAN_OPTIONS"
        :key="plan.type"
        class="plan-card rounded-xl border-2 p-4 cursor-pointer transition-colors mb-2"
        :class="selectedPlan === plan.type
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white'"
        :data-testid="`plan-${plan.type}`"
        @click="selectedPlan = plan.type"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-base">{{ plan.name }}</span>
          <span class="text-xl font-bold text-green-600">{{ plan.priceLabel }}</span>
        </div>
        <ul class="text-sm text-gray-500 list-disc list-inside">
          <li v-for="item in plan.description" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>

    <!-- PC 端：二维码支付 -->
    <div v-if="paymentStep === 'polling' && !isInWechat && nativeQrUrl" class="px-4 mb-4">
      <van-cell-group inset>
        <div class="p-4 text-center">
          <p class="text-sm text-gray-600 mb-3">请使用微信扫描二维码完成支付</p>
          <canvas ref="qrCanvas" class="mx-auto block" data-testid="qr-canvas" />
          <p class="text-xs text-gray-400 mt-2">支付完成后自动跳转，请勿关闭页面</p>
        </div>
      </van-cell-group>
    </div>

    <!-- 支付中状态 -->
    <div v-if="isPaying && !nativeQrUrl" class="px-4 mb-4 text-center py-6">
      <van-loading size="32" color="#1989fa" />
      <p class="text-sm text-gray-500 mt-3">{{ payingStatusText }}</p>
    </div>

    <!-- 支付成功 -->
    <div v-if="paymentStep === 'success'" class="px-4 mb-4 text-center py-6" data-testid="success-state">
      <van-icon name="checked" color="#07c160" size="48" />
      <p class="text-base font-semibold text-green-600 mt-2">支付成功！</p>
      <p class="text-sm text-gray-500 mt-1">正在跳转到生成页面…</p>
    </div>

    <!-- 支付失败 -->
    <div v-if="paymentStep === 'failed'" class="px-4 mb-4" data-testid="failed-state">
      <van-notice-bar
        :text="errorMessage || '支付失败，请重试'"
        color="#ed6a0c"
        background="#fffbe8"
        left-icon="warning-o"
      />
      <div class="mt-3 flex gap-3">
        <van-button round block type="default" @click="goBack">返回上一步</van-button>
        <van-button round block type="primary" color="#07c160" @click="retryPayment">重新支付</van-button>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="paymentStep === 'idle'" class="px-4 fixed bottom-0 left-0 right-0 pb-6 pt-3 bg-white border-t border-gray-100">
      <van-button
        round
        block
        size="large"
        type="primary"
        color="#07c160"
        :disabled="!canPay"
        data-testid="pay-button"
        @click="startPayment"
        class="!bg-[#07c160] !border-[#07c160] disabled:opacity-50"
        style="min-height: 48px;"
      >
        立即支付 {{ currentPlanOption?.priceLabel }}
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { useWizardStore } from '@/stores/wizard'
import { usePayment } from '@/composables/usePayment'
import { DegreeType } from '@/types/wizard'
import { PlanType, PLAN_OPTIONS } from '@/types/order'

const router = useRouter()
const wizardStore = useWizardStore()

const step1Data = computed(() => wizardStore.step1Data)
const step2Data = computed(() => wizardStore.step2Data)
const step3Data = computed(() => wizardStore.step3Data)

const selectedPlan = ref<PlanType>(PlanType.BASIC)
const qrCanvas = ref<HTMLCanvasElement | null>(null)

// ─── 摘要计算属性 ──────────────────────────────────────────────────

const DEGREE_LABELS: Record<DegreeType, string> = {
  [DegreeType.UNDERGRADUATE]: '本科',
  [DegreeType.MASTER]: '硕士',
  [DegreeType.DOCTOR]: '博士',
  [DegreeType.OTHER]: '其他',
}

const degreeLabel = computed(() =>
  step1Data.value ? (DEGREE_LABELS[step1Data.value.degree_type] ?? '—') : '—',
)

const wordCountLabel = computed(() =>
  step1Data.value ? `${step1Data.value.word_count.toLocaleString()} 字` : '—',
)

const refCountLabel = computed(() =>
  step2Data.value ? `${step2Data.value.references.length} 篇` : '—',
)

const outlineCountLabel = computed(() => {
  if (!step3Data.value?.outline?.length) return '—'
  const topLevel = step3Data.value.outline.length
  return `${topLevel} 章`
})

// ─── 套餐 ──────────────────────────────────────────────────

const currentPlanOption = computed(
  () => PLAN_OPTIONS.find((p) => p.type === selectedPlan.value) ?? null,
)

const draftId = computed(() => wizardStore.currentDraftId)

const canPay = computed(() => !!draftId.value && !!currentPlanOption.value)

// ─── 支付 composable ──────────────────────────────────────────────────

const { paymentStep, nativeQrUrl, errorMessage, isInWechat, isPaying, startPayment, retryPayment, stopPolling } =
  usePayment({
    draftId,
    planType: selectedPlan,
    onSuccess(orderId) {
      router.push({ path: '/wizard/5', query: { orderId } })
    },
  })

// ─── 二维码渲染 ──────────────────────────────────────────────────

watch(nativeQrUrl, async (url) => {
  if (!url) return
  await nextTick()
  if (qrCanvas.value) {
    await QRCode.toCanvas(qrCanvas.value, url, { width: 200, margin: 1 })
  }
})

// ─── 支付中文案 ──────────────────────────────────────────────────

const payingStatusText = computed(() => {
  if (paymentStep.value === 'creating') return '正在创建订单…'
  if (paymentStep.value === 'paying') return '请在微信中完成支付…'
  if (paymentStep.value === 'polling') return '等待支付确认…'
  return ''
})

// ─── 导航 ──────────────────────────────────────────────────

function goBack() {
  router.push('/wizard/3')
}

// ─── 生命周期 ──────────────────────────────────────────────────

onMounted(() => {
  wizardStore.ensureCurrentDraft()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.step4-payment {
  padding-bottom: 80px;
}
</style>
