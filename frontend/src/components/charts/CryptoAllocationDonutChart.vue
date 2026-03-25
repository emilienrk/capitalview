<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent])

interface AllocationSlice {
  name: string
  value: number
}

const props = defineProps<{
  segments: AllocationSlice[]
  isDark?: boolean
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

const COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0d9488',
  '#ea580c',
  '#4f46e5',
]

const sortedSegments = computed(() => {
  return [...props.segments].sort((a, b) => b.value - a.value)
})

const option = computed(() => {
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
<div>${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} € (${pct.toFixed(1)}%)</div>`
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
        name: 'Répartition',
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: props.isDark ? '#0f172a' : '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        color: COLORS,
        data: sortedSegments.value,
      },
    ],
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
