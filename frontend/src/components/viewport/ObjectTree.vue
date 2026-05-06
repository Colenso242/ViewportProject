<template>
  <aside class="object-tree">
    <div class="tree-header">Model Objects</div>
    <div v-if="!objectTreeItems.length" class="tree-empty">
      Load a model to see objects
    </div>
    <ul v-else class="tree-list">
      <li
        v-for="(obj, index) in objectTreeItems"
        :key="index"
        @click="$emit('select', obj)"
        :class="{ 'selected': selectedObject === obj }"
        class="tree-item"
      >
        {{ obj.name || `Object ${index}` }}
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
  border-right: 1px solid #334155;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-header {
  padding: 0.75rem 1rem;
  font-weight: bold;
  border-bottom: 1px solid #334155;
  background: #334155;
  flex-shrink: 0;
}

.tree-empty {
  padding: 1rem;
  color: #94a3b8;
  font-size: 0.875rem;
}

.tree-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.tree-item {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #334155;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item:hover {
  background: #334155;
}

.tree-item.selected {
  background: #3b82f6;
  color: white;
}
</style>

