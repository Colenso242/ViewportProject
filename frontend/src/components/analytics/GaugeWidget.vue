<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

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
  },
  liveReading: {
    type: Object,
    default: null
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  threshold: {
    type: Number,
    default: 80
  }
});

const chartOption = ref({});
const currentValue = ref(0);

const updateGaugeOption = () => {
  const value = props.liveReading?.value ?? currentValue.value;
  const isCritical = props.liveReading?.isCritical ?? false;

  // Normalize threshold position relative to min/max range
  const range = props.max - props.min;
  const thresholdPos = (props.threshold - props.min) / range;
  const warningPos = Math.min(1, thresholdPos + (1 - thresholdPos) * 0.4); // Warning at 40% between threshold and max

  // Color based on value and critical state
  let color = ['#22c55e', '#fbbf24', '#ef4444']; // green, yellow, red
  if (isCritical) {
    color = ['#ef4444', '#ef4444', '#7f1d1d']; // red critical
  }

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
        min: props.min,
        max: props.max,
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
          labelStyle: {
            color: '#94a3b8',
            fontSize: 10
          }
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

watch(() => props.liveReading, () => {
  if (props.liveReading?.value !== undefined) {
    currentValue.value = props.liveReading.value;
  }
  updateGaugeOption();
}, { deep: true });

onMounted(() => {
  updateGaugeOption();
});
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

