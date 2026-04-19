<template>
  <div class="sensor-overlay-container">
    <div
      v-for="item in mappedSensors"
      :key="item.uuid"
      class="sensor-badge"
      :class="{ 'is-critical': item.data?.isCritical }"
      :style="{ transform: `translate(-50%, -50%) translate(${item.x}px, ${item.y}px)` }"
      v-show="item.visible"
    >
      <div v-if="item.data?.isCritical" class="warning-icon">⚠</div>
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
  sensorMappings: Record<string, string>;
  sensorData: Record<string, any>;
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
let animationFrameId = 0;

function getMeshWorldPosition(uuid: string): THREE.Vector3 | null {
  if (!props.currentModel) return null;

  let targetNode: THREE.Object3D | null = null;
  props.currentModel.traverse((child) => {
    if (child.uuid === uuid) {
      targetNode = child;
    }
  });

  if (!targetNode) return null;

  const vector = new THREE.Vector3();

  // If it's a mesh, get the bounding box center to look better
  if ((targetNode as THREE.Mesh).isMesh) {
    const box = new THREE.Box3().setFromObject(targetNode);
    box.getCenter(vector);
  } else {
    targetNode.getWorldPosition(vector);
  }

  return vector;
}

function updatePositions() {
  if (!props.camera || !props.viewportEl || !props.currentModel) {
    animationFrameId = requestAnimationFrame(updatePositions);
    return;
  }

  const widthHalf = props.viewportEl.clientWidth / 2;
  const heightHalf = props.viewportEl.clientHeight / 2;

  const newPositions: Record<string, { x: number, y: number, visible: boolean }> = {};

  for (const [uuid, sensorId] of Object.entries(props.sensorMappings)) {
    if (!sensorId) continue;

    const pos = getMeshWorldPosition(uuid);
    if (!pos) continue;

    // Project 3D vector to 2D screen coordinate
    pos.project(props.camera);

    // After projection, NDC z must stay within [-1, 1] to be inside the
    // camera's near/far clipping planes.
    const isOutsideDepthRange = pos.z < -1 || pos.z > 1;
    if (isOutsideDepthRange) {
      newPositions[uuid] = { x: 0, y: 0, visible: false };
      continue;
    }

    newPositions[uuid] = {
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
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
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

