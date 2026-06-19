<template>
  <aside class="placements-panel">
    <div class="panel-header">
      <span>Sensor Placements</span>
      <span v-if="pointSensors.length" class="count-badge">{{ pointSensors.length }}</span>
    </div>

    <div v-if="!pointSensors.length" class="panel-empty">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      <p>No sensor placements yet</p>
    </div>

    <ul v-else class="placements-list">
      <li
        v-for="point in pointSensors"
        :key="point.placementId"
        class="placement-item"
        :class="{ selected: point.placementId === selectedPlacementId }"
      >
        <template v-if="confirmingId !== point.placementId">
          <button
            class="placement-main"
            @click="$emit('select', point.placementId)"
            :aria-pressed="point.placementId === selectedPlacementId"
            :title="point.sensorId || 'Unlinked placement'"
          >
            <span class="state-dot" :class="dotClass(point)"></span>
            <span class="placement-label" :class="{ unlinked: !point.sensorId }">
              {{ point.sensorId || 'Unlinked' }}
            </span>
            <span v-if="reading(point)" class="placement-val">
              {{ reading(point)!.value }} {{ reading(point)!.unit }}
            </span>
          </button>
          <button
            class="placement-delete"
            @click="confirmingId = point.placementId"
            aria-label="Delete placement"
            title="Delete placement"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </template>

        <div v-else class="placement-confirm">
          <span class="confirm-text">Delete?</span>
          <button class="confirm-cancel" @click="confirmingId = null">Cancel</button>
          <button class="confirm-delete" @click="remove(point.placementId)">Delete</button>
        </div>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';
import type { SensorPoint, SensorReading } from '../../types';

defineProps<{
  selectedPlacementId: string | null;
}>();

defineEmits<{
  'select': [placementId: string];
}>();

const sensorStore = useSensorStore();
const { pointSensors, sensorData } = storeToRefs(sensorStore);

const confirmingId = ref<string | null>(null);

function reading(point: SensorPoint): SensorReading | undefined {
  if (!point.sensorId) return undefined;
  return sensorData.value[point.sensorId];
}

function dotClass(point: SensorPoint): string {
  if (!point.sensorId) return 'unlinked';
  const data = reading(point);
  if (data?.isCritical) return 'critical';
  if (data?.isWarning) return 'warning';
  return 'ok';
}

function remove(placementId: string): void {
  confirmingId.value = null;
  sensorStore.removePointSensor(placementId);
}
</script>

<style scoped>
.placements-panel {
  width: 250px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.count-badge {
  font-size: 0.68rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-muted);
  letter-spacing: normal;
}

.panel-empty {
  padding: 2rem 1rem;
  color: var(--text-faint);
  font-size: 0.82rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.panel-empty p {
  margin: 0;
}

.placements-list {
  list-style: none;
  padding: 0.25rem;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.placement-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: var(--radius-sm);
  border-left: 2px solid transparent;
  margin-bottom: 0.1rem;
}

.placement-item.selected {
  background: var(--accent-soft);
  border-left-color: var(--accent);
}

.placement-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: left;
  transition: color 0.12s ease;
}

.placement-item:hover .placement-main {
  color: var(--text);
}

.placement-item.selected .placement-main {
  color: var(--accent);
}

.state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.state-dot.ok {
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

.state-dot.unlinked {
  background: var(--accent);
}

.placement-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
}

.placement-label.unlinked {
  font-family: inherit;
  font-style: italic;
  color: var(--text-faint);
}

.placement-val {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.placement-delete {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 0.35rem;
  padding: 0;
  background: transparent;
  color: var(--text-faint);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease, background 0.12s ease;
}

.placement-item:hover .placement-delete,
.placement-delete:focus-visible {
  opacity: 1;
}

.placement-delete:hover {
  color: var(--danger);
  background: var(--surface-2);
}

.placement-confirm {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
}

.confirm-text {
  flex: 1;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.confirm-cancel,
.confirm-delete {
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.confirm-cancel {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
}

.confirm-cancel:hover {
  color: var(--text);
  background: var(--surface-2);
  border-color: var(--text-faint);
}

.confirm-delete {
  background: var(--danger);
  color: white;
  border: 1px solid var(--danger);
}

.confirm-delete:hover {
  filter: brightness(1.1);
}
</style>
