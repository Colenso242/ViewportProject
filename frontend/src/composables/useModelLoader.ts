import * as THREE from 'three';
import { storeToRefs } from 'pinia';
import { useSceneStore } from '../stores/useSceneStore';
import type { ModelManager } from '../utils/ModelManager';

interface ModelLoaderDeps {
  getModelManager: () => ModelManager;
  getScene: () => THREE.Scene;
  fitCameraToModel: (model: THREE.Object3D) => void;
  buildInteractionMaterials: (model: THREE.Object3D) => void;
  clearInteractionMaterials: () => void;
  deselectObject: () => void;
  attachMarkers: (model: THREE.Object3D) => void;
  detachMarkers: () => void;
  loadMarkersForModel: (modelId: string) => Promise<void>;
}

/**
 * Orchestrates loading a model from dropped files: groups the dropped files by
 * base name, tears down any previous model, drives the loading-status UI, and
 * wires the freshly loaded model into materials, markers, and the camera.
 */
export function useModelLoader(deps: ModelLoaderDeps) {
  const {
    getModelManager, getScene, fitCameraToModel,
    buildInteractionMaterials, clearInteractionMaterials,
    deselectObject, attachMarkers, detachMarkers, loadMarkersForModel
  } = deps;

  const sceneStore = useSceneStore();
  const { currentModel } = storeToRefs(sceneStore);

  async function handleDrop(event: DragEvent): Promise<void> {
    sceneStore.isDragging = false;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const fileMap = new Map<string, { [key: string]: File }>();
    for (const file of Array.from(files)) {
      const baseName = file.name.replace(/\.(obj|mtl|glb|gltf|ifc)$/i, '');
      if (!fileMap.has(baseName)) fileMap.set(baseName, {});
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext) fileMap.get(baseName)![ext] = file;
    }

    for (const [, group] of fileMap) {
      const manager = getModelManager();
      try {
        const mainFile = group.ifc || group.obj || group.glb || group.gltf;
        if (!mainFile) continue;

        sceneStore.setLoading('loading', `Loading ${mainFile.name}...`);
        manager.onImportProgress = (percent, stage) => {
          const verb = stage === 'parse' ? 'Parsing' : 'Reading';
          sceneStore.setLoading('loading', `${verb} ${mainFile.name}… ${percent}%`);
        };

        if (currentModel.value) {
          detachMarkers();
          clearInteractionMaterials();
          manager.removeModel('dropped-model');
          getScene().remove(currentModel.value);
          currentModel.value = null;
        }

        const model = await manager.loadModelFromFiles('dropped-model', mainFile, group.mtl);
        manager.onImportProgress = null;
        currentModel.value = model;
        buildInteractionMaterials(model);

        // Stable per-file identifier; keys the persisted sensor placements.
        const modelId = `${mainFile.name}:${mainFile.size}`;
        sceneStore.currentModelId = modelId;
        attachMarkers(model);
        await loadMarkersForModel(modelId);

        sceneStore.setLoading('success', `Loaded: ${mainFile.name}`);
        setTimeout(() => sceneStore.setLoading(null), 2000);

        fitCameraToModel(model);
        deselectObject();
        break;
      } catch (error) {
        manager.onImportProgress = null;
        sceneStore.setLoading('error', `Failed: ${error}`);
        setTimeout(() => sceneStore.setLoading(null), 3000);
      }
    }
  }

  return { handleDrop };
}
