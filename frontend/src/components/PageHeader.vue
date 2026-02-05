<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-main dark:text-text-dark-main">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-text-muted dark:text-text-dark-muted">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
