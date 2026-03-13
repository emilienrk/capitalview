<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

withDefaults(defineProps<Props>(), {
  size: 'md',
})

const sizeClasses: Record<string, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3">
    <LoaderCircle :class="['animate-spin text-primary', sizeClasses[size]]" />
    <p v-if="label" class="text-sm text-text-muted dark:text-text-dark-muted">{{ label }}</p>
  </div>
</template>
