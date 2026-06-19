<template>
  <section class="prop-group">
    <h3>Structure</h3>

    <div class="prop-row">
      <span class="prop-label">Components</span>
      <span class="prop-value">{{ partCount }}</span>
    </div>

    <div class="prop-row">
      <span class="prop-label">Linked sensors</span>
      <span class="prop-value">{{ linkedSensorCount }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../../stores/useSensorStore';

const props = defineProps<{
  selectedObject: THREE.Object3D;
}>();

const { sensorMappings } = storeToRefs(useSensorStore());

// How many renderable parts make up this object (1 for a single mesh).
const partCount = computed(() => {
  let count = 0;
  props.selectedObject.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && !child.userData.isSensorPointMarker) count++;
  });
  return count;
});

// How many of those parts are wired to a sensor — i.e. this object's coverage.
const linkedSensorCount = computed(() => {
  let count = 0;
  props.selectedObject.traverse((child) => {
    if (sensorMappings.value[child.uuid]) count++;
  });
  return count;
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
  margin: 0.25rem 0;
  font-size: 0.85rem;
}

.prop-label {
  color: var(--text-muted);
}

.prop-value {
  color: var(--text);
}
</style>

