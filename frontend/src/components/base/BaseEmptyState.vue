<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

interface Props {
  title: string
  description?: string
  icon?: string
  actionLabel?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <!-- Default icon or slot -->
    <div class="w-16 h-16 rounded-full bg-background-subtle dark:bg-background-dark-subtle flex items-center justify-center mb-4">
      <slot name="icon">
        <Inbox class="w-8 h-8 text-text-muted dark:text-text-dark-muted" />
      </slot>
    </div>
    <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main mb-1">
      {{ props.title }}
    </h3>
    <p v-if="props.description" class="text-sm text-text-muted dark:text-text-dark-muted max-w-sm mb-6">
      {{ props.description }}
    </p>
    <slot name="action">
      <button
        v-if="props.actionLabel"
        @click="emit('action')"
        class="px-5 py-2.5 rounded-button bg-primary hover:bg-primary-hover text-primary-content text-sm font-semibold transition-colors"
      >
        {{ props.actionLabel }}
      </button>
    </slot>
  </div>
</template>
