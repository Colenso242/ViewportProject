<template>
  <header class="toolbar">
    <h1>3D Model Viewer</h1>
    <div class="toolbar-controls">
      <button @click="$emit('toggle-tree')" class="toolbar-btn">
        {{ showObjectTree ? '✕' : '☰' }} Objects
      </button>
      <small>API status: {{ apiStatus }}</small>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  apiStatus: string;
  showObjectTree: boolean;
}>();

defineEmits<{
  'toggle-tree': [];
}>();
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  gap: 1rem;
}

.toolbar h1 {
  margin: 0;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toolbar-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.toolbar-btn {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.toolbar-btn:hover {
  background: #2563eb;
}
</style>

