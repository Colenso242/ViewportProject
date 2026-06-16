<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ApiService } from '../../services/ApiService';
import { useSensorStore } from '../../stores/useSensorStore';

use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
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

const sensorStore = useSensorStore();
const { sensorData } = storeToRefs(sensorStore);

const chartData = ref<any[]>([]);
const chartOption = ref({});
const isLoading = ref(true);
const liveReading = computed(() => sensorData.value[props.sensorId] || null);

const fetchHistoricalData = async () => {
  isLoading.value = true;
  try {
    const data = await ApiService.fetchHistory(props.sensorId, 500, 60);
    chartData.value = data.map((d: any) => ({
      name: new Date(d.timestamp).getTime(),
      value: [
        new Date(d.timestamp).getTime(),
        d.value
      ]
    }));
    updateChartOptions();
  } catch (error) {
    console.error("Failed to load historical data", error);
  } finally {
    isLoading.value = false;
  }
};

const updateChartOptions = () => {
  chartOption.value = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'inherit' },
    title: {
      text: `Sensor: ${props.sensorId}`,
      textStyle: { color: '#e6ecf5', fontSize: 13, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a2436',
      borderColor: '#344361',
      textStyle: { color: '#e6ecf5' }
    },
    grid: { left: 50, right: 16, top: 40, bottom: 60 },
    xAxis: {
      type: 'time',
      splitLine: { show: false },
      axisLine: { lineStyle: { color: '#344361' } },
      axisLabel: { color: '#8da2bd' }
    },
    yAxis: {
      type: 'value',
      boundaryGap: [0, '100%'],
      splitLine: { lineStyle: { color: '#263247' } },
      axisLabel: { color: '#8da2bd' }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      {
        start: 0,
        end: 100,
        height: 24,
        bottom: 8,
        borderColor: '#344361',
        backgroundColor: 'transparent',
        fillerColor: 'rgba(79, 143, 247, 0.15)',
        handleStyle: { color: '#4f8ff7' },
        moveHandleStyle: { color: '#344361' },
        textStyle: { color: '#8da2bd' },
        dataBackground: {
          lineStyle: { color: '#344361' },
          areaStyle: { color: 'rgba(52, 67, 97, 0.3)' }
        }
      }
    ],
    series: [
      {
        name: props.sensorId,
        type: 'line',
        showSymbol: false,
        data: chartData.value,
        lineStyle: { color: '#4f8ff7', width: 2 },
        itemStyle: { color: '#4f8ff7' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79, 143, 247, 0.25)' },
              { offset: 1, color: 'rgba(79, 143, 247, 0)' }
            ]
          }
        }
      }
    ]
  };
};

// Handle live updates
watch(liveReading, (newReading) => {
  if (newReading) {
    chartData.value.push({
      name: new Date(newReading.timestamp).getTime(),
      value: [new Date(newReading.timestamp).getTime(), newReading.value]
    });

    // Keep window sliding
    if (chartData.value.length > 500) {
      chartData.value.shift();
    }
    updateChartOptions();
  }
}, { deep: true });

watch(() => props.sensorId, fetchHistoricalData, { immediate: true });
</script>

<template>
  <div class="dashboard-panel">
    <div v-if="isLoading" class="loader">Loading history...</div>
    <v-chart class="chart" :option="chartOption" autoresize />
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
}
.chart {
  flex: 1;
  min-height: 200px;
}
.loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-muted);
}
</style>
