import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type * as THREE from 'three';

export const useSceneStore = defineStore('sceneStore', () => {
  const showObjectTree = ref<boolean>(false);
  const showOverview = ref<boolean>(false);
  const ghostingEnabled = ref<boolean>(true);
  const isDragging = ref<boolean>(false);
  const placementMode = ref<boolean>(false);
  // Stable identifier of the loaded model (file name + size); keys sensor placements.
  const currentModelId = ref<string>('');

  const loadingStatus = ref<{ type: 'loading' | 'success' | 'error'; message: string } | null>(null);

  // Store Three.js objects as shallow refs to avoid proxying overhead
  const selectedObject = shallowRef<THREE.Object3D | null>(null);
  const hoveredObject = shallowRef<THREE.Object3D | null>(null);
  const currentModel = shallowRef<THREE.Object3D | null>(null);

  function setLoading(type: 'loading' | 'success' | 'error' | null, message = '') {
    if (!type) {
      loadingStatus.value = null;
      return;
    }
    loadingStatus.value = { type, message };
  }

  function toggleObjectTree() {
    showObjectTree.value = !showObjectTree.value;
  }

  function toggleGhosting() {
    ghostingEnabled.value = !ghostingEnabled.value;
  }

  function toggleOverview() {
    showOverview.value = !showOverview.value;
  }

  function togglePlacementMode() {
    placementMode.value = !placementMode.value;
  }

  return {
    showObjectTree,
    showOverview,
    ghostingEnabled,
    isDragging,
    placementMode,
    currentModelId,
    loadingStatus,
    selectedObject,
    hoveredObject,
    currentModel,
    setLoading,
    toggleObjectTree,
    toggleGhosting,
    toggleOverview,
    togglePlacementMode
  };
});

