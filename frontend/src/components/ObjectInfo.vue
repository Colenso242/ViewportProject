<template>
  <div v-if="hoveredObject && !selectedObject" class="object-info hover-overview">
    <div class="info-header">
      <strong>{{ hoveredObject.name || 'Object' }}</strong>
    </div>
    <div class="info-content">
      <p><strong>Type:</strong> {{ hoveredObject.type }}</p>
      <p class="hint">Click to select to see more</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';

defineProps<{
  selectedObject: THREE.Object3D | null;
  hoveredObject?: THREE.Object3D | null;
}>();


</script>

<style scoped>
.object-info {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  overflow: hidden;
  max-width: 300px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  z-index: 15;
}

.hover-overview {
  opacity: 0.9;
  pointer-events: none;
}

.hint {
  color: #94a3b8;
  font-style: italic;
  margin-top: 0.5rem !important;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #334155;
  border-bottom: 1px solid #334155;
}

.info-content {
  padding: 1rem;
}

.info-content p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
}
</style>

