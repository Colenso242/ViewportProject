<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, DataZoomComponent, MarkLineComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ApiService } from '../../services/ApiService';
import { useSensorStore } from '../../stores/useSensorStore';

use([
  TooltipComponent,
  // Registered for `tooltip: { trigger: 'axis' }` so the axis pointer resolves.
  AxisPointerComponent,
  GridComponent,
  DataZoomComponent,
  MarkLineComponent,
  LineChart,
  CanvasRenderer
]);

const props = defineProps({
  sensorId: {
    type: String,
    required: true
  }
});

// Chart colors, kept in sync with the design tokens in App.css.
const COLOR = {
  accent: '#4f8ff7',
  warning: '#fbbf24',
  danger: '#f87171',
  text: '#e6ecf5',
  muted: '#8da2bd',
  border: '#263247',
  borderStrong: '#344361',
  surface: '#1a2436'
};

const HISTORY_WINDOW_MINUTES = 60;
const MAX_POINTS = 500;

const sensorStore = useSensorStore();
const { sensorData, sensorsInfo } = storeToRefs(sensorStore);

const chartData = ref<{ name: number; value: [number, number] }[]>([]);
const chartOption = ref({});
const isLoading = ref(true);

const liveReading = computed(() => sensorData.value[props.sensorId] || null);
const sensorConfig = computed(() => sensorsInfo.value.find((s) => s.id === props.sensorId) || null);

const unit = computed(() => sensorConfig.value?.unit ?? liveReading.value?.unit ?? '');
const threshold = computed<number | null>(() => sensorConfig.value?.threshold ?? liveReading.value?.threshold ?? null);

const status = computed<'ok' | 'warning' | 'critical'>(() => {
  const r = liveReading.value;
  if (r?.isCritical) return 'critical';
  if (r?.isWarning) return 'warning';
  return 'ok';
});

const displayValue = computed(() => {
  const v = liveReading.value?.value;
  return typeof v === 'number' ? formatNum(v) : '—';
});

// Direction of the most recent change — neutral information, so it stays muted
// rather than implying up is good or bad.
const trend = computed<'up' | 'down' | 'flat' | null>(() => {
  const d = chartData.value;
  if (d.length < 2) return null;
  const prev = d[d.length - 2].value[1];
  const curr = d[d.length - 1].value[1];
  if (curr > prev) return 'up';
  if (curr < prev) return 'down';
  return 'flat';
});

const trendArrow = computed(() => (trend.value === 'up' ? '▲' : trend.value === 'down' ? '▼' : '—'));

function formatNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function lineColorForStatus(): string {
  if (status.value === 'critical') return COLOR.danger;
  if (status.value === 'warning') return COLOR.warning;
  return COLOR.accent;
}

type ChartPoint = { value: [number, number] };

// Split the line at the threshold into a blue "below" and red "above" series.
// ECharts 6's visualMap-based recolouring crashes here, so we colour by
// splitting the data: where a segment crosses the limit we insert the exact
// interpolated crossing point into both series (with `null` elsewhere) so the
// two coloured segments meet precisely on the line.
function buildSplitSeries(points: ChartPoint[], limit: number, markLine: unknown) {
  const below: (number | null)[][] = [];
  const above: (number | null)[][] = [];

  for (let i = 0; i < points.length; i++) {
    const [t, v] = points[i].value;
    if (i > 0) {
      const [pt, pv] = points[i - 1].value;
      if ((pv < limit && v > limit) || (pv > limit && v < limit)) {
        const ratio = (limit - pv) / (v - pv);
        const crossingTime = pt + (t - pt) * ratio;
        below.push([crossingTime, limit]);
        above.push([crossingTime, limit]);
      }
    }
    below.push([t, v <= limit ? v : null]);
    above.push([t, v >= limit ? v : null]);
  }

  const common = { type: 'line', showSymbol: false, smooth: false, connectNulls: false } as const;
  return [
    { ...common, name: 'below', data: below, lineStyle: { width: 2, color: COLOR.accent }, areaStyle: { color: COLOR.accent, opacity: 0.1 }, markLine },
    { ...common, name: 'above', data: above, lineStyle: { width: 2, color: COLOR.danger }, areaStyle: { color: COLOR.danger, opacity: 0.1 } }
  ];
}

const fetchHistoricalData = async () => {
  isLoading.value = true;
  try {
    const data = await ApiService.fetchHistory(props.sensorId, MAX_POINTS, HISTORY_WINDOW_MINUTES);
    chartData.value = data.map((d: any) => {
      const t = new Date(d.timestamp).getTime();
      return { name: t, value: [t, d.value] };
    });
    updateChartOptions();
  } catch (error) {
    console.error('Failed to load historical data', error);
  } finally {
    isLoading.value = false;
  }
};

