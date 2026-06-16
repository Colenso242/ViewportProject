<template>
  <section
    ref="viewportElement"
    class="viewport"
    aria-label="3D viewport"
    @dragover.prevent="$emit('drag-over')"
    @dragleave.prevent="$emit('drag-leave')"
    @drop.prevent="$emit('drop', $event)"
    @click="$emit('click', $event)"
    @mousemove="$emit('pointer-move', $event)"
    @mouseleave="$emit('pointer-leave')"
    :class="{ 'dragging': isDragging, 'placing': placementMode }"
  >
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-zone">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <path d="M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        <p>Drop your 3D model here</p>
        <small>Supported: .obj (+ .mtl), .glb, .gltf, .ifc</small>
      </div>
    </div>

    <div v-else-if="!hasModel" class="empty-hint">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <path d="M3.3 7 12 12l8.7-5M12 22V12"/>
      </svg>
      <p>Drag &amp; drop a 3D model to get started</p>
      <small>.obj (+ .mtl) &middot; .glb &middot; .gltf &middot; .ifc</small>
    </div>

    <slot name="info"></slot>
    <slot name="overlay"></slot>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const viewportElement = ref<HTMLElement | null>(null);

defineProps<{
  isDragging: boolean;
  hasModel?: boolean;
  placementMode?: boolean;
}>();

defineEmits<{
  'drag-over': [];
  'drag-leave': [];
  'drop': [event: DragEvent];
  'click': [event: MouseEvent];
  'pointer-move': [event: MouseEvent];
  'pointer-leave': [];
}>();

defineExpose({
  viewportElement
});
</script>

<style scoped>
.viewport {
  position: relative;
  flex: 1;
  border: none;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 40%, #141d31 0%, #0a0f1c 100%);
}

.viewport.placing,
.viewport.placing :deep(canvas) {
  cursor: crosshair;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(79, 143, 247, 0.06);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
  padding: 1.5rem;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 2.5rem 4rem;
  border: 2px dashed var(--accent);
  border-radius: var(--radius-lg);
  background: rgba(11, 17, 32, 0.7);
  color: var(--accent);
  text-align: center;
}

.drop-zone p {
  margin: 0.5rem 0 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
}

.drop-zone small {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  pointer-events: none;
  z-index: 5;
  color: var(--text-faint);
  text-align: center;
}

.empty-hint p {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.empty-hint small {
  font-size: 0.78rem;
}
</style>
