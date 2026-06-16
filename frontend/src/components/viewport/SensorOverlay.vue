<template>
  <div class="sensor-overlay-container">
    <div
      v-for="item in mappedSensors"
      :key="item.uuid"
      class="sensor-badge"
      :class="{ 'is-critical': item.data?.isCritical, 'is-warning': item.data?.isWarning }"
      :style="{ left: `${item.x}px`, top: `${item.y}px`, transform: `translate(-50%, -50%)` }"
      v-show="item.visible"
    >
      <span class="state-dot" :class="{ critical: item.data?.isCritical, warning: item.data?.isWarning && !item.data?.isCritical }"></span>
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
import type { SensorPoint } from '../../types';

const props = defineProps<{
  camera: THREE.Camera | null;
  viewportEl: HTMLElement | null;
  currentModel: THREE.Object3D | null;
  sensorMappings: Record<string, string>;
  sensorData: Record<string, any>;
  pointSensors?: SensorPoint[];
  getPointWorldPosition?: (placementId: string, target: THREE.Vector3) => THREE.Vector3 | null;
}>();

interface MappedSensor {
  uuid: string;
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

// Clear cache when model changes
watch(() => props.currentModel, () => {
  meshPositionCache.clear();
});

function getMeshWorldPosition(uuid: string): THREE.Vector3 | null {
  if (!props.currentModel) return null;

  // 1. O(1) Lookup: Check cache first to avoid expensive scene traversal and Box3 calculation
  if (meshPositionCache.has(uuid)) {
    return meshPositionCache.get(uuid)!.clone();
  }

  let targetNode: THREE.Object3D | null = null;
  props.currentModel.traverse((child) => {
    if (child.uuid === uuid) {
      targetNode = child;
    }
  });

  if (!targetNode) return null;

  const vector = new THREE.Vector3();

  const box = new THREE.Box3().setFromObject(targetNode);
  box.getCenter(vector);

  // Cache the result
  meshPositionCache.set(uuid, vector.clone());
  return vector;
}

function updatePositions() {
  if (!props.camera || !props.viewportEl || !props.currentModel) {
    animationFrameId = requestAnimationFrame(updatePositions);
    return;
  }

  // 2. Throttle updates: Project coordinates at 30 fps instead of 60+ fps
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

  const projectToScreen = (key: string, pos: THREE.Vector3) => {
    // Project 3D vector to 2D screen coordinate
    pos.project(props.camera!);

    // After projection, NDC z must stay within [-1, 1] to be inside the
    // camera's near/far clipping planes.
    const isOutsideDepthRange = pos.z < -1 || pos.z > 1;
    if (isOutsideDepthRange) {
      newPositions[key] = { x: 0, y: 0, visible: false };
      return;
    }

    newPositions[key] = {
      x: (pos.x * widthHalf) + widthHalf,
      y: -(pos.y * heightHalf) + heightHalf,
      visible: true
    };
  };

  for (const [uuid, sensorId] of Object.entries(props.sensorMappings)) {
    if (!sensorId) continue;

    const pos = getMeshWorldPosition(uuid);
    if (!pos) continue;
    projectToScreen(uuid, pos);
  }

  if (props.pointSensors && props.getPointWorldPosition) {
    const worldPos = new THREE.Vector3();
    for (const point of props.pointSensors) {
      if (!point.sensorId) continue;
      const pos = props.getPointWorldPosition(point.placementId, worldPos);
      if (!pos) continue;
      projectToScreen(`point:${point.placementId}`, pos.clone());
    }
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
  const objectBadges = Object.entries(props.sensorMappings)
    .filter(([_, sensorId]) => !!sensorId)
    .map(([uuid, sensorId]) => {
      const pos = projectedPositions.value[uuid] || { x: 0, y: 0, visible: false };
      return {
        uuid,
        sensorId,
        x: pos.x,
        y: pos.y,
        visible: pos.visible,
        data: props.sensorData[sensorId]
      };
    });

  const pointBadges = (props.pointSensors || [])
    .filter(point => !!point.sensorId)
    .map(point => {
      const key = `point:${point.placementId}`;
      const pos = projectedPositions.value[key] || { x: 0, y: 0, visible: false };
      return {
        uuid: key,
        sensorId: point.sensorId,
        x: pos.x,
        y: pos.y,
        visible: pos.visible,
        data: props.sensorData[point.sensorId]
      };
    });

  return [...objectBadges, ...pointBadges];
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

