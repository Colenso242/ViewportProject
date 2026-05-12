<template>
  <aside v-if="selectedObject" class="properties-panel">
    <div class="panel-header">
      <h2>Properties</h2>
      <button @click="$emit('close')" class="close-btn" title="Close Panel">✕</button>
    </div>

    <div class="panel-content">
      <ObjectSummarySection
        :selected-object="selectedObject"
        @toggle-visibility="toggleVisibility"
      />
      <ObjectDetailsSection :selected-object="selectedObject" />
      <SensorLinkSection :selected-object="selectedObject" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import ObjectSummarySection from './properties/ObjectSummarySection.vue';
import ObjectDetailsSection from './properties/ObjectDetailsSection.vue';
import SensorLinkSection from './properties/SensorLinkSection.vue';

const props = defineProps<{
  selectedObject: THREE.Object3D | null;
}>();

defineEmits<{
  close: [];
}>();

function toggleVisibility() {
  if (props.selectedObject) {
    props.selectedObject.visible = !props.selectedObject.visible;
  }
}
</script>

<style scoped>
.properties-panel {
  width: 300px;
  background: #1e293b;
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #334155;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f8fafc;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #ef4444;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
</style>
