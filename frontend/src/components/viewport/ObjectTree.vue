<template>
  <aside class="object-tree">
    <div class="tree-header">
      <span class="tree-header-title">
        <svg class="panel-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5"/></svg>
        <span>Model Objects</span>
      </span>
      <span v-if="nodeCount" class="tree-count">{{ nodeCount }}</span>
    </div>

    <div v-if="root && root.children.length" class="tree-toolbar">
      <div class="search-box">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="search-input"
          placeholder="Filter objects…"
          spellcheck="false"
          aria-label="Filter objects"
        />
        <button v-if="query" class="clear-btn" aria-label="Clear filter" @click="query = ''">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <button class="tool-btn" title="Expand all" aria-label="Expand all" @click="expandAll">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 13 5 5 5-5M7 6l5 5 5-5" /></svg>
      </button>
      <button class="tool-btn" title="Collapse all" aria-label="Collapse all" @click="collapseAll">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 11-5-5-5 5M17 18l-5-5-5 5" /></svg>
      </button>
    </div>

    <div v-if="!root || !root.children.length" class="tree-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.3 7 12 12l8.7-5M12 22V12" />
      </svg>
      <p>Load a model to see its objects</p>
    </div>

    <template v-else>
      <ul ref="listEl" class="tree-list" role="tree" aria-label="Model objects">
        <TreeNodeItem v-for="child in root.children" :key="child.uuid" :node="child" />
      </ul>
      <div v-if="query && !hasMatches" class="tree-no-match">No objects match “{{ query }}”.</div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed, nextTick, provide, ref, watch } from 'vue';
import TreeNodeItem from './TreeNodeItem.vue';
import {
  treeControllerKey,
  type SceneTreeNode,
  type TreeController,
} from '../../utils/SceneTree';

const props = defineProps<{
  root: SceneTreeNode | null;
  selectedObject: THREE.Object3D | null;
}>();

const emit = defineEmits<{
  select: [obj: THREE.Object3D];
  focus: [obj: THREE.Object3D];
}>();

const listEl = ref<HTMLElement | null>(null);
const query = ref('');
// uuids the user has manually expanded.
const expandedIds = ref<Set<string>>(new Set());

const nodeCount = computed(() => props.root?.descendantCount ?? 0);

/**
 * When filtering, compute which nodes to show (matches + their ancestors, for
 * context) and which to force-open (ancestors of matches) in a single pass.
 */
const filter = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q || !props.root) return null;

  const visible = new Set<string>();
  const expand = new Set<string>();

  const walk = (node: SceneTreeNode, ancestors: string[]): boolean => {
    let descendantMatched = false;
    for (const child of node.children) {
      if (walk(child, [...ancestors, node.uuid])) descendantMatched = true;
    }
    const selfMatched = node.name.toLowerCase().includes(q);
    if (selfMatched || descendantMatched) {
      visible.add(node.uuid);
      for (const id of ancestors) {
        visible.add(id);
        expand.add(id);
      }
      if (descendantMatched) expand.add(node.uuid);
      return true;
    }
    return false;
  };

  for (const child of props.root.children) walk(child, []);
  return { visible, expand };
});

const hasMatches = computed(() => !filter.value || filter.value.visible.size > 0);

const controller: TreeController = {
  isExpanded(node) {
    if (filter.value) return filter.value.expand.has(node.uuid) || expandedIds.value.has(node.uuid);
    return expandedIds.value.has(node.uuid);
  },
  toggle(node) {
    const next = new Set(expandedIds.value);
    if (next.has(node.uuid)) next.delete(node.uuid);
    else next.add(node.uuid);
    expandedIds.value = next;
  },
  select(node) {
    emit('select', node.object);
  },
  focus(node) {
    emit('focus', node.object);
  },
  isSelected(node) {
    return props.selectedObject?.uuid === node.uuid;
  },
  isVisible(node) {
    return filter.value ? filter.value.visible.has(node.uuid) : true;
  },
};

provide(treeControllerKey, controller);

function expandAll(): void {
  if (!props.root) return;
  const all = new Set<string>();
  props.root.traverse((node) => {
    if (!node.isLeaf) all.add(node.uuid);
  });
  expandedIds.value = all;
}

function collapseAll(): void {
  expandedIds.value = new Set();
}

// Reset transient view state whenever a different model is loaded.
watch(
  () => props.root,
  () => {
    query.value = '';
    expandedIds.value = new Set();
  },
);

// Selecting in the 3D viewport should reveal and scroll to the node here.
watch(
  () => props.selectedObject,
  async (selected) => {
    if (!selected || !props.root) return;
    const path = props.root.pathTo(selected.uuid);
    if (path?.length) {
      const next = new Set(expandedIds.value);
      for (const id of path) next.add(id);
      expandedIds.value = next;
    }
    await nextTick();
    listEl.value
      ?.querySelector(`.tree-node[data-uuid="${selected.uuid}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  },
);

</script>

<style scoped>
.object-tree {
  position: relative;
  width: 250px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.object-tree::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), transparent 65%);
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
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tree-header-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-icon {
  color: var(--accent);
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

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.search-box > svg {
  position: absolute;
  left: 0.5rem;
  color: var(--text-faint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.35rem 1.5rem 0.35rem 1.75rem;
  background: var(--bg);
  border: 1px solid var(--border-strong);
  color: var(--text);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: var(--accent);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-faint);
}

.clear-btn {
  position: absolute;
  right: 0.35rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.clear-btn:hover {
  color: var(--text);
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.tool-btn:hover {
  color: var(--text);
  background: var(--surface-3);
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

.tree-no-match {
  padding: 1rem;
  color: var(--text-faint);
  font-size: 0.8rem;
  text-align: center;
}
</style>
