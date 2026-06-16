import * as THREE from 'three';
import { Ref } from 'vue';

export function useRaycaster(cameraRef: Ref<THREE.PerspectiveCamera | null>, currentModel: Ref<THREE.Object3D | null>) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function pickIntersection(event: MouseEvent, viewportEl: HTMLElement | undefined | null): THREE.Intersection | null {
    if (!viewportEl || !currentModel.value || !cameraRef.value) return null;

    const rect = viewportEl.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, cameraRef.value);

    const intersects = raycaster.intersectObject(currentModel.value, true);
    return intersects[0] ?? null;
  }

  function pickObject(event: MouseEvent, viewportEl: HTMLElement | undefined | null): THREE.Object3D | null {
    return pickIntersection(event, viewportEl)?.object ?? null;
  }

  return { pickObject, pickIntersection };
}

