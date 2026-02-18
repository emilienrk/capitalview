<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'

const route = useRoute()
const auth = useAuthStore()

const layout = computed(() => {
  if (route.meta.layout === 'blank') {
    return BlankLayout
  }
  return DefaultLayout
})
</script>

<template>
  <div v-if="!auth.isInitialized" class="fixed inset-0 flex items-center justify-center bg-background dark:bg-background-dark">
    <div class="flex flex-col items-center gap-4">
      <svg class="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  </div>

  <component v-else :is="layout">
    <RouterView />
  </component>
</template>
