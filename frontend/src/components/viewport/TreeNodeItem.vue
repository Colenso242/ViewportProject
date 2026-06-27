<template>
  <li v-if="controller.isVisible(node)" class="tree-li">
    <div
      class="tree-node"
      :class="{ selected: isSelected }"
      :style="{ paddingLeft: `${0.4 + depth * 0.85}rem` }"
      role="treeitem"
      :aria-level="depth + 1"
      :aria-selected="isSelected"
      :aria-expanded="node.isLeaf ? undefined : expanded"
      :data-uuid="node.uuid"
      tabindex="0"
      :title="`${node.name} — double-click to frame in view`"
      @click="controller.select(node)"
      @dblclick.stop="controller.focus(node)"
      @keydown="handleKeydown"
    >
      <button
        v-if="!node.isLeaf"
        class="expand-btn"
        :aria-label="expanded ? 'Collapse' : 'Expand'"
        tabindex="-1"
        @click.stop="controller.toggle(node)"
      >
        <svg
          class="chevron"
          :class="{ open: expanded }"
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      <span v-else class="expand-spacer" />

      <svg
        class="node-icon"
        width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <template v-if="node.isLeaf">
          <!-- single mesh / leaf -->
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </template>
        <template v-else>
          <!-- container / group -->
          <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
          <path d="M2 9.5A1.5 1.5 0 0 1 3.5 8h17A1.5 1.5 0 0 1 22 9.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
        </template>
      </svg>

      <span class="node-label">{{ node.name }}</span>
      <span v-if="!node.isLeaf" class="node-count">{{ node.children.length }}</span>
    </div>

    <ul v-if="!node.isLeaf && expanded" class="tree-children" role="group">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.uuid"
        :node="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { treeControllerKey, type SceneTreeNode, type TreeController } from '../../utils/SceneTree';

const props = withDefaults(
  defineProps<{
    node: SceneTreeNode;
    depth?: number;
  }>(),
  { depth: 0 },
);

// Provided once by ObjectTree; shared by every node so expansion/selection/
// filter state isn't drilled through each recursion level.
const controller = inject(treeControllerKey) as TreeController;

const expanded = computed(() => controller.isExpanded(props.node));
const isSelected = computed(() => controller.isSelected(props.node));

function handleKeydown(event: KeyboardEvent): void {
  const target = event.currentTarget as HTMLElement;
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      controller.select(props.node);
      break;
    case 'ArrowRight':
      if (!props.node.isLeaf && !expanded.value) {
        event.preventDefault();
        controller.toggle(props.node);
      }
      break;
    case 'ArrowLeft':
      if (!props.node.isLeaf && expanded.value) {
        event.preventDefault();
        controller.toggle(props.node);
      }
      break;
    case 'ArrowDown':
      event.preventDefault();
      focusRow(nextVisibleRow(target));
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusRow(prevVisibleRow(target));
      break;
  }
}

// Arrow navigation walks the rendered rows in document order, which already
// reflects the visible (expanded + filtered) tree.
function rows(from: HTMLElement): HTMLElement[] {
  const root = from.closest('.tree-list');
  return root ? Array.from(root.querySelectorAll<HTMLElement>('.tree-node')) : [];
}
function nextVisibleRow(from: HTMLElement): HTMLElement | undefined {
  const all = rows(from);
  return all[all.indexOf(from) + 1];
}
function prevVisibleRow(from: HTMLElement): HTMLElement | undefined {
  const all = rows(from);
  return all[all.indexOf(from) - 1];
}
function focusRow(el: HTMLElement | undefined): void {
  el?.focus();
}
</script>

<style scoped>
.tree-li {
  list-style: none;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.5rem;
  border-radius: var(--radius-sm);
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  font-size: 0.82rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
}

.tree-node:hover {
  background: var(--surface-2);
  color: var(--text);
}

.tree-node.selected {
  background: var(--accent-soft);
  border-left-color: var(--accent);
  color: var(--accent);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  flex-shrink: 0;
}

.tree-node:hover .expand-btn {
  color: var(--text);
}

.chevron {
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.expand-spacer {
  width: 16px;
  flex-shrink: 0;
}

.node-icon {
  flex-shrink: 0;
  opacity: 0.55;
}

.tree-node.selected .node-icon {
  opacity: 1;
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.node-count {
  flex-shrink: 0;
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  padding: 0.02rem 0.36rem;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-faint);
}

.tree-node.selected .node-count {
  background: var(--accent);
  color: #fff;
}

.tree-children {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
