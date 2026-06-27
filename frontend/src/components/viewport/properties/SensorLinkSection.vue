<template>
  <section class="prop-group">
    <h3>{{ pointSensorId ? 'IoT Sensor Point' : 'IoT Sensor Link' }}</h3>

    <SensorSelect
      :model-value="linkedSensor"
      placeholder="-- No Sensor --"
      class="sensor-select"
      @update:model-value="onPick"
    />

    <div v-if="linkedSensorData" class="sensor-live-data">
      <div class="prop-row">
        <span class="prop-label">Live Value</span>
        <span class="prop-value" :class="valueStatus">
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

    <template v-if="pointSensorId">
      <button v-if="!confirming" class="remove-point-btn" @click="confirming = true">
        Remove Sensor Point
      </button>
      <div v-else class="remove-confirm">
        <span class="remove-confirm-text">Remove this sensor point?</span>
        <div class="remove-confirm-actions">
          <button class="confirm-cancel-btn" @click="confirming = false">Cancel</button>
          <button class="confirm-remove-btn" @click="removePoint">Remove</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../../stores/useSensorStore';
import { useSceneStore } from '../../../stores/useSceneStore';
import SensorSelect from '../../common/SensorSelect.vue';

const props = defineProps<{
  selectedObject: THREE.Object3D;
}>();

const sensorStore = useSensorStore();
const sceneStore = useSceneStore();
const { sensorData, sensorMappings, pointSensors } = storeToRefs(sensorStore);

const linkedSensor = ref('');
const confirming = ref(false);

// When a point-sensor marker is selected, the dropdown drives the placement
// instead of the per-object uuid mapping.
const pointSensorId = computed<string | null>(
  () => props.selectedObject?.userData.sensorPointId || null
);

watch(
  [() => props.selectedObject, sensorMappings, pointSensors],
  ([obj]) => {
    // Reset the delete confirmation whenever the selection or data changes.
    confirming.value = false;
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

function onPick(sensorId: string) {
  linkedSensor.value = sensorId;
  updateLink();
}

function updateLink() {
  if (pointSensorId.value) {
    sensorStore.setPointSensorLink(pointSensorId.value, linkedSensor.value);
    return;
  }
  sensorStore.updateMapping(props.selectedObject.uuid, linkedSensor.value);
}

function removePoint() {
  confirming.value = false;
  if (pointSensorId.value) {
    sensorStore.removePointSensor(pointSensorId.value);
    sceneStore.showActionToast('Sensor point removed');
  }
}

const linkedSensorData = computed(() => {
  if (!linkedSensor.value) return null;
  return sensorData.value[linkedSensor.value] || null;
});

// Status class for the live value, mapped to the shared design tokens.
const valueStatus = computed(() => {
  const data = linkedSensorData.value;
  if (!data) return '';
  if (data.isCritical) return 'critical';
  if (data.isWarning) return 'warning';
  return 'ok';
});
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

.prop-value.ok { color: var(--success); }
.prop-value.warning { color: var(--warning); }
.prop-value.critical { color: var(--danger); }

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

.remove-confirm {
  margin-top: 0.75rem;
}

.remove-confirm-text {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}

.remove-confirm-actions {
  display: flex;
  gap: 0.5rem;
}

.confirm-cancel-btn,
.confirm-remove-btn {
  flex: 1;
  padding: 0.45rem 0.8rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.confirm-cancel-btn {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
}

.confirm-cancel-btn:hover {
  color: var(--text);
  background: var(--surface-2);
  border-color: var(--text-faint);
}

.confirm-remove-btn {
  background: var(--danger);
  color: white;
  border: 1px solid var(--danger);
}

.confirm-remove-btn:hover {
  filter: brightness(1.1);
}
</style>



