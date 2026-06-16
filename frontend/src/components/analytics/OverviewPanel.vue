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

        <!-- Main Timeseries Widget -->
        <div class="widget timeseries-widget">
          <h3>Key Sensor Trend</h3>
          <div class="widget-body">
            <select v-model="selectedWidgetSensor" class="select-control widget-dropdown">
              <option v-for="sensor in sensorsInfo" :key="sensor.id" :value="sensor.id">
                {{ sensor.id }}
              </option>
            </select>
            <div class="chart-wrapper" v-if="selectedWidgetSensor">
              <TimeseriesDashboard
                :sensorId="selectedWidgetSensor" />
            </div>
            <div v-else class="empty-state">No sensors available.</div>
          </div>
        </div>

        <!-- Raw Data Widget -->
        <div class="widget raw-data-widget">
          <h3>Live Raw Data</h3>
          <div class="widget-body">
            <RawDataWidget />
          </div>
        </div>

        <!-- Gauge Widget -->
        <div class="widget gauge-widget">
          <h3>Sensor Gauge</h3>
          <div class="widget-body">
            <select v-model="selectedGaugeSensor" class="select-control widget-dropdown">
              <option v-for="sensor in sensorsInfo" :key="sensor.id" :value="sensor.id">
                {{ sensor.id }}
              </option>
            </select>
            <div class="gauge-wrapper" v-if="selectedGaugeSensor">
              <GaugeWidget
                :sensorId="selectedGaugeSensor"
              />
            </div>
          </div>
        </div>

        <!-- Placeholder Widget -->
        <div class="widget placeholder-widget">
          <h3>System Alerts</h3>
          <div class="widget-body center-content">
            <p>Space reserved for alerts table.</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import TimeseriesDashboard from './TimeseriesDashboard.vue';
import RawDataWidget from './RawDataWidget.vue';
import GaugeWidget from './GaugeWidget.vue';
import { useSensorStore } from '../../stores/useSensorStore';

const sensorStore = useSensorStore();
const { sensorsInfo } = storeToRefs(sensorStore);

defineEmits<{
  'close': [];
}>();

const selectedWidgetSensor = ref('');
const selectedGaugeSensor = ref('');

watch(sensorsInfo, (info) => {
  if (info && info.length > 0 && !selectedWidgetSensor.value) {
    selectedWidgetSensor.value = info[0].id;
  }
  if (info && info.length > 0 && !selectedGaugeSensor.value) {
    selectedGaugeSensor.value = info[0].id;
  }
}, { immediate: true });

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

.widget {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.widget:hover {
  border-color: var(--border-strong);
}

.widget h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.widget h3::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.widget-body {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

.widget-dropdown {
  margin-bottom: 1rem;
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

.center-content {
  justify-content: center;
  align-items: center;
  color: var(--text-faint);
  text-align: center;
}
</style>
