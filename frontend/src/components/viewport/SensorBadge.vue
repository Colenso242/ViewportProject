<template>
  <div
    class="sensor-badge"
    :class="{ 'is-critical': sensor.data?.isCritical, 'is-warning': sensor.data?.isWarning }"
    :style="{ left: `${sensor.x}px`, top: `${sensor.y}px`, transform: `translate(-50%, -50%)` }"
    v-show="sensor.visible"
  >
    <span class="state-dot" :class="{ critical: sensor.data?.isCritical, warning: sensor.data?.isWarning && !sensor.data?.isCritical }"></span>
    <div class="sensor-info">
      <span class="sensor-id">{{ sensor.sensorId }}</span>
      <span v-if="sensor.data" class="sensor-val">
        {{ sensor.data.value }} {{ sensor.data.unit }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MappedSensor } from '../../types';

defineProps<{
  sensor: MappedSensor;
}>();
</script>

<style scoped>
.sensor-badge {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(11, 17, 32, 0.85);
  border: 1px solid var(--border-strong);
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(6px);
  will-change: transform;
  font-size: 0.75rem;
  color: var(--text);
  transition: opacity 0.2s;
}

.sensor-badge.is-critical {
  border-color: var(--danger);
  background: rgba(127, 29, 29, 0.9);
  animation: pulse-critical 1.5s infinite;
}

.sensor-badge.is-warning {
  border-color: var(--warning);
  background: rgba(120, 53, 15, 0.9);
  animation: pulse-warning 2s infinite;
}

.state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--success);
  box-shadow: 0 0 5px var(--success);
}

.state-dot.warning {
  background: var(--warning);
  box-shadow: 0 0 5px var(--warning);
}

.state-dot.critical {
  background: var(--danger);
  box-shadow: 0 0 5px var(--danger);
}

@keyframes pulse-critical {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@keyframes pulse-warning {
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3); }
  70% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
}

.sensor-info {
  display: flex;
  flex-direction: column;
}

.sensor-id {
  color: var(--text-muted);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sensor-val {
  font-weight: 700;
  font-family: var(--font-mono);
  font-size: 0.78rem;
}
</style>
