<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { GlobalHistorySnapshotResponse } from '@/types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps<{
  history: GlobalHistorySnapshotResponse[]
  isDark?: boolean
  bankEnabled?: boolean
  wealthEnabled?: boolean
}>()

const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const canRenderChart = ref(false)
let resizeObserver: ResizeObserver | null = null

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

const COLORS = {
  total:   '#4f46e5', // primary (indigo-600)
  stock:   '#059669', // success (emerald-600)
  crypto:  '#f59e0b', // warning (amber-500)
  bank:    '#3b82f6', // info (blue-500)
  assets:  '#475569', // secondary (slate-600)
}

const option = computed(() => {
  const dates = props.history.map(s => s.snapshot_date)

  const textColor  = props.isDark ? '#94a3b8' : '#6b7280' // slate-400 / gray-500
  const gridColor  = props.isDark ? '#1e293b' : '#f3f4f6' // slate-800 / gray-100
  const bgColor    = 'transparent'

  const series = []

  if (props.bankEnabled !== false) {
    series.push({
      name: 'Cash',
      type: 'line',
      stack: 'wealth',
      areaStyle: { opacity: 0.4 },
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 0 },
      color: COLORS.bank,
      data: props.history.map(s => s.bank_value),
    })
  }

  series.push({
    name: 'Bourse',
    type: 'line',
    stack: 'wealth',
    areaStyle: { opacity: 0.4 },
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 0 },
    color: COLORS.stock,
    data: props.history.map(s => s.stock_value),
  })

  series.push({
    name: 'Crypto',
    type: 'line',
    stack: 'wealth',
    areaStyle: { opacity: 0.4 },
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 0 },
    color: COLORS.crypto,
    data: props.history.map(s => s.crypto_value),
  })

  if (props.wealthEnabled !== false) {
    series.push({
      name: 'Patrimoine matériel',
      type: 'line',
      stack: 'wealth',
      areaStyle: { opacity: 0.4 },
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 0 },
      color: COLORS.assets,
      data: props.history.map(s => s.assets_value),
    })
  }

  // Total wealth as a standalone line on top
  series.push({
    name: 'Patrimoine total',
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 2.5, color: COLORS.total },
    color: COLORS.total,
    data: props.history.map(s => s.total_wealth),
    z: 10,
  })

  return {
    backgroundColor: bgColor,
    legend: {
      bottom: 0,
      type: 'scroll',  // scrollable on mobile when items overflow
      textStyle: { color: textColor, fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      pageIconColor: textColor,
      pageTextStyle: { color: textColor },
    },
    grid: {
      top: 16,
      left: 8,
      right: 8,
      bottom: 52,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        formatter: (val: string) => {
          const d = new Date(val)
          return `${d.toLocaleString('fr-FR', { month: 'short' })} ${d.getFullYear()}`
        },
        // show roughly one label per month to avoid crowding
        interval: Math.max(0, Math.floor(dates.length / 12) - 1),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor,
        fontSize: 11,
        formatter: (val: number) =>
          val >= 1000 ? `${(val / 1000).toFixed(0)}k €` : `${val} €`,
      },
      splitLine: { lineStyle: { color: gridColor } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,  // keeps tooltip inside chart bounds on mobile
      backgroundColor: props.isDark ? '#0f172a' : '#ffffff',
      borderColor: props.isDark ? '#334155' : '#e5e7eb',
      textStyle: { color: props.isDark ? '#f1f5f9' : '#111827', fontSize: 12 },
      formatter: (params: any[]) => {
        const date = new Date(params[0].axisValue).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        const rows = params
          .map((p: any) => {
            const val = Number(p.value).toLocaleString('fr-FR', {
              minimumFractionDigits: 0, maximumFractionDigits: 0,
            })
            return `<div style="display:flex;justify-content:space-between;gap:16px">
              <span style="color:${p.color}">● ${p.seriesName}</span>
              <span style="font-weight:600">${val} €</span>
            </div>`
          })
          .join('')
        return `<div style="font-weight:600;margin-bottom:6px">${date}</div>${rows}`
      },
    },
    series,
  }
})
</script>

<template>
  <div ref="containerRef" class="w-full h-72">
    <VChart
      v-if="canRenderChart"
      ref="chartRef"
      :option="option"
      autoresize
      class="w-full h-full"
    />
  </div>
</template>
