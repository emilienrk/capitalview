<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  block: false,
})

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-content shadow-sm',
  secondary:
    'bg-secondary hover:bg-secondary-hover text-secondary-content',
  outline:
    'border-2 border-primary text-primary hover:bg-primary/5 dark:hover:bg-primary/10',
  ghost:
    'text-text-body dark:text-text-dark-body hover:bg-surface-active dark:hover:bg-surface-dark-hover',
  danger:
    'bg-danger hover:bg-danger/90 text-danger-content',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-semibold rounded-button transition-all duration-150',
      'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses[props.variant],
      sizeClasses[props.size],
      props.block ? 'w-full' : '',
    ]"
  >
    <slot />
  </button>
</template>
