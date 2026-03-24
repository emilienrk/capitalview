<script setup lang="ts">
import { ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })

interface Props {
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'blur': [event: FocusEvent]
}>()

// When type="number", we render the input as type="text" + inputmode="decimal"
// to avoid browser bugs where intermediary states like "0." return "" from target.value.
const inputType = props.type === 'number' ? 'text' : props.type
const inputMode = props.type === 'number' ? 'decimal' : undefined

// Local display value tracks what the user is actively typing for number inputs.
// This prevents "0." from immediately snapping back to "0" before the user finishes.
const displayValue = ref<string>(
  props.modelValue === undefined || props.modelValue === null ? '' : String(props.modelValue),
)

watch(
  () => props.modelValue,
  (val) => {
    if (props.type !== 'number') return
    // Only sync from parent when the raw display doesn't already represent the same number.
    // This avoids overwriting "0." while the user is still typing.
    const parsed = parseFloat(displayValue.value.replace(',', '.'))
    const incoming = typeof val === 'number' ? val : parseFloat(String(val))
    if (parsed !== incoming) {
      displayValue.value = val === undefined || val === null || val === '' ? '' : String(val)
    }
  },
)

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  if (props.type === 'number') {
    const raw = target.value
    displayValue.value = raw
    // Do not emit for pure intermediary states; the parent value stays unchanged.
    if (raw === '' || raw === '-' || raw.endsWith('.') || raw.endsWith(',')) {
      if (raw === '') emit('update:modelValue', '')
      return
    }
    const normalized = raw.replace(',', '.')
    const num = parseFloat(normalized)
    if (!isNaN(num)) {
      emit('update:modelValue', num)
    }
  } else {
    emit('update:modelValue', target.value)
  }
}

function onBlur(event: FocusEvent): void {
  // On blur, clean up dangling decimal points so the field shows a valid number.
  if (props.type === 'number' && (displayValue.value.endsWith('.') || displayValue.value.endsWith(','))) {
    const num = parseFloat(displayValue.value.replace(',', '.'))
    if (!isNaN(num)) {
      displayValue.value = String(num)
      emit('update:modelValue', num)
    }
  }
  emit('blur', event)
}
</script>

<template>
  <div class="space-y-1.5">
    <label
      v-if="props.label"
      :for="props.id"
      class="block text-sm font-medium text-text-main dark:text-text-dark-main"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-danger ml-0.5">*</span>
    </label>
    <input
      v-bind="$attrs"
      :id="props.id"
      :type="inputType"
      :inputmode="inputMode"
      :value="props.type === 'number' ? displayValue : props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      @input="onInput"
      @blur="onBlur"
      :class="[
        'w-full px-4 py-2.5 rounded-input border bg-surface dark:bg-surface-dark transition-all duration-150',
        'text-text-main dark:text-text-dark-main placeholder:text-text-muted/50',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.error
          ? 'border-danger focus:ring-danger/20 focus:border-danger'
          : 'border-surface-border dark:border-surface-dark-border',
      ]"
    />
    <p v-if="props.error" class="text-xs text-danger mt-1">{{ props.error }}</p>
  </div>
</template>
