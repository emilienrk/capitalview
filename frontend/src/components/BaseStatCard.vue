<script setup lang="ts">
interface Props {
  label: string
  value: string
  subValue?: string
  subValueClass?: string
  icon?: string
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border p-5 shadow-soft">
    <div class="flex items-start justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-text-muted dark:text-text-dark-muted truncate">
          {{ label }}
        </p>
        <p class="mt-1.5 text-2xl font-bold text-text-main dark:text-text-dark-main truncate">
          {{ value }}
        </p>
        <p
          v-if="subValue"
          :class="['mt-1 text-sm font-medium', subValueClass || 'text-text-muted dark:text-text-dark-muted']"
        >
          {{ subValue }}
        </p>
      </div>
      <div v-if="$slots.icon" class="ml-3 shrink-0">
        <slot name="icon" />
      </div>
    </div>
  </div>
</template>
