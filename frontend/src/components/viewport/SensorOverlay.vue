<template>
  <div class="sensor-overlay-container">
    <div
      v-for="item in mappedSensors"
      :key="item.stableId"
      class="sensor-badge"
      :class="{ 'is-critical': item.data?.isCritical, 'is-warning': item.data?.isWarning }"
      :style="{ left: `${item.x}px`, top: `${item.y}px`, transform: `translate(-50%, -50%)` }"
      v-show="item.visible"
    >
      <div v-if="item.data?.isCritical" class="warning-icon">🔴</div>
      <div v-else-if="item.data?.isWarning" class="warning-icon">🟡</div>
      <div class="sensor-info">
        <span class="sensor-id">{{ item.sensorId }}</span>
        <span v-if="item.data" class="sensor-val">
          {{ item.data.value }} {{ item.data.unit }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps<{
  camera: THREE.Camera | null;
  viewportEl: HTMLElement | null;
  currentModel: THREE.Object3D | null;
  meshLookup: Map<string, THREE.Object3D>;
  sensorMappings: Record<string, string>;
  sensorData: Record<string, any>;
}>();

interface MappedSensor {
  stableId: string;
  sensorId: string;
  x: number;
  y: number;
  visible: boolean;
  data: any;
}

const projectedPositions = ref<Record<string, { x: number, y: number, visible: boolean }>>({});
const meshPositionCache = new Map<string, THREE.Vector3>();
let animationFrameId = 0;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 1000 / 30; // 30fps position updates

watch(() => props.currentModel, () => {
  meshPositionCache.clear();
});

function getMeshWorldPosition(stableId: string): THREE.Vector3 | null {
  const cached = meshPositionCache.get(stableId);
  if (cached) return cached.clone();

  const target = props.meshLookup.get(stableId);
  if (!target) return null;

  const vector = new THREE.Vector3();
  new THREE.Box3().setFromObject(target).getCenter(vector);
  meshPositionCache.set(stableId, vector.clone());
  return vector;
}

function updatePositions() {
  if (!props.camera || !props.viewportEl || !props.currentModel) {
    animationFrameId = requestAnimationFrame(updatePositions);
    return;
  }

  const now = performance.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL) {
    animationFrameId = requestAnimationFrame(updatePositions);
    return;
  }
  lastUpdateTime = now;

  const widthHalf = props.viewportEl.clientWidth / 2;
  const heightHalf = props.viewportEl.clientHeight / 2;

  if (widthHalf === 0 || heightHalf === 0) {
    animationFrameId = requestAnimationFrame(updatePositions);
    return;
  }

  const newPositions: Record<string, { x: number, y: number, visible: boolean }> = {};

  for (const [stableId, sensorId] of Object.entries(props.sensorMappings)) {
    if (!sensorId) continue;

    const pos = getMeshWorldPosition(stableId);
    if (!pos) continue;

    pos.project(props.camera);

    // After projection, NDC z must stay within [-1, 1] to be inside the
    // camera's near/far clipping planes.
    const isOutsideDepthRange = pos.z < -1 || pos.z > 1;
    if (isOutsideDepthRange) {
      newPositions[stableId] = { x: 0, y: 0, visible: false };
      continue;
    }

    newPositions[stableId] = {
      x: (pos.x * widthHalf) + widthHalf,
      y: -(pos.y * heightHalf) + heightHalf,
      visible: true
    };
  }

  projectedPositions.value = newPositions;
  animationFrameId = requestAnimationFrame(updatePositions);
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(updatePositions);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
});

const mappedSensors = computed<MappedSensor[]>(() => {
  return Object.entries(props.sensorMappings)
    .filter(([_, sensorId]) => !!sensorId)
    .map(([stableId, sensorId]) => {
      const pos = projectedPositions.value[stableId] || { x: 0, y: 0, visible: false };
      return {
        stableId,
        sensorId,
        x: pos.x,
        y: pos.y,
        visible: pos.visible,
        data: props.sensorData[sensorId]
      };
    });
});

</script>

<style scoped>
.sensor-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
}

.sensor-badge {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #334155;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
  will-change: transform;
  font-size: 0.75rem;
  color: #f8fafc;
  transition: opacity 0.2s;
}

.sensor-badge.is-critical {
  border-color: #ef4444;
  background: rgba(127, 29, 29, 0.9);
  animation: pulse-critical 1.5s infinite;
}

.sensor-badge.is-warning {
  border-color: #fbbf24;
  background: rgba(120, 53, 15, 0.9);
  animation: pulse-warning 2s infinite;
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

.warning-icon {
  color: #ef4444;
  font-weight: bold;
  font-size: 0.875rem;
}

.sensor-info {
  display: flex;
  flex-direction: column;
}

.sensor-id {
  color: #94a3b8;
  font-size: 0.65rem;
  text-transform: uppercase;
}

.sensor-val {
  font-weight: bold;
  font-family: monospace;
}
</style>
