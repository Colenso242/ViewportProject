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
    <Transition name="hint-fade">
      <div v-if="placementMode && hasModel && !isDragging" class="placement-hint">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span>Click anywhere on the model to place a sensor point</span>
        <kbd>Esc</kbd>
        <span class="hint-dim">to cancel</span>
      </div>
    </Transition>

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
      <button class="empty-cta" type="button" @click="openPicker">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <path d="M3.3 7 12 12l8.7-5M12 22V12"/>
        </svg>
        <p>Drag &amp; drop a 3D model, or <span class="browse-link">browse</span></p>
        <small>.obj (+ .mtl) &middot; .glb &middot; .gltf &middot; .ifc</small>
      </button>
      <button class="sample-btn" type="button" @click="$emit('load-sample')">Load sample model</button>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="file-input"
      accept=".obj,.glb,.gltf,.ifc,.mtl"
      multiple
      @change="onFileChange"
    />

    <slot name="info"></slot>
    <slot name="overlay"></slot>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const viewportElement = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

defineProps<{
  isDragging: boolean;
  hasModel?: boolean;
  placementMode?: boolean;
}>();

const emit = defineEmits<{
  'drag-over': [];
  'drag-leave': [];
  'drop': [event: DragEvent];
  'click': [event: MouseEvent];
  'pointer-move': [event: MouseEvent];
  'pointer-leave': [];
  'select-files': [files: FileList];
  'load-sample': [];
}>();

function openPicker(): void {
  fileInput.value?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) emit('select-files', input.files);
  // Reset so picking the same file again still fires change.
  input.value = '';
}

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

.placement-hint {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  background: rgba(11, 17, 32, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--accent);
  border-radius: 999px;
  box-shadow: var(--shadow-md);
  color: var(--text);
  font-size: 0.82rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 16;
}

.placement-hint > svg {
  color: var(--accent);
  flex-shrink: 0;
}

.placement-hint kbd {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--border-strong);
  border-bottom-width: 2px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-muted);
}

.placement-hint .hint-dim {
  color: var(--text-muted);
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@media (prefers-reduced-motion: reduce) {
  .hint-fade-enter-active,
  .hint-fade-leave-active {
    transition: opacity 0.18s ease;
  }
  .hint-fade-enter-from,
  .hint-fade-leave-to {
    transform: translateX(-50%);
  }
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
  gap: 0.75rem;
  pointer-events: none;
  z-index: 5;
  color: var(--text-faint);
  text-align: center;
}

/* The drop zone doubles as a click target that opens the OS file picker. */
.empty-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1.75rem 2.5rem;
  background: transparent;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-faint);
  cursor: pointer;
  pointer-events: auto;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.empty-cta:hover {
  border-color: var(--accent);
  color: var(--text-muted);
  background: rgba(79, 143, 247, 0.04);
}

.empty-cta p {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.empty-cta small {
  font-size: 0.78rem;
}

.browse-link {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sample-btn {
  pointer-events: auto;
  padding: 0.4rem 0.9rem;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.sample-btn:hover {
  color: var(--text);
  border-color: var(--accent);
  background: var(--surface-2);
}

.file-input {
  display: none;
}
</style>
