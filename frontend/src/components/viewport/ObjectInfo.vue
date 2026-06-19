<template>
  <Transition name="hud-fade">
    <div v-if="hoveredObject && !selectedObject" class="object-info" :class="status">
      <span class="info-eyebrow">{{ friendlyKind }}</span>
      <strong class="info-name">{{ hoveredObject.name || 'Object' }}</strong>

      <div v-if="hoveredSensorId" class="info-sensor">
        <span class="status-dot" :class="status"></span>
        <span class="sensor-id">{{ hoveredSensorId }}</span>
        <span v-if="hoveredReading" class="sensor-reading">
          {{ formatValue(hoveredReading.value) }} {{ hoveredReading.unit }}
        </span>
      </div>

      <span class="info-hint">Click to select</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';

const props = defineProps<{
  selectedObject: THREE.Object3D | null;
  hoveredObject?: THREE.Object3D | null;
}>();

const { sensorMappings, sensorData } = storeToRefs(useSensorStore());

const friendlyKind = computed(() => {
  const obj = props.hoveredObject;
  if (!obj) return '';
  if ((obj as THREE.Mesh).isMesh) return 'Component';
  if (obj.type === 'Group' || obj.type === 'Object3D' || obj.type === 'Scene') return 'Group';
  return obj.type;
});

const hoveredSensorId = computed(() =>
  props.hoveredObject ? (sensorMappings.value[props.hoveredObject.uuid] || null) : null
);

const hoveredReading = computed(() =>
  hoveredSensorId.value ? sensorData.value[hoveredSensorId.value] : null
);

// Empty when the object carries no sensor, so the card stays visually neutral.
const status = computed(() => {
  const r = hoveredReading.value;
  if (!r) return '';
  if (r.isCritical) return 'critical';
  if (r.isWarning) return 'warning';
  return 'ok';
});

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
</script>

<style scoped>
.object-info {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.7rem 0.85rem;
  background: rgba(11, 17, 32, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-strong);
  /* Left edge carries the sensor's status; neutral when there's no sensor. */
  border-left: 2px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  pointer-events: none;
  z-index: 15;
}

.object-info.ok { border-left-color: var(--success); }
.object-info.warning { border-left-color: var(--warning); }
.object-info.critical { border-left-color: var(--danger); }

.info-eyebrow {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--text-faint);
}

.info-name {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text);
  word-break: break-word;
}

.info-sensor {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.info-sensor .sensor-id {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.info-sensor .sensor-reading {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-faint);
}

.status-dot.ok { background: var(--success); box-shadow: 0 0 5px var(--success); }
.status-dot.warning { background: var(--warning); box-shadow: 0 0 5px var(--warning); }
.status-dot.critical { background: var(--danger); box-shadow: 0 0 5px var(--danger); }

.info-hint {
  margin-top: 0.45rem;
  font-size: 0.7rem;
  font-style: italic;
  color: var(--text-faint);
}

/* Quick fade-up — hover changes fast, so this stays subtle. */
.hud-fade-enter-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.hud-fade-leave-active {
  transition: opacity 0.1s ease;
}
.hud-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.hud-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .hud-fade-enter-active,
  .hud-fade-leave-active {
    transition: opacity 0.1s ease;
  }
  .hud-fade-enter-from {
    transform: none;
  }
}
</style>
