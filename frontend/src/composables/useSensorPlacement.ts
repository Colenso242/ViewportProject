import * as THREE from 'three';
import { watch, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useSceneStore } from '../stores/useSceneStore';
import { useSensorStore } from '../stores/useSensorStore';
import { SensorPointMarkers } from '../utils/SensorPointMarkers';
import type { SensorPoint } from '../types';

type PickIntersection = (event: MouseEvent, viewportEl: HTMLElement | undefined | null) => THREE.Intersection | null;

interface SensorPlacementDeps {
  pickIntersection: PickIntersection;
  getViewportEl: () => HTMLElement | undefined | null;
  selectObject: (obj: THREE.Object3D) => void;
  deselectObject: () => void;
}

/**
 * Owns the sensor point placement feature: the marker overlay attached to the
 * model, placing new points from viewport clicks, exposing marker world
 * positions for the screen-space overlay, and keeping markers in sync with the
 * persisted point list.
 */
export function useSensorPlacement(deps: SensorPlacementDeps) {
  const { pickIntersection, getViewportEl, selectObject, deselectObject } = deps;

  const sceneStore = useSceneStore();
  const sensorStore = useSensorStore();
  const { currentModel, placementMode, selectedObject } = storeToRefs(sceneStore);
  const { pointSensors } = storeToRefs(sensorStore);

  const pointMarkers = new SensorPointMarkers();

  function getPointWorldPosition(placementId: string, target: THREE.Vector3): THREE.Vector3 | null {
    return pointMarkers.getWorldPosition(placementId, target);
  }

  function placeSensorPoint(worldPoint: THREE.Vector3): void {
    const model = currentModel.value;
    if (!model || !sceneStore.currentModelId) return;

    const local = model.worldToLocal(worldPoint.clone());
    const point: SensorPoint = {
      placementId: crypto.randomUUID(),
      modelId: sceneStore.currentModelId,
      sensorId: '',
      position: { x: local.x, y: local.y, z: local.z }
    };

    sceneStore.placementMode = false;
    void sensorStore.addPointSensor(point);
    pointMarkers.sync(pointSensors.value);

    // Select the new marker so the properties panel opens with the sensor picker.
    const marker = pointMarkers.getMarker(point.placementId);
    if (marker) selectObject(marker);
  }

  /**
   * Attempts to place a sensor point at the clicked location. Returns true when
   * the click was consumed for placement so the caller can skip selection.
   */
  function tryPlaceFromClick(event: MouseEvent): boolean {
    const model = currentModel.value;
    if (!(placementMode.value || event.shiftKey) || !model) return false;

    const intersection = pickIntersection(event, getViewportEl());
    if (intersection && !intersection.object.userData.isSensorPointMarker) {
      placeSensorPoint(intersection.point);
      return true;
    }
    return false;
  }

  // Selects a placement's marker by id (e.g. from the placements list panel)
  // so the properties panel opens and the marker highlights in the scene.
  function selectPlacement(placementId: string): void {
    const marker = pointMarkers.getMarker(placementId);
    if (marker) selectObject(marker);
  }

  function attachMarkers(model: THREE.Object3D): void {
    pointMarkers.attach(model);
  }

  function detachMarkers(): void {
    pointMarkers.detach();
  }

  async function loadMarkersForModel(modelId: string): Promise<void> {
    await sensorStore.loadPointSensors(modelId);
    pointMarkers.sync(pointSensors.value);
  }

  watch(pointSensors, (points) => {
    pointMarkers.sync(points);

    // Deselect markers whose placement was removed.
    const selectedPointId = selectedObject.value?.userData.sensorPointId;
    if (selectedPointId && !points.some(p => p.placementId === selectedPointId)) {
      deselectObject();
    }
  });

  onBeforeUnmount(() => {
    pointMarkers.dispose();
  });

  return {
    getPointWorldPosition,
    tryPlaceFromClick,
    selectPlacement,
    attachMarkers,
    detachMarkers,
    loadMarkersForModel
  };
}
