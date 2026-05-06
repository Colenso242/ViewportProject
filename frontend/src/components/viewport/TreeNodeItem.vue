<template>
  <li>
    <div
      class="tree-node"
      :style="{ paddingLeft: `${depth * 1.25}rem` }"
      @click.stop="handleClick"
      :class="{ 'selected': selectedObject === node.object }"
    >
      <button
        v-if="node.children.length > 0"
        class="expand-btn"
        @click.stop="isExpanded = !isExpanded"
      >
        {{ isExpanded ? '▼' : '▶' }}
      </button>
      <span v-else class="expand-spacer"></span>
      <span class="node-name">{{ node.name }}</span>
    </div>

    <ul v-if="isExpanded && node.children.length > 0" class="tree-children">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.object.uuid"
        :node="child"
        :depth="depth + 1"
        :selected-object="selectedObject"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as THREE from 'three';

interface TreeNode {
  object: THREE.Object3D;
  name: string;
  children: TreeNode[];
}

const props = withDefaults(
  defineProps<{
    node: TreeNode;
    depth?: number;
    selectedObject: THREE.Object3D | null;
  }>(),
  {
    depth: 0
  }
);

const isExpanded = ref(props.node.children.length > 0);

const emit = defineEmits<{
  'select': [obj: THREE.Object3D];
}>();

function handleClick(): void {
  emit('select', props.node.object);
}
</script>

<style scoped>
li {
  list-style: none;
}

.tree-node {
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid #334155;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-node:hover {
  background: #334155;
}

.tree-node.selected {
  background: #3b82f6;
  color: white;
}

.expand-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.expand-btn:hover {
  color: #3b82f6;
}

.expand-spacer {
  width: 1.25rem;
  display: inline-block;
  flex-shrink: 0;
}

.node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tree-children {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>

