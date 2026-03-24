<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { AccountHistorySnapshotResponse } from '@/types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent])

const props = defineProps<{
  series: Array<{ name: string; history: AccountHistorySnapshotResponse[] }>
  isDark?: boolean
  granularity?: 'daily' | 'weekly' | 'monthly' | 'yearly'
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

const SERIES_COLORS = [
  '#3b82f6', // info
  '#10b981', // success
  '#f59e0b', // warning
  '#6366f1', // primary-ish
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
]

const option = computed(() => {
  const dates = Array.from(new Set(
    props.series.flatMap((line) => line.history.map((point) => point.snapshot_date)),
  )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  const isDaily = props.granularity === 'daily'
  const showDailyPoints = false

  const textColor = props.isDark ? '#94a3b8' : '#6b7280' // slate-400 / gray-500
  const gridColor = props.isDark ? '#1e293b' : '#f3f4f6' // slate-800 / gray-100
  const bgColor = 'transparent'

  const series = props.series.map((line, index) => {
    const byDate = new Map(line.history.map((point) => [point.snapshot_date, point.total_value]))
    return {
      name: line.name,
      type: 'line',
      smooth: !isDaily,
      symbol: showDailyPoints ? 'circle' : 'none',
      showSymbol: showDailyPoints,
      symbolSize: 4,
      lineStyle: { width: line.name === 'Solde total' ? 2.5 : (isDaily ? 1 : 2) },
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      data: dates.map((date) => byDate.get(date) ?? null),
      z: line.name === 'Solde total' ? 10 : 5,
    }
  })

  const xAxisInterval =
    props.granularity === 'daily'
      ? (dates.length <= 40 ? 0 : Math.max(0, Math.floor(dates.length / 14) - 1))
      : Math.max(0, Math.floor(dates.length / 12) - 1)

  const formatXAxisLabel = (val: string): string => {
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return val

    if (props.granularity === 'daily') {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    }
    if (props.granularity === 'weekly') {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    }
    if (props.granularity === 'monthly') {
      return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    }
    if (props.granularity === 'yearly') {
      return d.toLocaleDateString('fr-FR', { year: 'numeric' })
    }
    return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  }

  return {
    backgroundColor: bgColor,
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
      axisLabel: {
        interval: xAxisInterval,
        formatter: formatXAxisLabel,
        color: textColor,
        fontSize: 10,
      },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: textColor, fontSize: 10 },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: gridColor } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: props.isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: props.isDark ? '#334155' : '#e2e8f0',
      textStyle: { color: props.isDark ? '#e2e8f0' : '#1e293b' },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''

        const date = params[0].axisValue
        let tooltip = `<div style="font-weight: 600;">${date}</div>`

        for (const param of params) {
          if (param.seriesName && param.value != null) {
            const value = param.value
            const color = param.color || '#000'
            tooltip += `<div style="color: ${color}; margin-top: 4px;">${param.seriesName}: <strong>${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €</strong></div>`
          }
        }

        return tooltip
      },
    },
    series,
  }
})

function handleChartReady(): void {
  syncChartVisibilityAndSize()
}
</script>

<template>
  <div ref="containerRef" class="w-full h-72">
    <VChart
      v-if="canRenderChart"
      ref="chartRef"
      :option="option"
      autoresize
      @finished="handleChartReady"
    />
  </div>
</template>
