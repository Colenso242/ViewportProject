<template>
  <div class="alerts-widget">
    <div v-if="!alerts.length" class="alerts-empty">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
      </svg>
      <p>All sensors within limits</p>
    </div>

    <template v-else>
      <div class="alerts-summary">
        <span v-if="criticalCount" class="status-badge critical">{{ criticalCount }} critical</span>
        <span v-if="warningCount" class="status-badge warning">{{ warningCount }} warning</span>
      </div>

      <ul class="alerts-list">
        <li v-for="alert in alerts" :key="alert.id" class="alert-row" :class="severity(alert)">
          <span class="alert-dot" :class="severity(alert)"></span>
          <div class="alert-main">
            <span class="alert-id">{{ alert.id }}</span>
            <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
          </div>
          <div class="alert-reading">
            <span class="alert-value" :class="severity(alert)">{{ formatValue(alert.value) }} {{ alert.unit }}</span>
            <span class="alert-threshold">limit {{ formatValue(alert.threshold) }}</span>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';
import type { SensorReading } from '../../types';

const { sensorData } = storeToRefs(useSensorStore());

type Severity = 'critical' | 'warning';

function severity(reading: SensorReading): Severity {
  return reading.isCritical ? 'critical' : 'warning';
}

// Sensors currently breaching a threshold, worst first: critical before warning,
// then by how far over the limit they are.
const alerts = computed<SensorReading[]>(() =>
  Object.values(sensorData.value)
    .filter((r) => r.isCritical || r.isWarning)
    .sort((a, b) => {
      if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
      return overshoot(b) - overshoot(a);
    })
);

const criticalCount = computed(() => alerts.value.filter((a) => a.isCritical).length);
const warningCount = computed(() => alerts.value.length - criticalCount.value);

// Fractional amount a reading exceeds its threshold, used only for ordering.
function overshoot(reading: SensorReading): number {
  if (!reading.threshold) return reading.value;
  return reading.value / reading.threshold;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatTime(timestamp: string | Date): string {
  return new Date(timestamp).toLocaleTimeString();
}
</script>

<style scoped>
.alerts-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0.6rem;
}

.alerts-summary {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.alerts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.alert-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-left-width: 2px;
  border-left-color: var(--border-strong);
  border-radius: var(--radius-sm);
}

.alert-row.warning { border-left-color: var(--warning); }
.alert-row.critical { border-left-color: var(--danger); }

.alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-dot.warning { background: var(--warning); box-shadow: 0 0 5px var(--warning); }
.alert-dot.critical { background: var(--danger); box-shadow: 0 0 5px var(--danger); }

.alert-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.alert-id {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-time {
  font-size: 0.68rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.alert-reading {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.alert-value {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.alert-value.warning { color: var(--warning); }
.alert-value.critical { color: var(--danger); }

.alert-threshold {
  font-size: 0.66rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.alerts-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--success);
}

.alerts-empty p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
