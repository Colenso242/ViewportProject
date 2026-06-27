<template>
  <section class="prop-group header-group">
    <h3>{{ selectedObject.name || 'Unnamed Object' }}</h3>
    <p class="prop-row">
      <span class="prop-label">Kind</span>
      <span class="prop-value">{{ friendlyKind }}</span>
    </p>

    <div class="toggle-row">
      <span class="prop-label">Visible</span>
      <button
        class="visibility-btn"
        :class="{ off: !isVisible }"
        :aria-pressed="isVisible"
        :title="isVisible ? 'Hide object' : 'Show object'"
        @click="toggle"
      >
        <svg v-if="isVisible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61"/>
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
        </svg>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  selectedObject: THREE.Object3D;
}>();

const emit = defineEmits<{
  'toggle-visibility': [];
}>();

// A three.js object's `.visible` isn't reactive, so mirror it locally to drive
// the icon. Re-sync whenever the selection changes; flip in step with the toggle.
const isVisible = ref(props.selectedObject.visible);
watch(() => props.selectedObject, (obj) => { isVisible.value = obj.visible; });

function toggle(): void {
  emit('toggle-visibility');
  isVisible.value = !isVisible.value;
}

// Surface a human-readable kind instead of the raw three.js class name.
const friendlyKind = computed(() => {
  if ((props.selectedObject as THREE.Mesh).isMesh) return 'Component';
  const type = props.selectedObject.type;
  if (type === 'Group' || type === 'Object3D' || type === 'Scene') return 'Group';
  return type;
});
</script>

<style scoped>
.prop-group {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.header-group h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent);
  overflow-wrap: anywhere;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  margin: 0.25rem 0;
  font-size: 0.85rem;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

.visibility-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--accent);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.visibility-btn:hover {
  background: var(--surface-2);
  border-color: var(--accent);
}

.visibility-btn.off {
  color: var(--text-faint);
}

.prop-label {
  color: var(--text-muted);
}

.prop-value {
  color: var(--text);
}
</style>

