<script setup lang="ts">
interface Props {
  /** Shape variant */
  variant?: 'text' | 'circle' | 'rect'
  /** Width (CSS value) */
  width?: string
  /** Height (CSS value) */
  height?: string
  /** Number of text lines to render */
  lines?: number
}

withDefaults(defineProps<Props>(), {
  variant: 'text',
  width: '100%',
  height: undefined,
  lines: 1,
})
</script>

<template>
  <!-- Circle -->
  <div
    v-if="variant === 'circle'"
    class="rounded-full bg-surface-border/50 dark:bg-surface-dark-border/50 animate-pulse"
    :style="{ width, height: height || width }"
  />

  <!-- Rect -->
  <div
    v-else-if="variant === 'rect'"
    class="rounded-secondary bg-surface-border/50 dark:bg-surface-dark-border/50 animate-pulse"
    :style="{ width, height: height || '1rem' }"
  />

  <!-- Text (default, supports multiple lines) -->
  <div v-else class="space-y-2" :style="{ width }">
    <div
      v-for="i in lines"
      :key="i"
      class="rounded-secondary bg-surface-border/50 dark:bg-surface-dark-border/50 animate-pulse"
      :style="{
        height: height || '0.875rem',
        width: i === lines && lines > 1 ? '60%' : '100%',
      }"
    />
  </div>
</template>
