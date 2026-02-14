<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'

const route = useRoute()
const authStore = useAuthStore()

const layout = computed(() => {
  if (route.meta.layout === 'blank') {
    return BlankLayout
  }
  return DefaultLayout
})
</script>

<template>
  <div v-if="!authStore.isInitialized" class="flex items-center justify-center min-h-screen bg-background dark:bg-background-dark">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span class="text-text-muted dark:text-text-dark-muted text-sm">Chargement...</span>
    </div>
  </div>
  
  <component v-else :is="layout">
    <RouterView />
  </component>
</template>
