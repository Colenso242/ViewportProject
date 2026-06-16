<template>
  <section class="prop-group header-group">
    <h3>{{ selectedObject.name || 'Unnamed Object' }}</h3>
    <p class="prop-row">
      <span class="prop-label">Type</span>
      <span class="prop-value">{{ selectedObject.type }}</span>
    </p>
    <p v-if="selectedObject.uuid" class="prop-row">
      <span class="prop-label">UUID</span>
      <span class="prop-value uuid-val" :title="selectedObject.uuid">{{ selectedObject.uuid.split('-')[0] }}...</span>
    </p>

    <label class="toggle-row">
      <span class="prop-label">Visible</span>
      <input
        type="checkbox"
        :checked="selectedObject.visible"
        @change="$emit('toggle-visibility')"
      />
    </label>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';

defineProps<{
  selectedObject: THREE.Object3D;
}>();

defineEmits<{
  'toggle-visibility': [];
}>();
</script>

<style scoped>
.prop-group {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.header-group h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
  word-break: break-all;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  margin: 0.25rem 0;
  font-size: 0.85rem;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  cursor: pointer;
  margin-top: 0.75rem;
}

.prop-label {
  color: var(--text-muted);
}

.prop-value {
  color: var(--text);
}

.uuid-val {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  cursor: help;
}
</style>

