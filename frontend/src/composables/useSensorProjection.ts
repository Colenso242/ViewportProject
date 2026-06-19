import * as THREE from 'three';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { SensorPoint } from '../types';

export interface ProjectedPosition {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Live values the projection loop reads each frame. Pass the component's
 * reactive `props` object so model changes are tracked and the loop always
 * sees current camera/viewport state.
 */
export interface SensorProjectionSource {
  camera: THREE.Camera | null;
  viewportEl: HTMLElement | null;
  currentModel: THREE.Object3D | null;
  sensorMappings: Record<string, string>;
  pointSensors?: SensorPoint[];
  getPointWorldPosition?: (placementId: string, target: THREE.Vector3) => THREE.Vector3 | null;
  // When true, the model's nodes move at runtime (animation mixer), so mesh
  // world positions must be recomputed every frame instead of cached.
  animated?: boolean;
}

const UPDATE_INTERVAL = 1000 / 30; // 30fps position updates

/**
 * Projects mapped sensors and point sensors from 3D world space to 2D screen
 * coordinates on a throttled requestAnimationFrame loop, caching static mesh
 * positions to avoid repeated scene traversal.
 */
export function useSensorProjection(source: SensorProjectionSource) {
  const projectedPositions = ref<Record<string, ProjectedPosition>>({});
  const meshPositionCache = new Map<string, THREE.Vector3>();
  // uuid -> node, built once per model so per-frame lookups are O(1) instead of
  // a full scene traversal per sensor (matters for animated models, which can't
  // use the position cache below).
  const nodeMap = new Map<string, THREE.Object3D>();
  let animationFrameId = 0;
  let lastUpdateTime = 0;

  // Rebuild the lookup maps whenever the model changes.
  watch(() => source.currentModel, (model) => {
    meshPositionCache.clear();
    nodeMap.clear();
    if (model) {
      // IFC models have very high node counts and their sensor uuids only ever
      // reference meshes, so map mesh nodes alone there to bound memory. Other
      // formats keep every node, since a sensor can map to a non-mesh group.
      const meshOnly = model.userData.format === 'ifc';
      model.traverse((child) => {
        if (!meshOnly || (child as THREE.Mesh).isMesh) {
          nodeMap.set(child.uuid, child);
        }
      });
    }
  }, { immediate: true });

  function getMeshWorldPosition(uuid: string): THREE.Vector3 | null {
    if (!source.currentModel) return null;

    // 1. O(1) Lookup: Check the cached world position to avoid the Box3 calculation.
    // Skip the cache for animated models, whose node positions change every frame.
    if (!source.animated && meshPositionCache.has(uuid)) {
      return meshPositionCache.get(uuid)!.clone();
    }

    // O(1) node lookup via the per-model map, instead of traversing the whole
    // scene for every sensor on every frame.
    const targetNode = nodeMap.get(uuid);
    if (!targetNode) return null;

    const vector = new THREE.Vector3();

    const box = new THREE.Box3().setFromObject(targetNode);
    box.getCenter(vector);

    // Cache the result for static models only; animated nodes move each frame.
    if (!source.animated) {
      meshPositionCache.set(uuid, vector.clone());
    }
    return vector;
  }

  function updatePositions() {
    if (!source.camera || !source.viewportEl || !source.currentModel) {
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

    const widthHalf = source.viewportEl.clientWidth / 2;
    const heightHalf = source.viewportEl.clientHeight / 2;

    if (widthHalf === 0 || heightHalf === 0) {
      animationFrameId = requestAnimationFrame(updatePositions);
      return;
    }

    const newPositions: Record<string, ProjectedPosition> = {};

    const projectToScreen = (key: string, pos: THREE.Vector3) => {
      // Project 3D vector to 2D screen coordinate
      pos.project(source.camera!);

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

    for (const [uuid, sensorId] of Object.entries(source.sensorMappings)) {
      if (!sensorId) continue;

      const pos = getMeshWorldPosition(uuid);
      if (!pos) continue;
      projectToScreen(uuid, pos);
    }

    if (source.pointSensors && source.getPointWorldPosition) {
      const worldPos = new THREE.Vector3();
      for (const point of source.pointSensors) {
        if (!point.sensorId) continue;
        const pos = source.getPointWorldPosition(point.placementId, worldPos);
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

  return { projectedPositions };
}
