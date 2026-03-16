<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-gray-900">商品管理</h1>
      <button class="btn-primary text-xs" @click="showForm = true">新建商品</button>
    </div>
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">编码</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">价格</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="products.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无商品</td>
          </tr>
          <tr v-for="p in products" :key="p.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ p.productCode }}</td>
            <td class="px-4 py-3 font-medium">{{ p.name }}</td>
            <td class="px-4 py-3 text-gray-700">¥{{ (p.priceFen / 100).toFixed(2) }}</td>
            <td class="px-4 py-3">
              <span :class="p.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'" class="badge">
                {{ p.status === 'ACTIVE' ? '上架' : '下架' }}
              </span>
            </td>
            <td class="px-4 py-3 flex gap-2">
              <button class="text-xs text-primary-600 hover:underline" @click="editProduct(p)">编辑</button>
              <button
                class="text-xs hover:underline"
                :class="p.status === 'ACTIVE' ? 'text-red-500' : 'text-green-600'"
                @click="toggleProduct(p)"
              >
                {{ p.status === 'ACTIVE' ? '下架' : '上架' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ProductForm v-if="showForm" :product="editingProduct" @saved="onSaved" @cancel="showForm = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import ProductForm from '@/components/products/ProductForm.vue'
import type { AdminProductListItemDto } from '@ai-paper/shared'

const products = ref<AdminProductListItemDto[]>([])
const isLoading = ref(false)
const showForm = ref(false)
const editingProduct = ref<AdminProductListItemDto | null>(null)

async function loadProducts(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/products')
    products.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

function editProduct(p: AdminProductListItemDto): void {
  editingProduct.value = p
  showForm.value = true
}

async function toggleProduct(p: AdminProductListItemDto): Promise<void> {
  const action = p.status === 'ACTIVE' ? 'deactivate' : 'activate'
  await adminApi.post(`/products/${p.id}/${action}`)
  await loadProducts()
}

function onSaved(): void {
  showForm.value = false
  editingProduct.value = null
  loadProducts()
}

onMounted(loadProducts)
</script>
