<template>
  <div class="flex h-screen bg-gray-50">
    <AdminSidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <AdminTopbar />
      <main class="flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminTopbar from '@/components/layout/AdminTopbar.vue'
</script>
