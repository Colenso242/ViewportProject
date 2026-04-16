<template>
  <div v-if="loadingStatus" class="loading-indicator" :class="loadingStatus.type">
    <p>{{ loadingStatus.message }}</p>
  </div>
</template>

<script setup lang="ts">
interface LoadingStatus {
  type: 'loading' | 'success' | 'error';
  message: string;
}

defineProps<{
  loadingStatus: LoadingStatus | null;
}>();
</script>

<style scoped>
.loading-indicator {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  color: white;
  font-weight: 500;
  animation: slideIn 0.3s ease;
  z-index: 20;
}

.loading-indicator p {
  margin: 0;
}

.loading-indicator.loading {
  background: #3b82f6;
}

.loading-indicator.success {
  background: #10b981;
}

.loading-indicator.error {
  background: #ef4444;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>

