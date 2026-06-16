<template>
  <div class="raw-data-widget">
    <div class="widget-header">
      <select v-model="selectedSensor" class="select-control">
        <option v-for="sensor in sensorsInfo" :key="sensor.id" :value="sensor.id">
          {{ sensor.id }}
        </option>
      </select>
    </div>

    <div class="widget-content">
      <div v-if="!selectedSensorData" class="empty-state">
        Waiting for data...
      </div>
      <div v-else class="data-grid">
        <div class="data-row">
          <span class="label">Timestamp:</span>
          <span class="value">{{ new Date(selectedSensorData.timestamp).toLocaleTimeString() }}</span>
        </div>
        <div class="data-row">
          <span class="label">Sensor ID:</span>
          <span class="value">{{ selectedSensorData.id }}</span>
        </div>
        <div class="data-row">
          <span class="label">Type:</span>
          <span class="value">{{ selectedSensorData.type }}</span>
        </div>
        <div class="data-row">
          <span class="label">Value:</span>
          <span class="value" :class="{ 'warning': selectedSensorData.isWarning, 'critical': selectedSensorData.isCritical }">
            {{ selectedSensorData.value }} {{ selectedSensorData.unit }}
          </span>
        </div>
        <div class="data-row">
          <span class="label">Threshold:</span>
          <span class="value">{{ selectedSensorData.threshold }} {{ selectedSensorData.unit }}</span>
        </div>
        <div class="data-row">
          <span class="label">Status:</span>
          <span class="value">
            <span v-if="selectedSensorData.isCritical" class="status-badge critical">CRITICAL</span>
            <span v-else-if="selectedSensorData.isWarning" class="status-badge warning">WARNING</span>
            <span v-else class="status-badge ok">OK</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';

const sensorStore = useSensorStore();
const { sensorData, sensorsInfo } = storeToRefs(sensorStore);

const selectedSensor = ref('');

// Auto-select first available sensor
watch(sensorsInfo, (info) => {
  if (info && info.length > 0 && !selectedSensor.value) {
    selectedSensor.value = info[0].id;
  }
}, { immediate: true });

const selectedSensorData = computed(() => {
  if (!selectedSensor.value) return null;
  return sensorData.value[selectedSensor.value] || null;
});
</script>

<style scoped>
.raw-data-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.widget-header {
  margin-bottom: 1rem;
}

.widget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.data-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--bg);
  padding: 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.data-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.label {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.value {
  color: var(--text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.value.critical {
  color: var(--danger);
}

.value.warning {
  color: var(--warning);
}

.empty-state {
  color: var(--text-faint);
  text-align: center;
  padding: 2rem;
}
</style>

