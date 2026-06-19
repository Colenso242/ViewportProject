<template>
  <div class="overview-overlay">
    <div class="overview-header">
      <h2>System Overview Analytics</h2>
      <button class="icon-btn danger-hover" @click="$emit('close')" title="Close Overview">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="overview-content">
      <div class="widgets-grid">

        <WidgetCard title="Key Sensor Trend" class="timeseries-widget">
          <SensorSelect v-model="selectedWidgetSensor" />
          <div class="chart-wrapper" v-if="selectedWidgetSensor">
            <TimeseriesDashboard :sensorId="selectedWidgetSensor" />
          </div>
          <div v-else class="empty-state">No sensors available.</div>
        </WidgetCard>

        <WidgetCard title="Live Raw Data" class="raw-data-widget">
          <RawDataWidget />
        </WidgetCard>

        <WidgetCard title="Sensor Gauge" class="gauge-widget">
          <SensorSelect v-model="selectedGaugeSensor" />
          <div class="gauge-wrapper" v-if="selectedGaugeSensor">
            <GaugeWidget :sensorId="selectedGaugeSensor" />
          </div>
        </WidgetCard>

        <WidgetCard title="System Alerts" class="placeholder-widget" center>
          <p>Space reserved for alerts table.</p>
        </WidgetCard>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TimeseriesDashboard from './TimeseriesDashboard.vue';
import RawDataWidget from './RawDataWidget.vue';
import GaugeWidget from './GaugeWidget.vue';
import WidgetCard from './WidgetCard.vue';
import SensorSelect from './SensorSelect.vue';

defineEmits<{
  'close': [];
}>();

const selectedWidgetSensor = ref('');
const selectedGaugeSensor = ref('');
</script>

<style scoped>
.overview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg);
  z-index: 500;
  display: flex;
  flex-direction: column;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.5rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.overview-header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
}

.overview-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.25rem;
  grid-auto-rows: minmax(300px, 400px);
}

/* Make Timeseries span more space if preferred */
.timeseries-widget {
  grid-column: span 2;
}

@media (max-width: 1000px) {
  .timeseries-widget {
    grid-column: span 1;
  }
}

.chart-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
}

.gauge-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
