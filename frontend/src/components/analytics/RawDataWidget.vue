<template>
  <div class="raw-data-widget">
    <SensorSelect v-model="selectedSensor" auto-select-first class="raw-picker" />

    <div v-if="!reading" class="empty-state">Waiting for the first reading…</div>

    <div v-else class="readout">
      <div class="readout-head">
        <span class="readout-value" :class="statusClass">
          {{ formatNum(reading.value) }}<span class="readout-unit">{{ reading.unit }}</span>
        </span>
        <span class="status-badge" :class="statusClass">{{ statusClass.toUpperCase() }}</span>
      </div>

      <dl class="readout-meta">
        <div class="meta-row">
          <dt>Sensor</dt>
          <dd class="mono">{{ reading.id }}</dd>
        </div>
        <div class="meta-row">
          <dt>Type</dt>
          <dd>{{ reading.type }}</dd>
        </div>
        <div class="meta-row">
          <dt>Threshold</dt>
          <dd class="mono">{{ formatNum(reading.threshold) }} {{ reading.unit }}</dd>
        </div>
        <div class="meta-row">
          <dt>Updated</dt>
          <dd class="mono">{{ formatTime(reading.timestamp) }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';
import SensorSelect from '../common/SensorSelect.vue';

const sensorStore = useSensorStore();
const { sensorData } = storeToRefs(sensorStore);

const selectedSensor = ref('');

const reading = computed(() => (selectedSensor.value ? sensorData.value[selectedSensor.value] ?? null : null));

const statusClass = computed(() => {
  const r = reading.value;
  if (!r) return 'ok';
  if (r.isCritical) return 'critical';
  if (r.isWarning) return 'warning';
  return 'ok';
});

function formatNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function formatTime(timestamp: string | Date): string {
  return new Date(timestamp).toLocaleTimeString();
}
</script>

<style scoped>
.raw-data-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.raw-picker {
  margin-bottom: 1rem;
}

.readout {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1;
}

.readout-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.readout-value {
  font-family: var(--font-mono);
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

.readout-value.warning { color: var(--warning); }
.readout-value.critical { color: var(--danger); }

.readout-unit {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 0.35rem;
}

.readout-meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.85rem;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border);
}

.meta-row:last-child {
  border-bottom: none;
}

.meta-row dt {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-faint);
}

.meta-row dd {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.meta-row dd.mono {
  font-family: var(--font-mono);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
  font-size: 0.85rem;
}
</style>
