<template>
  <div class="overview-overlay">
    <div class="overview-header">
      <div class="overview-title">
        <span class="overview-eyebrow">Digital Twin</span>
        <h2>System Overview</h2>
      </div>
      <div class="overview-header-right">
        <span class="live-pill"><span class="live-dot"></span>Live</span>
        <button class="icon-btn danger-hover" @click="$emit('close')" title="Close Overview">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <div class="overview-content">
      <div class="widgets-grid">

        <WidgetCard title="Key Sensor Trend" class="timeseries-widget">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 13 3-3 3 3 5-6"/></svg>
          </template>
          <SensorSelect v-model="selectedWidgetSensor" auto-select-first class="sensor-picker" />
          <div class="chart-wrapper" v-if="selectedWidgetSensor">
            <TimeseriesDashboard :sensorId="selectedWidgetSensor" />
          </div>
          <div v-else class="empty-state">No sensors available.</div>
        </WidgetCard>

        <WidgetCard title="Live Raw Data" class="raw-data-widget">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </template>
          <RawDataWidget />
        </WidgetCard>

        <WidgetCard title="Sensor Gauge" class="gauge-widget">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
          </template>
          <SensorSelect v-model="selectedGaugeSensor" auto-select-first class="sensor-picker" />
          <div class="gauge-wrapper" v-if="selectedGaugeSensor">
            <GaugeWidget :sensorId="selectedGaugeSensor" />
          </div>
        </WidgetCard>

        <WidgetCard title="System Alerts" class="alerts-widget-card" accent="var(--warning)">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </template>
          <AlertsWidget />
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
import SensorSelect from '../common/SensorSelect.vue';
import AlertsWidget from './AlertsWidget.vue';

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
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.overview-title {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.overview-eyebrow {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--accent);
}

.overview-header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}

.overview-header-right {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.6rem 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--success-soft);
  color: var(--success);
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 0 var(--success);
  animation: live-pulse 1.8s ease-out infinite;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
  100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot { animation: none; }
}

.overview-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  grid-auto-rows: minmax(320px, 420px);
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

.sensor-picker {
  margin-bottom: 0.85rem;
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
