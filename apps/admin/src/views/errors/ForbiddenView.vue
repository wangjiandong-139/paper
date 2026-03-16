<template>
  <div class="flex flex-col items-center justify-center h-full py-20 space-y-4">
    <div class="text-6xl">🚫</div>
    <h1 class="text-2xl font-bold text-gray-900">无权访问</h1>
    <p class="text-sm text-gray-500">您的账号没有访问此页面的权限</p>
    <RouterLink to="/dashboard" class="btn-primary">返回首页</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
