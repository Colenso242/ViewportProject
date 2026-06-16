<template>
  <aside class="object-tree">
    <div class="tree-header">
      <span>Model Objects</span>
      <span v-if="objectTreeItems.length" class="tree-count">{{ objectTreeItems.length }}</span>
    </div>
    <div v-if="!objectTreeItems.length" class="tree-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <path d="M3.3 7 12 12l8.7-5M12 22V12"/>
      </svg>
      <p>Load a model to see its objects</p>
    </div>
    <ul v-else class="tree-list">
      <li
        v-for="(obj, index) in objectTreeItems"
        :key="index"
        @click="$emit('select', obj)"
        :class="{ 'selected': selectedObject === obj }"
        class="tree-item"
        :title="obj.name || `Object ${index}`"
      >
        <svg class="item-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        <span class="item-label">{{ obj.name || `Object ${index}` }}</span>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import * as THREE from 'three';

defineProps<{
  objectTreeItems: THREE.Object3D[];
  selectedObject: THREE.Object3D | null;
}>();

defineEmits<{
  'select': [obj: THREE.Object3D];
}>();
</script>

<style scoped>
.object-tree {
  width: 250px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tree-count {
  font-size: 0.68rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-muted);
  letter-spacing: normal;
}

.tree-empty {
  padding: 2rem 1rem;
  color: var(--text-faint);
  font-size: 0.82rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.tree-empty p {
  margin: 0;
}

.tree-list {
  list-style: none;
  padding: 0.25rem;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.item-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item:hover {
  background: var(--surface-2);
  color: var(--text);
}

.tree-item.selected {
  background: var(--accent-soft);
  border-left-color: var(--accent);
  color: var(--accent);
}

.tree-item.selected .item-icon {
  opacity: 1;
}
</style>
