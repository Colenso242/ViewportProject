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
    if (files) await loadFiles(Array.from(files));
  }

  /** Load a model from files chosen via the OS file picker. */
  async function loadFromInput(files: FileList | null): Promise<void> {
    if (files) await loadFiles(Array.from(files));
  }

  /** Load the bundled OBJ sample so first-time users have something to explore. */
  async function loadSampleModel(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      const [obj, mtl] = await Promise.all([
        fetch(`${base}models/obj/testcube.obj`).then((r) => r.blob()),
        fetch(`${base}models/obj/testcube.mtl`).then((r) => r.blob()).catch(() => null),
      ]);
      const sample = [new File([obj], 'testcube.obj')];
      if (mtl) sample.push(new File([mtl], 'testcube.mtl'));
      await loadFiles(sample);
    } catch {
      sceneStore.setLoading('error', 'Could not load the sample model.');
    }
  }

  async function loadFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;

    const fileMap = new Map<string, { [key: string]: File }>();
    for (const file of files) {
      const baseName = file.name.replace(/\.(obj|mtl|glb|gltf|ifc)$/i, '');
      if (!fileMap.has(baseName)) fileMap.set(baseName, {});
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext) fileMap.get(baseName)![ext] = file;
    }

    let foundSupported = false;
    for (const [, group] of fileMap) {
      const manager = getModelManager();
      try {
        const mainFile = group.ifc || group.obj || group.glb || group.gltf;
        if (!mainFile) continue;
        foundSupported = true;

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
        // Errors persist until dismissed so the user can read why a load failed.
        sceneStore.setLoading('error', `Failed: ${error}`);
      }
    }

    // Nothing in the drop/selection was a model we can open.
    if (!foundSupported) {
      sceneStore.setLoading('error', 'Unsupported file — use .obj, .glb, .gltf or .ifc');
    }
  }

  return { handleDrop, loadFromInput, loadSampleModel };
}
