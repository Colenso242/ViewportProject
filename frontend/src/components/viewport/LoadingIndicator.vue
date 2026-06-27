<template>
  <Transition name="toast">
    <div v-if="loadingStatus" class="loading-indicator" :class="loadingStatus.type">
      <span v-if="loadingStatus.type === 'loading'" class="spinner"></span>
      <svg v-else-if="loadingStatus.type === 'success'" class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      <svg v-else class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <p>{{ loadingStatus.message }}</p>
      <button v-if="loadingStatus.type === 'error'" class="toast-close" @click="$emit('dismiss')" aria-label="Dismiss">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface LoadingStatus {
  type: 'loading' | 'success' | 'error';
  message: string;
}

defineProps<{
  loadingStatus: LoadingStatus | null;
}>();

defineEmits<{
  dismiss: [];
}>();
</script>

<style scoped>
.loading-indicator {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1.1rem;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-left-width: 3px;
  color: var(--text);
  font-weight: 500;
  font-size: 0.85rem;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  max-width: 360px;
}

.loading-indicator p {
  margin: 0;
}

.toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 0.25rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.toast-close:hover {
  color: var(--text);
  background: var(--surface-3);
}

.loading-indicator.loading {
  border-left-color: var(--accent);
}

.loading-indicator.success {
  border-left-color: var(--success);
}

.loading-indicator.success .status-icon {
  color: var(--success);
}

.loading-indicator.error {
  border-left-color: var(--danger);
}

.loading-indicator.error .status-icon {
  color: var(--danger);
}

.status-icon {
  flex-shrink: 0;
}

.spinner {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Slides in from the right on appear, and back out on dismiss. */
.toast-enter-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
  .spinner {
    animation: none;
  }
}
</style>
