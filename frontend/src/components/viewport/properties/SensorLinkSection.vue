<template>
  <section class="prop-group">
    <h3>IoT Sensor Link</h3>

    <select v-model="linkedSensor" @change="updateLink" class="sensor-select">
      <option value="">-- No Sensor --</option>
      <option v-for="sensor in sensorOptions" :key="sensor.id" :value="sensor.id">
        {{ sensor.id }} ({{ sensor.name || sensor.unit || 'sensor' }})
      </option>
    </select>

    <div v-if="linkedSensorData" class="sensor-live-data">
      <div class="prop-row">
        <span class="prop-label">Live Value</span>
        <span class="prop-value" :style="getSensorValueColor()">
          {{ linkedSensorData.value }} {{ linkedSensorData.unit }}
        </span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Threshold</span>
        <span class="prop-value">{{ linkedSensorData.threshold }} {{ linkedSensorData.unit }}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Status</span>
        <span v-if="linkedSensorData.isCritical" class="prop-value sensor-critical">🔴 CRITICAL</span>
        <span v-else-if="linkedSensorData.isWarning" class="prop-value sensor-warning">🟡 WARNING</span>
        <span v-else class="prop-value sensor-ok">🟢 OK</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../../stores/useSensorStore';
import { getStableId } from '../../../utils/stableMeshId';

type SensorOption = {
  id: string;
  name?: string;
  unit?: string;
};

type SensorLiveReading = {
  value: number;
  unit?: string;
  threshold?: number;
  isWarning?: boolean;
  isCritical?: boolean;
};

const props = defineProps<{
  selectedObject: THREE.Object3D;
}>();

const sensorStore = useSensorStore();
const { sensorsInfo, sensorData, sensorMappings } = storeToRefs(sensorStore);
const sensorOptions = computed(() => sensorsInfo.value as SensorOption[]);

const linkedSensor = ref('');

const stableId = computed(() => getStableId(props.selectedObject));

watch(
  [() => props.selectedObject, sensorMappings],
  () => {
    const id = stableId.value;
    linkedSensor.value = id ? sensorMappings.value[id] || '' : '';
  },
  { immediate: true }
);

function updateLink() {
  const id = stableId.value;
  if (!id) return;
  sensorStore.updateMapping(id, linkedSensor.value);
}

const linkedSensorData = computed(() => {
  if (!linkedSensor.value) return null;
  return (sensorData.value[linkedSensor.value] as SensorLiveReading | undefined) || null;
});

function getSensorValueColor() {
  if (!linkedSensorData.value) return {};
  if (linkedSensorData.value.isCritical) return { color: '#ef4444' };
  if (linkedSensorData.value.isWarning) return { color: '#fbbf24' };
  return { color: '#10b981' };
}
</script>

<style scoped>
.prop-group {
  padding: 1rem;
  border-bottom: 1px solid #334155;
}

.prop-group h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.prop-label {
  color: #94a3b8;
}

.prop-value {
  color: #e2e8f0;
  font-family: inherit;
}

.sensor-select {
  width: 100%;
  padding: 0.5rem;
  background: #0f172a;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 0.25rem;
  margin-bottom: 0.75rem;
}

.sensor-live-data {
  background: rgba(15, 23, 42, 0.5);
  padding: 0.5rem;
  border-radius: 0.25rem;
  border-left: 2px solid #3b82f6;
}

.sensor-ok {
  color: #10b981 !important;
}

.sensor-warning {
  color: #fbbf24 !important;
}

.sensor-critical {
  color: #ef4444 !important;
}
</style>



