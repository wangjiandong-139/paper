import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupRouterGuards } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/AdminLoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminShell.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardOverviewView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE', 'READ_ONLY'] },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/orders/OrderListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE', 'READ_ONLY'] },
      },
      {
        path: 'orders/:orderId',
        name: 'order-detail',
        component: () => import('@/views/orders/OrderDetailView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE', 'READ_ONLY'] },
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('@/views/templates/TemplateListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR'] },
      },
      {
        path: 'template-requests',
        name: 'template-requests',
        component: () => import('@/views/templates/TemplateRequestListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR'] },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/users/UserListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE'] },
      },
      {
        path: 'users/:userId',
        name: 'user-detail',
        component: () => import('@/views/users/UserDetailView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE'] },
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('@/views/products/ProductListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR'] },
      },
      {
        path: 'payments',
        name: 'payments',
        component: () => import('@/views/payments/PaymentListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE', 'READ_ONLY'] },
      },
      {
        path: 'configs/api',
        name: 'api-configs',
        component: () => import('@/views/configs/ApiConfigView.vue'),
        meta: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'configs/system',
        name: 'system-configs',
        component: () => import('@/views/configs/SystemConfigView.vue'),
        meta: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'settings/accounts',
        name: 'admin-users',
        component: () => import('@/views/settings/AdminUsersView.vue'),
        meta: { roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'settings/change-password',
        name: 'change-password',
        component: () => import('@/views/settings/ChangePasswordView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE', 'READ_ONLY'] },
      },
      {
        path: 'logs',
        name: 'operation-logs',
        component: () => import('@/views/logs/OperationLogListView.vue'),
        meta: { roles: ['SUPER_ADMIN', 'OPERATOR'] },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/errors/ForbiddenView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

setupRouterGuards(router)
