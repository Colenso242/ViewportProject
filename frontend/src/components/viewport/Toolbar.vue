<template>
  <header class="toolbar">
    <div class="brand">
      <div class="brand-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <path d="M3.3 7 12 12l8.7-5M12 22V12"/>
        </svg>
      </div>
      <h1>3D Model Viewer</h1>
    </div>

    <div class="toolbar-controls">
      <ToolbarButton :disabled="!canUndo" @click="$emit('undo')" title="Undo (Ctrl+Z)">
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
          </svg>
        </template>
      </ToolbarButton>

      <ToolbarButton :disabled="!canRedo" @click="$emit('redo')" title="Redo (Ctrl+Shift+Z)">
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>
          </svg>
        </template>
      </ToolbarButton>

      <span class="toolbar-divider" aria-hidden="true"></span>

      <ToolbarButton @click="$emit('toggle-overview')" title="Open analytics overview">
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
        </template>
        Overview
      </ToolbarButton>

      <ToolbarButton :active="showObjectTree" @click="$emit('toggle-tree')" title="Toggle object tree (O)">
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
          </svg>
        </template>
        Objects
      </ToolbarButton>

      <ToolbarButton
        v-if="placementCount > 0"
        :active="showPlacements"
        @click="$emit('toggle-placements-panel')"
        title="Toggle the sensor placements list (P)"
      >
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </template>
        Placements
        <template #trailing>{{ placementCount }}</template>
      </ToolbarButton>

      <ToolbarButton :active="placementMode" @click="$emit('toggle-placement')" title="Place a sensor point: click any spot on the model (or Shift+Click anytime)">
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </template>
        Place Sensor
      </ToolbarButton>

      <ToolbarButton :active="ghostingEnabled" @click="$emit('toggle-ghosting')" title="Toggle ghosting of unlinked objects (G)">
        <template #icon>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </template>
        Ghosting
        <template #trailing>{{ ghostingEnabled ? 'on' : 'off' }}</template>
      </ToolbarButton>

      <div class="api-status" :class="statusClass" :title="`API status: ${apiStatus}`">
        <span class="status-dot"></span>
        <span class="status-label">{{ apiStatus }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ToolbarButton from './ToolbarButton.vue';

const props = defineProps<{
  apiStatus: string;
  showObjectTree: boolean;
  showPlacements: boolean;
  placementCount: number;
  ghostingEnabled: boolean;
  placementMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
}>();

defineEmits<{
  'toggle-tree': [];
  'toggle-placements-panel': [];
  'toggle-ghosting': [];
  'toggle-overview': [];
  'toggle-placement': [];
  'undo': [];
  'redo': [];
}>();

const statusClass = computed(() => {
  if (props.apiStatus === 'offline') return 'offline';
  if (props.apiStatus === 'checking...') return 'checking';
  return 'online';
});
</script>

<style scoped>
.toolbar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
  border-bottom: 1px solid var(--border);
  gap: 1rem;
  flex-shrink: 0;
}

/* Accent edge that caps the very top of the app, matching the panels and cards. */
.toolbar::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), transparent 55%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(47, 111, 224, 0.4);
}

.toolbar h1 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.toolbar-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toolbar-divider {
  width: 1px;
  align-self: stretch;
  margin: 0.15rem 0.1rem;
  background: var(--border);
}

.api-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: 0.5rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.api-status.online .status-dot {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.api-status.checking .status-dot {
  background: var(--warning);
  animation: blink 1s ease-in-out infinite;
}

.api-status.offline .status-dot {
  background: var(--danger);
}

.api-status.offline .status-label {
  color: var(--danger);
}

@keyframes blink {
  50% { opacity: 0.3; }
}
</style>
