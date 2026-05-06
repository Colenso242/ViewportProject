<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

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
  },
  liveReading: {
    type: Object,
    default: null
  }
});

const chartData = ref<any[]>([]);
const chartOption = ref({});
const isLoading = ref(true);

const fetchHistoricalData = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`http://localhost:3000/api/sensors/${props.sensorId}/history?limit=500&timeRangeMinutes=60`);
    if (response.ok) {
      const data = await response.json();
      chartData.value = data.map((d: any) => ({
        name: new Date(d.timestamp).getTime(),
        value: [
          new Date(d.timestamp).getTime(),
          d.value
        ]
      }));
      updateChartOptions();
    }
  } catch (error) {
    console.error("Failed to load historical data", error);
  } finally {
    isLoading.value = false;
  }
};

const updateChartOptions = () => {
  chartOption.value = {
    title: { text: `Sensor: ${props.sensorId}` },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'time',
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      boundaryGap: [0, '100%']
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { start: 0, end: 100 }
    ],
    series: [
      {
        name: props.sensorId,
        type: 'line',
        showSymbol: false,
        data: chartData.value,
        itemStyle: { color: 'rgb(0, 153, 255)' }
      }
    ]
  };
};

// Handle live updates
watch(() => props.liveReading, (newReading) => {
  if (newReading && newReading.id === props.sensorId) {
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

onMounted(() => {
  fetchHistoricalData();
});
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
  background: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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
  color: #666;
}
</style>
