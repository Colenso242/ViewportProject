<template>
  <Transition name="undo-toast">
    <div v-if="actionToast" class="undo-toast" role="status">
      <span class="undo-msg">{{ actionToast.message }}</span>
      <button class="undo-action" @click="handleUndo">Undo</button>
      <button class="undo-close" aria-label="Dismiss" @click="dismiss">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useSceneStore } from '../../stores/useSceneStore';
import { useSensorStore } from '../../stores/useSensorStore';

const sceneStore = useSceneStore();
const sensorStore = useSensorStore();
const { actionToast } = storeToRefs(sceneStore);

function handleUndo(): void {
  sensorStore.undo();
  sceneStore.dismissActionToast();
}

function dismiss(): void {
  sceneStore.dismissActionToast();
}
</script>

<style scoped>
.undo-toast {
  position: fixed;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.55rem 0.6rem 0.55rem 1rem;
  background: var(--surface-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 0.85rem;
  color: var(--text);
  z-index: 1000;
}

.undo-msg {
  white-space: nowrap;
}

.undo-action {
  padding: 0.25rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s ease;
}

.undo-action:hover {
  background: var(--accent-soft);
}

.undo-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.undo-close:hover {
  color: var(--text);
  background: var(--surface-2);
}

/* Slide up from the bottom edge. */
.undo-toast-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.undo-toast-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.undo-toast-enter-from,
.undo-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (prefers-reduced-motion: reduce) {
  .undo-toast-enter-active,
  .undo-toast-leave-active {
    transition: opacity 0.15s ease;
  }
  .undo-toast-enter-from,
  .undo-toast-leave-to {
    transform: translateX(-50%);
  }
}
</style>