const updateChartOptions = () => {
  const limit = threshold.value;
  const base = lineColorForStatus();

  const markLine = limit != null
    ? {
        silent: true,
        symbol: 'none',
        lineStyle: { color: COLOR.danger, type: 'dashed', width: 1 },
        label: {
          formatter: `Limit ${formatNum(limit)} ${unit.value}`.trim(),
          color: COLOR.danger,
          fontSize: 10,
          position: 'insideEndTop'
        },
        data: [{ yAxis: limit }]
      }
    : undefined;

  const series = limit != null
    ? buildSplitSeries(chartData.value, limit, markLine)
    : [
        {
          name: props.sensorId,
          type: 'line',
          showSymbol: false,
          smooth: 0.2,
          sampling: 'lttb',
          data: chartData.value,
          lineStyle: { width: 2, color: base },
          itemStyle: { color: base },
          areaStyle: { opacity: 0.12 }
        }
      ];

  chartOption.value = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'inherit' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: COLOR.surface,
      borderColor: COLOR.borderStrong,
      textStyle: { color: COLOR.text },
      formatter: (params: any) => {
        const arr = Array.isArray(params) ? params : [params];
        // With the split series only one of the two has a value at each x.
        const point = arr.find((p: any) => p?.value?.[1] != null) ?? arr[0];
        const time = formatClock(point.value[0]);
        const reading = `${formatNum(point.value[1])} ${unit.value}`.trim();
        return `${time}<br/><strong>${reading}</strong>`;
      }
    },
    grid: { left: 54, right: 18, top: 18, bottom: 64 },
    xAxis: {
      type: 'time',
      splitLine: { show: false },
      axisLine: { lineStyle: { color: COLOR.borderStrong } },
      axisLabel: { color: COLOR.muted, hideOverlap: true, formatter: (value: number) => formatClock(value) }
    },
    yAxis: {
      type: 'value',
      name: unit.value,
      nameTextStyle: { color: COLOR.muted, align: 'left', fontSize: 11, padding: [0, 0, 4, 0] },
      boundaryGap: [0, '15%'],
      splitLine: { lineStyle: { color: COLOR.border } },
      axisLabel: { color: COLOR.muted }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      {
        start: 0,
        end: 100,
        height: 24,
        bottom: 8,
        borderColor: COLOR.borderStrong,
        backgroundColor: 'transparent',
        fillerColor: 'rgba(79, 143, 247, 0.15)',
        handleStyle: { color: COLOR.accent },
        moveHandleStyle: { color: COLOR.borderStrong },
        textStyle: { color: COLOR.muted },
        dataBackground: {
          lineStyle: { color: COLOR.borderStrong },
          areaStyle: { color: 'rgba(52, 67, 97, 0.3)' }
        }
      }
    ],
    series
  };
};

// Handle live updates
watch(liveReading, (newReading) => {
  if (newReading) {
    const t = new Date(newReading.timestamp).getTime();
    chartData.value.push({ name: t, value: [t, newReading.value] });

    // Keep window sliding
    if (chartData.value.length > MAX_POINTS) {
      chartData.value.shift();
    }
    updateChartOptions();
  }
}, { deep: true });

// Rebuild once the sensor's config (unit / threshold) arrives.
watch(sensorConfig, updateChartOptions);

watch(() => props.sensorId, fetchHistoricalData, { immediate: true });
</script>

<template>
  <div class="dashboard-panel">
    <header class="readout">
      <div class="readout-main">
        <span class="readout-value" :class="status">{{ displayValue }}</span>
        <span class="readout-unit">{{ unit }}</span>
        <span v-if="trend" class="readout-trend" :aria-label="`Trending ${trend}`">{{ trendArrow }}</span>
      </div>
      <div class="readout-meta">
        <span v-if="liveReading" class="status-badge" :class="status">{{ status.toUpperCase() }}</span>
        <span v-else class="status-badge waiting">WAITING</span>
        <span v-if="threshold != null" class="readout-limit">Limit {{ formatNum(threshold) }} {{ unit }}</span>
      </div>
    </header>

    <div class="chart-area">
      <v-chart class="chart" :option="chartOption" autoresize />
      <div v-if="isLoading" class="chart-overlay">Loading history…</div>
      <div v-else-if="!chartData.length" class="chart-overlay">No readings in the last hour</div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-panel {
  width: 100%;
  height: 100%;
  min-height: 250px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.readout {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0.25rem;
  flex-shrink: 0;
}

.readout-main {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.readout-value {
  font-family: var(--font-mono);
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

.readout-value.warning { color: var(--warning); }
.readout-value.critical { color: var(--danger); }

.readout-unit {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.readout-trend {
  font-size: 0.8rem;
  color: var(--text-faint);
  margin-left: 0.15rem;
}

.readout-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.readout-limit {
  font-size: 0.68rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

/* Neutral badge shown before the first live reading arrives. */
.status-badge.waiting {
  background: var(--surface-3);
  color: var(--text-muted);
}

.chart-area {
  flex: 1;
  position: relative;
  min-height: 200px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-faint);
  background: var(--bg);
  font-size: 0.85rem;
}
</style>
