<template>
  <aside v-if="selectedObject" class="properties-panel">
    <div class="panel-header">
      <span class="panel-header-title">
        <svg class="panel-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/></svg>
        <h2>Properties</h2>
      </span>
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
    // selectedObject is a live THREE.Object3D, not reactive Vue state — toggling
    // its visibility on the scene graph is the intended effect here.
    // eslint-disable-next-line vue/no-mutating-props
    props.selectedObject.visible = !props.selectedObject.visible;
  }
}
</script>

<style scoped>
.properties-panel {
  position: relative;
  width: 300px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.properties-panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(270deg, var(--accent), transparent 65%);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem 0.6rem 1rem;
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-header-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-icon {
  color: var(--accent);
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
