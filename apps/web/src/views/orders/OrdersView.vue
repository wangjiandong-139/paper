<template>
  <div class="min-h-screen bg-gray-50">
    <van-nav-bar title="我的订单" left-arrow @click-left="router.back()" />
    <div class="p-4">
      <p class="text-gray-500 text-sm text-center py-10">（即将实现）</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
