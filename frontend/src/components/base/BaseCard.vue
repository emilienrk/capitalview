<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  padding?: boolean
  hoverable?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: true,
  hoverable: false,
})
</script>

<template>
  <div
    :class="[
      'rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border shadow-card transition-all duration-150',
      hoverable ? 'hover:shadow-lg hover:border-primary/30 cursor-pointer' : '',
    ]"
  >
    <!-- Card Header -->
    <div
      v-if="title || $slots.header"
      class="px-6 py-4 border-b border-surface-border dark:border-surface-dark-border"
    >
      <slot name="header">
        <div>
          <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">{{ title }}</h3>
          <p v-if="subtitle" class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">
            {{ subtitle }}
          </p>
        </div>
      </slot>
    </div>

    <!-- Card Body -->
    <div :class="padding ? 'p-6' : ''">
      <slot />
    </div>

    <!-- Card Footer -->
    <div
      v-if="$slots.footer"
      class="px-6 py-4 border-t border-surface-border dark:border-surface-dark-border bg-background-subtle/50 dark:bg-background-dark-subtle/50 rounded-b-card"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
