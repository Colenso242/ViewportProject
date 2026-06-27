<template>
  <section class="widget" :style="{ '--widget-accent': accent }">
    <header class="widget-head">
      <span v-if="$slots.icon" class="widget-icon"><slot name="icon" /></span>
      <h3>{{ title }}</h3>
      <span v-if="$slots.meta" class="widget-meta"><slot name="meta" /></span>
    </header>
    <div class="widget-body" :class="{ 'center-content': center }">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    center?: boolean;
    /** Accent colour for the top edge + header icon. */
    accent?: string;
  }>(),
  { accent: 'var(--accent)' }
);
</script>

<style scoped>
.widget {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, var(--surface) 0%, #0e1525 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

/* A quiet "live instrument" cue: a thin accent edge along the top. */
.widget::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, var(--widget-accent), transparent 65%);
  opacity: 0.85;
}

.widget:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.widget-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.widget-icon {
  display: inline-flex;
  align-items: center;
  color: var(--widget-accent);
}

.widget-head h3 {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-muted);
}

.widget-meta {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
}

.widget-body {
  flex: 1;
  min-height: 0;
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

@media (prefers-reduced-motion: reduce) {
  .widget {
    transition: border-color 0.18s ease;
  }
  .widget:hover {
    transform: none;
  }
}
</style>
