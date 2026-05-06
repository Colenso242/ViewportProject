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
    :class="{ 'dragging': isDragging }"
  >
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-hint">
        <p>Drop your 3D model here</p>
        <small>Supported: .obj (+ .mtl), .glb, .gltf</small>
      </div>
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
  background: #111111;
}

.viewport.dragging {
  background-color: rgba(59, 130, 246, 0.05);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.drop-hint {
  text-align: center;
  pointer-events: none;
}

.drop-hint p {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
}

.drop-hint small {
  display: block;
  color: #94a3b8;
  font-size: 0.875rem;
}
</style>
