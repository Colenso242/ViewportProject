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
  background: rgba(11, 17, 32, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
  max-width: 300px;
  box-shadow: var(--shadow-md);
  z-index: 15;
}

.hover-overview {
  pointer-events: none;
}

.hint {
  color: var(--text-faint);
  font-style: italic;
  margin-top: 0.5rem !important;
  font-size: 0.78rem !important;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.85rem;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
}

.info-content {
  padding: 0.75rem 0.85rem;
}

.info-content p {
  margin: 0 0 0.25rem 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.info-content p strong {
  color: var(--text);
  font-weight: 600;
}
</style>

