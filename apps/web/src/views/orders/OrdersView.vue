<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="我的订单"
      left-arrow
      @click-left="router.back()"
    />

    <!-- 加载中 -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <van-loading size="32" color="#07c160" />
    </div>

    <!-- 加载失败 -->
    <div v-else-if="loadError" class="px-4 py-8" data-testid="load-error">
      <van-notice-bar
        :text="loadError"
        color="#ed6a0c"
        background="#fffbe8"
        left-icon="warning-o"
      />
      <van-button class="mt-3" round block type="primary" color="#07c160" @click="loadOrders">
        重试
      </van-button>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="orders.length === 0"
      class="flex flex-col items-center justify-center py-24"
      data-testid="empty-state"
    >
      <van-empty description="暂无订单" />
      <van-button
        round
        type="primary"
        color="#07c160"
        class="mt-4"
        @click="router.push('/wizard/1')"
      >
        去写论文
      </van-button>
    </div>

    <!-- 订单列表 -->
    <div v-else class="px-4 py-4 space-y-3" data-testid="order-list">
      <div
        v-for="order in orders"
        :key="order.id"
        class="bg-white rounded-xl overflow-hidden shadow-sm"
        :data-testid="`order-card-${order.id}`"
      >
        <!-- 卡片头部：状态 + 时间 -->
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-50">
          <van-tag
            :type="getStatusDisplay(order.status).type"
            :color="getStatusDisplay(order.status).color"
            size="medium"
          >
            {{ getStatusDisplay(order.status).label }}
          </van-tag>
          <span class="text-xs text-gray-400">{{ formatOrderDate(order.createdAt) }}</span>
        </div>

        <!-- 卡片内容：套餐 + 价格 -->
        <div class="px-4 py-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-800">基础版套餐</p>
              <p class="text-xs text-gray-400 mt-0.5">订单号：{{ order.id.slice(0, 8) }}…</p>
            </div>
            <span class="text-lg font-bold text-green-600">{{ formatPrice(order.planPrice) }}</span>
          </div>
        </div>

        <!-- 卡片底部：跳转按钮 -->
        <div class="px-4 pb-3">
          <van-button
            v-if="isOrderNavigable(order)"
            round
            block
            size="small"
            :type="getNavButtonType(order.status)"
            :color="getNavButtonColor(order.status)"
            :data-testid="`btn-nav-${order.id}`"
            @click="navigateToOrder(order)"
          >
            {{ getNavButtonLabel(order.status) }}
          </van-button>
          <p v-else class="text-xs text-gray-400 text-center py-1">
            生成失败，请联系客服
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/lib/http'
import { OrderStatus } from '@/types/order'
import type { OrderDTO } from '@/types/order'
import {
  getOrderNavTarget,
  isOrderNavigable,
  formatOrderDate,
  formatPrice,
  ORDER_STATUS_DISPLAY,
} from '@/utils/order-navigation'

const router = useRouter()

const orders = ref<OrderDTO[]>([])
const loading = ref(false)
const loadError = ref('')

// ─── 状态展示 ──────────────────────────────────────────────────

function getStatusDisplay(status: OrderStatus) {
  return ORDER_STATUS_DISPLAY[status]
}

function getNavButtonLabel(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING_PAYMENT:
      return '继续支付'
    case OrderStatus.GENERATING:
      return '查看生成进度'
    case OrderStatus.COMPLETED:
      return '查看 / 下载论文'
    default:
      return '继续'
  }
}

function getNavButtonType(status: OrderStatus): 'primary' | 'default' {
  return status === OrderStatus.COMPLETED ? 'primary' : 'default'
}

function getNavButtonColor(status: OrderStatus): string | undefined {
  return status === OrderStatus.COMPLETED ? '#07c160' : undefined
}

// ─── 订单跳转 ──────────────────────────────────────────────────

function navigateToOrder(order: OrderDTO): void {
  const target = getOrderNavTarget(order)
  router.push({ path: target.path, query: target.query })
}

// ─── 加载订单 ──────────────────────────────────────────────────

async function loadOrders(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await http.get<OrderDTO[]>('/orders')
    // 按创建时间倒序排列
    orders.value = [...data].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载订单失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrders()
})
</script>
