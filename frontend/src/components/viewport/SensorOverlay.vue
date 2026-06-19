<template>
  <div class="sensor-overlay-container">
    <SensorBadge
      v-for="item in mappedSensors"
      :key="item.uuid"
      :sensor="item"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as THREE from 'three';
import type { MappedSensor, SensorPoint, SensorReading } from '../../types';
import { useSensorProjection } from '../../composables/useSensorProjection';
import SensorBadge from './SensorBadge.vue';

const props = defineProps<{
  camera: THREE.Camera | null;
  viewportEl: HTMLElement | null;
  currentModel: THREE.Object3D | null;
  sensorMappings: Record<string, string>;
  sensorData: Record<string, SensorReading>;
  pointSensors?: SensorPoint[];
  getPointWorldPosition?: (placementId: string, target: THREE.Vector3) => THREE.Vector3 | null;
  // When true, the model's nodes move at runtime (animation mixer), so mesh
  // world positions must be recomputed every frame instead of cached.
  animated?: boolean;
}>();

const { projectedPositions } = useSensorProjection(props);

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
</style>
