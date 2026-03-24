<script setup lang="ts">
import { AlertCircle, CheckCircle2, TriangleAlert, X, XCircle } from 'lucide-vue-next'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface Props {
  variant?: AlertVariant
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: false,
})

const emit = defineEmits<{
  dismiss: []
}>()

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-info/10 border-info/20 text-info',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger: 'bg-danger/10 border-danger/20 text-danger',
}

const variantIcons: Record<AlertVariant, typeof AlertCircle> = {
  info: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle,
}
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 p-4 rounded-input border text-sm',
      variantClasses[props.variant],
    ]"
    role="alert"
  >
    <component :is="variantIcons[props.variant]" class="w-5 h-5 shrink-0 mt-0.5" />
    <div class="flex-1">
      <slot />
    </div>
    <button
      v-if="props.dismissible"
      @click="emit('dismiss')"
      class="shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
