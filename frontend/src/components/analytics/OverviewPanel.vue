<template>
  <div class="overview-overlay">
    <div class="overview-header">
      <h2>System Overview Analytics</h2>
      <button class="close-btn" @click="$emit('close')" title="Close Overview">✕</button>
    </div>

    <div class="overview-content">
      <div class="widgets-grid">

        <!-- Main Timeseries Widget -->
        <div class="widget timeseries-widget">
          <h3>Key Sensor Trend</h3>
          <div class="widget-body">
            <select v-model="selectedWidgetSensor" class="widget-dropdown">
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
            <select v-model="selectedGaugeSensor" class="widget-dropdown">
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
  background: #0f172a;
  z-index: 500;
  display: flex;
  flex-direction: column;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.overview-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #f8fafc;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #ef4444;
}

.overview-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
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
  background: #1e293b;
  border-radius: 8px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.widget h3 {
  margin: 0;
  padding: 1rem;
  background: #334155;
  font-size: 1.1rem;
  color: #e2e8f0;
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
  padding: 0.5rem;
  background: #0f172a;
  border: 1px solid #475569;
  color: white;
  border-radius: 4px;
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
  color: #64748b;
  text-align: center;
}
</style>
