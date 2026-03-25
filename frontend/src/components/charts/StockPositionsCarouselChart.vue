<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

interface PositionChartRow {
  label: string
  invested: number
  value: number
  pnl: number
}

const props = defineProps<{
  rows: PositionChartRow[]
  isDark?: boolean
}>()

const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const canRenderChart = ref(false)
const activeSlide = ref(0)
let resizeObserver: ResizeObserver | null = null

const slides = [
  { key: 'allocation', title: 'Repartition du portefeuille', subtitle: 'Poids de chaque ligne dans la valeur totale' },
  { key: 'value_vs_invested', title: 'Investi vs valeur', subtitle: 'Comparaison du capital investi et de la valeur actuelle' },
  { key: 'pnl', title: 'P/L par ligne', subtitle: 'Contribution de chaque ligne au gain ou a la perte' },
]

const currentSlideTitle = computed(() => slides[activeSlide.value]?.title ?? slides[0]?.title ?? '')
const currentSlideSubtitle = computed(() => slides[activeSlide.value]?.subtitle ?? slides[0]?.subtitle ?? '')

const sortedRows = computed(() => [...props.rows].sort((a, b) => b.value - a.value))

function syncChartVisibilityAndSize(): void {
  const container = containerRef.value
  if (!container) return

  const hasSize = container.clientWidth > 0 && container.clientHeight > 0
  if (!hasSize) return

  canRenderChart.value = true
  nextTick(() => {
    chartRef.value?.resize()
  })
}

onMounted(() => {
  syncChartVisibilityAndSize()

  resizeObserver = new ResizeObserver(() => {
    syncChartVisibilityAndSize()
  })

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

function nextSlide(): void {
  activeSlide.value = (activeSlide.value + 1) % slides.length
}

function prevSlide(): void {
  activeSlide.value = (activeSlide.value - 1 + slides.length) % slides.length
}

function currency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

const pieOption = computed(() => {
  const textColor = props.isDark ? '#94a3b8' : '#6b7280'
  const tooltipBg = props.isDark ? '#0f172a' : '#ffffff'
  const tooltipBorder = props.isDark ? '#334155' : '#e5e7eb'
  const tooltipText = props.isDark ? '#f1f5f9' : '#111827'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText, fontSize: 12 },
      formatter: (params: any) => {
        const value = Number(params.value || 0)
        const pct = Number(params.percent || 0)
        return `<div style="font-weight:600;margin-bottom:4px">${params.name}</div>
<div>${currency(value)} (${pct.toFixed(1)}%)</div>`
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: textColor, fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      pageIconColor: textColor,
      pageTextStyle: { color: textColor },
    },
    series: [
      {
        name: 'Allocation',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: sortedRows.value.map((row) => ({ name: row.label, value: row.value })),
      },
    ],
  }
})

const valueVsInvestedOption = computed(() => {
  const textColor = props.isDark ? '#94a3b8' : '#6b7280'
  const gridColor = props.isDark ? '#1e293b' : '#f3f4f6'

  return {
    backgroundColor: 'transparent',
    legend: {
      top: 0,
      textStyle: { color: textColor, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const label = params[0]?.axisValue ?? ''
        const invested = Number(params.find((p) => p.seriesName === 'Investi')?.value ?? 0)
        const value = Number(params.find((p) => p.seriesName === 'Valeur')?.value ?? 0)
        return `<div style="font-weight:600;margin-bottom:4px">${label}</div>
<div>Investi: <strong>${currency(invested)}</strong></div>
<div>Valeur: <strong>${currency(value)}</strong></div>`
      },
    },
    grid: {
      top: 34,
      left: 8,
      right: 8,
      bottom: 28,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: sortedRows.value.map((row) => row.label),
      axisLabel: { color: textColor, fontSize: 10, interval: 0, rotate: sortedRows.value.length > 4 ? 25 : 0 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor,
        formatter: (val: number) => `${Math.round(val).toLocaleString('fr-FR')} €`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: gridColor } },
    },
    series: [
      {
        name: 'Investi',
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { color: '#64748b' },
        data: sortedRows.value.map((row) => row.invested),
      },
      {
        name: 'Valeur',
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { color: '#2563eb' },
        data: sortedRows.value.map((row) => row.value),
      },
    ],
  }
})

const pnlOption = computed(() => {
  const textColor = props.isDark ? '#94a3b8' : '#6b7280'
  const gridColor = props.isDark ? '#1e293b' : '#f3f4f6'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const point = params[0]
        const val = Number(point.value || 0)
        const sign = val >= 0 ? '+' : ''
        return `<div style="font-weight:600;margin-bottom:4px">${point.name}</div>
<div>P/L: <strong>${sign}${currency(val)}</strong></div>`
      },
    },
    grid: {
      top: 16,
      left: 8,
      right: 8,
      bottom: 28,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: sortedRows.value.map((row) => row.label),
      axisLabel: { color: textColor, fontSize: 10, interval: 0, rotate: sortedRows.value.length > 4 ? 25 : 0 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor,
        formatter: (val: number) => `${Math.round(val).toLocaleString('fr-FR')} €`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: gridColor } },
    },
    series: [
      {
        name: 'P/L',
        type: 'bar',
        barMaxWidth: 26,
        data: sortedRows.value.map((row) => ({
          value: row.pnl,
          itemStyle: { color: row.pnl >= 0 ? '#059669' : '#dc2626' },
        })),
      },
    ],
  }
})

const activeOption = computed(() => {
  if (activeSlide.value === 0) return pieOption.value
  if (activeSlide.value === 1) return valueVsInvestedOption.value
  return pnlOption.value
})

function handleChartReady(): void {
  syncChartVisibilityAndSize()
}
</script>

<template>
  <div class="rounded-card border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark p-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-text-main dark:text-text-dark-main">{{ currentSlideTitle }}</p>
        <p class="text-xs text-text-muted dark:text-text-dark-muted">{{ currentSlideSubtitle }}</p>
      </div>
      <div class="inline-flex items-center gap-1 rounded-button border border-surface-border dark:border-surface-dark-border bg-background-subtle dark:bg-background-dark-subtle p-1">
        <button
          type="button"
          class="h-7 w-7 rounded-button text-text-main dark:text-text-dark-main hover:bg-surface dark:hover:bg-surface-dark"
          aria-label="Graphique precedent"
          @click="prevSlide"
        >
          &#8249;
        </button>
        <button
          type="button"
          class="h-7 w-7 rounded-button text-text-main dark:text-text-dark-main hover:bg-surface dark:hover:bg-surface-dark"
          aria-label="Graphique suivant"
          @click="nextSlide"
        >
          &#8250;
        </button>
      </div>
    </div>

    <div ref="containerRef" class="h-72 w-full">
      <VChart
        v-if="canRenderChart"
        ref="chartRef"
        :option="activeOption"
        autoresize
        @finished="handleChartReady"
      />
    </div>

    <div class="mt-3 flex justify-center gap-1.5">
      <button
        v-for="(slide, index) in slides"
        :key="slide.key"
        type="button"
        class="h-2 rounded-full transition-all"
        :class="index === activeSlide
          ? 'w-6 bg-primary'
          : 'w-2 bg-surface-border dark:bg-surface-dark-border hover:bg-text-muted dark:hover:bg-text-dark-muted'"
        :aria-label="`Afficher ${slide.title}`"
        @click="activeSlide = index"
      />
    </div>
  </div>
</template>