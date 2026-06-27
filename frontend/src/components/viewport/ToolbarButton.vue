<template>
  <button class="toolbar-btn" :class="{ active }" :disabled="disabled">
    <slot name="icon" />
    <slot />
    <span v-if="$slots.trailing" class="toggle-state"><slot name="trailing" /></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
  disabled?: boolean;
}>();
</script>

<style scoped>
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

.toolbar-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-2);
  border-color: var(--text-faint);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
</style>
