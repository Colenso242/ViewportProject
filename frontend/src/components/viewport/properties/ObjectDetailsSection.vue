<template>
  <section class="prop-group">
    <h3>Object Data</h3>

    <div v-if="geometryType" class="prop-row">
      <span class="prop-label">Geometry</span>
      <span class="prop-value">{{ geometryType }}</span>
    </div>

    <div v-if="materialType" class="prop-row">
      <span class="prop-label">Material</span>
      <span class="prop-value">{{ materialType }}</span>
    </div>

    <div v-if="!geometryType && !materialType" class="empty-state">
      No geometry or material details available.
    </div>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed } from 'vue';

const props = defineProps<{
  selectedObject: THREE.Object3D;
}>();

const geometryType = computed(() => {
  const geometry = (props.selectedObject as THREE.Mesh).geometry;
  return geometry?.type || '';
});

const materialType = computed(() => {
  const material = (props.selectedObject as THREE.Mesh).material;
  if (!material) return '';
  return Array.isArray(material) ? 'Multiple Materials' : material.type;
});
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

.empty-state {
  color: #64748b;
  font-size: 0.875rem;
}
</style>

