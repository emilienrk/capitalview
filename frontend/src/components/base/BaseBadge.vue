<script setup lang="ts">
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'

interface Props {
  variant?: BadgeVariant
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
})

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-badge border text-xs font-semibold',
      variantClasses[variant],
    ]"
  >
    <slot />
  </span>
</template>
