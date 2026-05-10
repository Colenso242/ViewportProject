<template>
  <div class="raw-data-widget">
    <div class="widget-header">
      <select v-model="selectedSensor" class="sensor-select">
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
            <span v-if="selectedSensorData.isCritical" class="badge critical">🔴 CRITICAL</span>
            <span v-else-if="selectedSensorData.isWarning" class="badge warning">🟡 WARNING</span>
            <span v-else class="badge ok">🟢 OK</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  sensorData: Record<string, any>;
  sensorsInfo: any[];
}>();

const selectedSensor = ref('');

// Auto-select first available sensor
watch(() => props.sensorsInfo, (info) => {
  if (info && info.length > 0 && !selectedSensor.value) {
    selectedSensor.value = info[0].id;
  }
}, { immediate: true });

const selectedSensorData = computed(() => {
  if (!selectedSensor.value) return null;
  return props.sensorData[selectedSensor.value] || null;
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

.sensor-select {
  width: 100%;
  padding: 0.5rem;
  background: #0f172a;
  border: 1px solid #475569;
  color: white;
  border-radius: 4px;
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
  background: rgba(15, 23, 42, 0.5);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #334155;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.data-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.label {
  color: #94a3b8;
  font-size: 0.875rem;
}

.value {
  color: #f8fafc;
  font-family: inherit;
  font-weight: 500;
}

.value.critical {
  color: #ef4444;
}

.value.warning {
  color: #fbbf24;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: bold;
}

.badge.ok {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.badge.warning {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.badge.critical {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.json-view details {
  background: #0f172a;
  border: 1px dashed #334155;
  border-radius: 4px;
}

.json-view summary {
  padding: 0.5rem;
  cursor: pointer;
  color: #60a5fa;
  font-size: 0.875rem;
  outline: none;
}

.json-view pre {
  margin: 0;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: #a7f3d0;
  overflow-x: auto;
}

.empty-state {
  color: #64748b;
  text-align: center;
  padding: 2rem;
}
</style>

