<script setup lang="ts">
import { computed } from 'vue'

interface AssetValuationPoint {
  date: string
  value: number
  source: 'purchase' | 'valuation'
}

interface Props {
  points: AssetValuationPoint[]
  height?: number
  showPointDateLabels?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 208,
  showPointDateLabels: false,
})

const WIDTH = 1000
const PADDING_TOP = 20
const PADDING_RIGHT = 14
const PADDING_BOTTOM = 28
const PADDING_LEFT = 14

const extraBottom = computed(() => (props.showPointDateLabels ? 26 : 0))
const bottomPadding = computed(() => PADDING_BOTTOM + extraBottom.value)

const chartHeight = computed(() => props.height)
const innerHeight = computed(() => Math.max(1, chartHeight.value - PADDING_TOP - bottomPadding.value))
const innerWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT

const safePoints = computed<AssetValuationPoint[]>(() => {
  const normalized = props.points
    .map((point) => ({
      ...point,
      value: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.value))

  return [...normalized].sort((a, b) => {
    const ta = new Date(`${a.date}T00:00:00`).getTime()
    const tb = new Date(`${b.date}T00:00:00`).getTime()
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0
    return ta - tb
  })
})

const minValue = computed(() => {
  if (safePoints.value.length === 0) return 0
  return Math.min(...safePoints.value.map((point) => point.value))
})

const maxValue = computed(() => {
  if (safePoints.value.length === 0) return 0
  return Math.max(...safePoints.value.map((point) => point.value))
})

const paddedRange = computed(() => {
  const min = minValue.value
  const max = maxValue.value

  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1)
    return {
      min: min - pad,
      max: max + pad,
    }
  }

  const pad = (max - min) * 0.12
  return {
    min: min - pad,
    max: max + pad,
  }
})

function xForIndex(index: number): number {
  if (safePoints.value.length <= 1) return PADDING_LEFT + innerWidth / 2
  const ratio = index / (safePoints.value.length - 1)
  return PADDING_LEFT + ratio * innerWidth
}

function yForValue(value: number): number {
  const range = paddedRange.value.max - paddedRange.value.min
  if (range <= 0) return PADDING_TOP + innerHeight.value / 2
  const ratio = (value - paddedRange.value.min) / range
  return PADDING_TOP + (1 - ratio) * innerHeight.value
}

const linePoints = computed<string>(() => {
  return safePoints.value
    .map((point, index) => `${xForIndex(index)},${yForValue(point.value)}`)
    .join(' ')
})

const plottedPoints = computed(() => {
  return safePoints.value.map((point, index) => ({
    ...point,
    x: xForIndex(index),
    y: yForValue(point.value),
  }))
})

function formatShortDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatPointDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const labelStep = computed(() => {
  if (!props.showPointDateLabels) return 0
  const count = safePoints.value.length
  if (count <= 8) return 1
  return Math.ceil(count / 8)
})

function shouldShowDateLabel(index: number): boolean {
  if (!props.showPointDateLabels) return false
  const step = labelStep.value
  if (step <= 1) return true
  return index % step === 0 || index === safePoints.value.length - 1
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const firstDateLabel = computed(() => {
  const first = safePoints.value[0]
  return first ? formatShortDate(first.date) : ''
})

const lastDateLabel = computed(() => {
  const last = safePoints.value[safePoints.value.length - 1]
  return last ? formatShortDate(last.date) : ''
})
</script>

<template>
  <div class="w-full">
    <div
      v-if="safePoints.length <= 1"
      class="h-44 rounded-secondary border border-dashed border-surface-border dark:border-surface-dark-border flex items-center justify-center text-xs text-text-muted dark:text-text-dark-muted"
    >
      Pas assez de points pour afficher l'evolution.
    </div>

    <div v-else class="w-full">
      <svg
        class="w-full"
        :viewBox="`0 0 ${WIDTH} ${chartHeight}`"
        role="img"
        aria-label="Evolution de valorisation"
      >
        <line
          :x1="PADDING_LEFT"
          :x2="WIDTH - PADDING_RIGHT"
          :y1="chartHeight - bottomPadding"
          :y2="chartHeight - bottomPadding"
          class="text-surface-border dark:text-surface-dark-border"
          stroke="currentColor"
          stroke-width="1"
        />

        <polyline
          :points="linePoints"
          fill="none"
          class="text-primary"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <g v-for="(point, index) in plottedPoints" :key="`${point.date}-${point.value}`">
          <circle
            :cx="point.x"
            :cy="point.y"
            :r="point.source === 'purchase' ? 5 : 4"
            class="text-primary-content"
            fill="currentColor"
          />
          <circle
            :cx="point.x"
            :cy="point.y"
            :r="point.source === 'purchase' ? 2.5 : 2"
            class="text-primary"
            fill="currentColor"
          />
          <line
            v-if="shouldShowDateLabel(index)"
            :x1="point.x"
            :x2="point.x"
            :y1="chartHeight - bottomPadding"
            :y2="chartHeight - bottomPadding + 5"
            class="text-surface-border dark:text-surface-dark-border"
            stroke="currentColor"
            stroke-width="1"
          />
          <text
            v-if="shouldShowDateLabel(index)"
            :x="point.x"
            :y="chartHeight - bottomPadding + 16"
            text-anchor="middle"
            class="fill-text-muted dark:fill-text-dark-muted"
            style="font-size: 10px"
          >
            {{ formatPointDate(point.date) }}
          </text>
          <title>{{ `${formatShortDate(point.date)} - ${formatCurrency(point.value)}` }}</title>
        </g>
      </svg>

      <div class="mt-2 flex items-center justify-between text-[11px] text-text-muted dark:text-text-dark-muted">
        <span>{{ firstDateLabel }}</span>
        <span>{{ formatCurrency(minValue) }} - {{ formatCurrency(maxValue) }}</span>
        <span>{{ lastDateLabel }}</span>
      </div>
    </div>
  </div>
</template>