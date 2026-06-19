<template>
  <div class="widget">
    <h3>{{ title }}</h3>
    <div class="widget-body" :class="{ 'center-content': center }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  center?: boolean;
}>();
</script>

<style scoped>
.widget {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.widget:hover {
  border-color: var(--border-strong);
}

.widget h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.widget h3::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.widget-body {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

.center-content {
  justify-content: center;
  align-items: center;
  color: var(--text-faint);
  text-align: center;
}
</style>
