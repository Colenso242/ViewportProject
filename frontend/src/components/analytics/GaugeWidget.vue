<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSensorStore } from '../../stores/useSensorStore';

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GaugeChart,
  CanvasRenderer
]);

const props = defineProps({
  sensorId: {
    type: String,
    required: true
  }
});

const sensorStore = useSensorStore();
const { sensorData, sensorsInfo } = storeToRefs(sensorStore);

const chartOption = ref({});
const currentValue = ref(0);

const liveReading = computed(() => sensorData.value[props.sensorId] || null);
const sensorConfig = computed(() => sensorsInfo.value.find((sensor) => sensor.id === props.sensorId) || null);

const updateGaugeOption = () => {
  const config = sensorConfig.value;
  const min = config?.min ?? 0;
  const max = config?.max ?? 100;
  const threshold = config?.threshold ?? 80;
  const value = liveReading.value?.value ?? currentValue.value;
  const isCritical = liveReading.value?.isCritical ?? false;

  const range = Math.max(max - min, 1);
  const thresholdPos = Math.min(1, Math.max(0, (threshold - min) / range));
  const warningPos = Math.min(1, thresholdPos + (1 - thresholdPos) * 0.4);

  chartOption.value = {
    title: {
      text: `${props.sensorId}`,
      left: 'center',
      top: 'bottom',
      textStyle: {
        fontSize: 14,
        color: '#e2e8f0'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${value.toFixed(2)}`
    },
    series: [
      {
        type: 'gauge',
        startAngle: 225,
        endAngle: -45,
        min,
        max,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [thresholdPos, '#22c55e'],
              [warningPos, '#fbbf24'],
              [1, '#ef4444']
            ]
          }
        },
        pointer: {
          itemStyle: {
            color: isCritical ? '#ef4444' : '#64748b'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#334155'
          }
        },
        detail: {
          textStyle: {
            color: isCritical ? '#ef4444' : '#e2e8f0',
            fontSize: 20,
            fontWeight: 'bold'
          },
          formatter: '{value}'
        },
        data: [{ value, name: 'Value' }]
      }
    ]
  };
};

watch([liveReading, sensorConfig], () => {
  currentValue.value = liveReading.value?.value ?? 0;
  updateGaugeOption();
}, { deep: true, immediate: true });

</script>

<template>
  <div class="gauge-widget">
    <v-chart class="gauge-chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.gauge-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 8px;
  padding: 1rem;
}

.gauge-chart {
  width: 100%;
  height: 100%;
  min-height: 250px;
}
</style>

