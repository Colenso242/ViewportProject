<template>
  <aside v-if="selectedObject" class="properties-panel">
    <div class="panel-header">
      <h2>Properties</h2>
      <button @click="$emit('close')" class="icon-btn danger-hover" title="Close Panel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
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
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem 0.6rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-header h2 {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
</style>
