<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

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
      <LoaderCircle class="animate-spin h-10 w-10 text-primary" />
    </div>
  </div>

  <component v-else :is="layout">
    <RouterView />
  </component>
</template>
