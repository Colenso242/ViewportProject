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
      <button @click="$emit('toggle-overview')" class="toolbar-btn" title="Open analytics overview">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
        </svg>
        Overview
      </button>

      <button @click="$emit('toggle-tree')" class="toolbar-btn" :class="{ active: showObjectTree }" title="Toggle object tree">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
        </svg>
        Objects
      </button>

      <button @click="$emit('toggle-placement')" class="toolbar-btn" :class="{ active: placementMode }" title="Place a sensor point: click any spot on the model (or Shift+Click anytime)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Place Sensor
      </button>

      <button @click="$emit('toggle-ghosting')" class="toolbar-btn" :class="{ active: ghostingEnabled }" title="Toggle ghosting of unlinked objects">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        Ghosting
        <span class="toggle-state">{{ ghostingEnabled ? 'on' : 'off' }}</span>
      </button>

      <div class="api-status" :class="statusClass" :title="`API status: ${apiStatus}`">
        <span class="status-dot"></span>
        <span class="status-label">{{ apiStatus }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  apiStatus: string;
  showObjectTree: boolean;
  ghostingEnabled: boolean;
  placementMode: boolean;
}>();

defineEmits<{
  'toggle-tree': [];
  'toggle-ghosting': [];
  'toggle-overview': [];
  'toggle-placement': [];
}>();

const statusClass = computed(() => {
  if (props.apiStatus === 'offline') return 'offline';
  if (props.apiStatus === 'checking...') return 'checking';
  return 'online';
});
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  gap: 1rem;
  flex-shrink: 0;
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

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.8rem;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 500;
  font-size: 0.82rem;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.toolbar-btn:hover {
  color: var(--text);
  background: var(--surface-2);
  border-color: var(--text-faint);
}

.toolbar-btn.active {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.toggle-state {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-faint);
}

.toolbar-btn.active .toggle-state {
  background: var(--accent);
  color: white;
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
