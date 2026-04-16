<template>
  <div v-if="selectedObject" class="object-info">
    <div class="info-header">
      <strong>{{ selectedObject.name || 'Object' }}</strong>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>
    <div class="info-content">
      <p><strong>Type:</strong> {{ selectedObject.type }}</p>
      <p v-if="selectedObject.geometry">
        <strong>Geometry:</strong> {{ selectedObject.geometry.type || 'Unknown' }}
      </p>
      <label class="toggle-visibility">
        <input
          type="checkbox"
          :checked="selectedObject.visible"
          @change="$emit('toggle-visibility')"
        />
        Visible
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';

defineProps<{
  selectedObject: THREE.Object3D | null;
}>();

defineEmits<{
  'close': [];
  'toggle-visibility': [];
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

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #334155;
  border-bottom: 1px solid #334155;
}

.close-btn {
  background: none;
  border: none;
  color: #f8fafc;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #ef4444;
}

.info-content {
  padding: 1rem;
}

.info-content p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
}

.toggle-visibility {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.toggle-visibility input {
  cursor: pointer;
}
</style>

