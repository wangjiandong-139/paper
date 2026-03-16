<template>
  <aside class="w-56 flex-shrink-0 bg-gray-900 text-gray-100 flex flex-col">
    <div class="px-4 py-5 border-b border-gray-700">
      <h1 class="text-sm font-semibold text-white">AI论文写作</h1>
      <p class="text-xs text-gray-400 mt-0.5">运营管理后台</p>
    </div>

    <nav class="flex-1 overflow-y-auto py-4 px-2">
      <div v-for="section in visibleSections" :key="section.title" class="mb-6">
        <p class="px-2 mb-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
          {{ section.title }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="item in section.items" :key="item.name">
            <RouterLink
              :to="item.path"
              class="flex items-center gap-2 px-2 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              active-class="bg-gray-800 text-white"
            >
              <span class="text-base">{{ item.icon }}</span>
              {{ item.name }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdminAuthStore } from '@/stores/admin-auth.store'
import { AdminRole } from '@ai-paper/shared'

const authStore = useAdminAuthStore()
const role = computed(() => authStore.role)

interface NavItem {
  name: string
  path: string
  icon: string
  roles: AdminRole[]
}

interface NavSection {
  title: string
  items: NavItem[]
  minRole?: AdminRole[]
}

const sections: NavSection[] = [
  {
    title: '概览',
    items: [
      { name: '统计看板', path: '/dashboard', icon: '📊', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR, AdminRole.CUSTOMER_SERVICE, AdminRole.READ_ONLY] },
    ],
  },
  {
    title: '订单管理',
    items: [
      { name: '订单列表', path: '/orders', icon: '📋', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR, AdminRole.CUSTOMER_SERVICE, AdminRole.READ_ONLY] },
      { name: '支付记录', path: '/payments', icon: '💳', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR, AdminRole.CUSTOMER_SERVICE, AdminRole.READ_ONLY] },
    ],
  },
  {
    title: '内容管理',
    items: [
      { name: '学校模板', path: '/templates', icon: '🏫', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR] },
      { name: '模板请求', path: '/template-requests', icon: '📝', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR] },
      { name: '商品管理', path: '/products', icon: '🛒', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR] },
    ],
  },
  {
    title: '用户管理',
    items: [
      { name: '用户列表', path: '/users', icon: '👥', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR, AdminRole.CUSTOMER_SERVICE] },
    ],
  },
  {
    title: '系统',
    items: [
      { name: 'API 配置', path: '/configs/api', icon: '⚙️', roles: [AdminRole.SUPER_ADMIN] },
      { name: '系统配置', path: '/configs/system', icon: '🔧', roles: [AdminRole.SUPER_ADMIN] },
      { name: '后台账号', path: '/settings/accounts', icon: '👤', roles: [AdminRole.SUPER_ADMIN] },
      { name: '操作日志', path: '/logs', icon: '📜', roles: [AdminRole.SUPER_ADMIN, AdminRole.OPERATOR] },
    ],
  },
]

const visibleSections = computed(() => {
  if (!role.value) return []
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role.value!)),
    }))
    .filter((section) => section.items.length > 0)
})
</script>
