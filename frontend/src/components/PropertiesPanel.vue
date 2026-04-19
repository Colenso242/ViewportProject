<template>
  <aside v-if="selectedObject" class="properties-panel">
    <div class="panel-header">
      <h2>Properties</h2>
      <button @click="$emit('close')" class="close-btn" title="Close Panel">✕</button>
    </div>

    <div class="panel-content">
      <div class="prop-group header-group">
        <h3>{{ selectedObject.name || 'Unnamed Object' }}</h3>
        <p class="prop-row">
          <span class="prop-label">Type</span>
          <span class="prop-value">{{ selectedObject.type }}</span>
        </p>
        <p v-if="selectedObject.uuid" class="prop-row">
          <span class="prop-label">UUID</span>
          <span class="prop-value uuid-val" :title="selectedObject.uuid">{{ selectedObject.uuid.split('-')[0] }}...</span>
        </p>
      </div>

      <div class="prop-group">
        <label class="toggle-row">
          <span class="prop-label">Visible</span>
          <input
            type="checkbox"
            :checked="selectedObject.visible"
            @change="$emit('toggle-visibility')"
          />
        </label>
      </div>

      <div class="prop-group" v-if="(selectedObject as any).geometry">
        <h3>Geometry</h3>
        <p class="prop-row">
          <span class="prop-label">Type</span>
          <span class="prop-value">{{ (selectedObject as any).geometry.type || 'Unknown' }}</span>
        </p>
      </div>

      <div class="prop-group" v-if="(selectedObject as any).material">
        <h3>Material</h3>
        <p class="prop-row">
          <span class="prop-label">Type</span>
          <span class="prop-value">
            {{ Array.isArray((selectedObject as any).material) ? 'Multiple Materials' : (selectedObject as any).material.type }}
          </span>
        </p>
      </div>

      <div class="prop-group">
        <h3>Transform</h3>
        <div class="transform-grid">
          <div class="transform-lbl">Position</div>
          <div>{{ selectedObject.position.x.toFixed(2) }}</div>
          <div>{{ selectedObject.position.y.toFixed(2) }}</div>
          <div>{{ selectedObject.position.z.toFixed(2) }}</div>

          <div class="transform-lbl">Rotation</div>
          <div>{{ selectedObject.rotation.x.toFixed(2) }}</div>
          <div>{{ selectedObject.rotation.y.toFixed(2) }}</div>
          <div>{{ selectedObject.rotation.z.toFixed(2) }}</div>

          <div class="transform-lbl">Scale</div>
          <div>{{ selectedObject.scale.x.toFixed(2) }}</div>
          <div>{{ selectedObject.scale.y.toFixed(2) }}</div>
          <div>{{ selectedObject.scale.z.toFixed(2) }}</div>
        </div>
      </div>
    </div>
  </aside>
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

.prop-group {
  padding: 1rem;
  border-bottom: 1px solid #334155;
}

.header-group h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: #60a5fa;
  word-break: break-all;
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

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  cursor: pointer;
}

.prop-label {
  color: #94a3b8;
}

.prop-value {
  color: #e2e8f0;
  font-family: inherit;
}

.uuid-val {
  font-family: monospace;
  cursor: help;
}

.transform-grid {
  display: grid;
  grid-template-columns: 3fr 2fr 2fr 2fr;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.transform-lbl {
  color: #94a3b8;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
}

.transform-grid div:not(.transform-lbl) {
  background: #0f172a;
  padding: 0.25rem;
  text-align: right;
  border-radius: 0.25rem;
  font-family: monospace;
  color: #e2e8f0;
}
</style>
