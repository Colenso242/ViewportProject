import * as THREE from 'three';
import { storeToRefs } from 'pinia';
import { useSceneStore } from '../stores/useSceneStore';

type PickObject = (event: MouseEvent, viewportEl: HTMLElement | undefined | null) => THREE.Object3D | null;
type ApplyMaterials = (hovered: THREE.Object3D | null, selected: THREE.Object3D | null) => void;

interface ObjectInteractionDeps {
  pickObject: PickObject;
  applyInteractionMaterials: ApplyMaterials;
  getViewportEl: () => HTMLElement | undefined | null;
}

/**
 * Owns hover/selection state for objects in the viewport: it raycasts against
 * the model and keeps the scene store's hovered/selected refs in sync, applying
 * the matching interaction materials on every change.
 */
export function useObjectInteraction(deps: ObjectInteractionDeps) {
  const { pickObject, applyInteractionMaterials, getViewportEl } = deps;

  const sceneStore = useSceneStore();
  const { selectedObject, hoveredObject } = storeToRefs(sceneStore);

  function selectObject(obj: THREE.Object3D): void {
    hoveredObject.value = obj;
    selectedObject.value = obj;
    applyInteractionMaterials(hoveredObject.value, selectedObject.value);
  }

  function deselectObject(): void {
    hoveredObject.value = null;
    selectedObject.value = null;
    applyInteractionMaterials(hoveredObject.value, selectedObject.value);
  }

  function selectAt(event: MouseEvent): void {
    const hit = pickObject(event, getViewportEl());
    if (hit) selectObject(hit);
    else deselectObject();
  }

  function handlePointerMove(event: MouseEvent): void {
    const hit = pickObject(event, getViewportEl());
    if (hit) {
      if (hoveredObject.value !== hit) {
        hoveredObject.value = hit;
        applyInteractionMaterials(hoveredObject.value, selectedObject.value);
      }
    } else if (hoveredObject.value !== null) {
      hoveredObject.value = null;
      applyInteractionMaterials(hoveredObject.value, selectedObject.value);
    }
  }

  function handlePointerLeave(): void {
    if (hoveredObject.value !== null) {
      hoveredObject.value = null;
      applyInteractionMaterials(hoveredObject.value, selectedObject.value);
    }
  }

  return { selectObject, deselectObject, selectAt, handlePointerMove, handlePointerLeave };
}
