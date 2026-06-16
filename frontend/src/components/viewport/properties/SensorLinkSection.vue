<template>
  <section class="prop-group">
    <h3>{{ pointSensorId ? 'IoT Sensor Point' : 'IoT Sensor Link' }}</h3>

    <select v-model="linkedSensor" @change="updateLink" class="select-control sensor-select">
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
        <span v-if="linkedSensorData.isCritical" class="status-badge critical">CRITICAL</span>
        <span v-else-if="linkedSensorData.isWarning" class="status-badge warning">WARNING</span>
        <span v-else class="status-badge ok">OK</span>
      </div>
    </div>

    <button v-if="pointSensorId" class="remove-point-btn" @click="removePoint">
      Remove Sensor Point
    </button>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../../stores/useSensorStore';

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
const { sensorsInfo, sensorData, sensorMappings, pointSensors } = storeToRefs(sensorStore);
const sensorOptions = computed(() => sensorsInfo.value as SensorOption[]);

const linkedSensor = ref('');

// When a point-sensor marker is selected, the dropdown drives the placement
// instead of the per-object uuid mapping.
const pointSensorId = computed<string | null>(
  () => props.selectedObject?.userData.sensorPointId || null
);

watch(
  [() => props.selectedObject, sensorMappings, pointSensors],
  ([obj]) => {
    if (!obj) {
      linkedSensor.value = '';
      return;
    }
    if (pointSensorId.value) {
      const point = pointSensors.value.find(p => p.placementId === pointSensorId.value);
      linkedSensor.value = point?.sensorId || '';
      return;
    }
    linkedSensor.value = sensorMappings.value[obj.uuid] || '';
  },
  { immediate: true }
);

function updateLink() {
  if (pointSensorId.value) {
    sensorStore.setPointSensorLink(pointSensorId.value, linkedSensor.value);
    return;
  }
  sensorStore.updateMapping(props.selectedObject.uuid, linkedSensor.value);
}

function removePoint() {
  if (pointSensorId.value) {
    sensorStore.removePointSensor(pointSensorId.value);
  }
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
  border-bottom: 1px solid var(--border);
}

.prop-group h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.07em;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.25rem 0;
  font-size: 0.85rem;
}

.prop-label {
  color: var(--text-muted);
}

.prop-value {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.sensor-select {
  margin-bottom: 0.75rem;
}

.sensor-live-data {
  background: var(--bg);
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  border-left: 2px solid var(--accent);
}

.remove-point-btn {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.45rem 0.8rem;
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem;
  transition: background 0.15s ease, color 0.15s ease;
}

.remove-point-btn:hover {
  background: var(--danger);
  color: white;
}
</style>



