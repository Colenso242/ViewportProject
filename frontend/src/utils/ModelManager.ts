import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
// Type-only import: the value is loaded lazily via dynamic import (see
// ensureIFCLoader) so web-ifc-three + its WASM glue are code-split out of the
// main bundle and only fetched when an IFC file is actually opened.
import type { IFCLoader } from 'web-ifc-three';

type MTLMaterialCreator = ReturnType<MTLLoader['parse']>;

type ModelFormat = 'glb' | 'gltf' | 'obj' | 'ifc';

export type ImportProgressCallback = (percent: number, stage: 'download' | 'parse') => void;

// web-ifc entity type codes for geometry the monitoring view never shows.
// IfcSpace = invisible room volumes (loaded by web-ifc-three by default);
// IfcOpeningElement = door/window voids already cut into walls via booleans.
// Skipping them avoids tessellating throwaway meshes. Stable web-ifc codes.
const IFC_SPACE = 3856911033;
const IFC_OPENING_ELEMENT = 3588315303;

/**
 * Per-format loading strategy: each entry knows how to load its format from a
 * URL or from dropped File objects, so callers dispatch via a table lookup
 * instead of branching on the format.
 */
interface ModelLoadStrategy {
  fromUrl(url: string, name: string): Promise<THREE.Object3D>;
  fromFiles(name: string, mainFile: File, mtlFile?: File | null): Promise<THREE.Object3D>;
}

export class ModelManager {
  private scene: THREE.Scene;
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;
  private mtlLoader: MTLLoader;
  private ifcLoader: IFCLoader | null = null;
  private ifcLoaderReady: Promise<IFCLoader> | null = null;
  private ifcModelIds: Map<string, number> = new Map();
  private models: Map<string, THREE.Object3D>;
  private animations: Map<string, THREE.AnimationClip[]>;
  private mixers: Map<string, THREE.AnimationMixer>;
  private readonly loadStrategies: Record<ModelFormat, ModelLoadStrategy>;

  /** Maps a file extension to its model format. */
  private static readonly EXTENSION_FORMATS: Record<string, ModelFormat> = {
    glb: 'glb',
    gltf: 'gltf',
    obj: 'obj',
    ifc: 'ifc',
  };

  /** Reports import progress (file download and IFC geometry parsing). */
  onImportProgress: ImportProgressCallback | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
    this.mtlLoader = new MTLLoader();
    this.models = new Map();
    this.animations = new Map();
    this.mixers = new Map();

    this.loadStrategies = {
      glb: {
        fromUrl: (url, name) => this.loadGLTFModel(url, name, 'glb'),
        fromFiles: (name, file) => this.loadGLTFModelFromFile(name, file, 'glb'),
      },
      gltf: {
        fromUrl: (url, name) => this.loadGLTFModel(url, name, 'gltf'),
        fromFiles: (name, file) => this.loadGLTFModelFromFile(name, file, 'gltf'),
      },
      obj: {
        fromUrl: (url, name) => this.loadOBJModel(url, name),
        fromFiles: (name, file, mtl) => this.loadOBJModelFromFiles(name, file, mtl),
      },
      ifc: {
        fromUrl: (url, name) => this.loadIFCModel(url, name),
        fromFiles: (name, file) => this.loadIFCModelFromFile(name, file),
      },
    };
  }

  private ensureIFCLoader(): Promise<IFCLoader> {
    if (!this.ifcLoaderReady) {
      this.ifcLoaderReady = (async () => {
        // Dynamic import: keeps web-ifc-three out of the main bundle until the
        // first IFC import, so GLB/OBJ-only sessions never pay for it.
        const { IFCLoader } = await import('web-ifc-three');
        const loader = new IFCLoader();
        const manager = loader.ifcManager;

        // Parse IFC files off the main thread so big imports don't freeze the UI.
        try {
          await manager.useWebWorkers(true, '/IFCWorker.js');
        } catch (error) {
          console.warn('IFC web worker unavailable, falling back to main-thread parsing.', error);
        }

        await manager.setWasmPath('/');

        // Georeferenced models sit millions of units from the origin; moving
        // them to the origin avoids float-precision jitter and speeds up
        // the bounds computation that follows. USE_FAST_BOOLS accelerates the
        // boolean ops used to cut openings (doors/windows) — the dominant cost
        // on real BIM models — at a negligible accuracy tradeoff. Coarser
        // CIRCLE_SEGMENTS (defaults 5/8/12) cut triangle counts on curved
        // geometry; smoothness isn't critical for a monitoring viewport.
        try {
          await manager.applyWebIfcConfig({
            COORDINATE_TO_ORIGIN: true,
            USE_FAST_BOOLS: true,
            CIRCLE_SEGMENTS_LOW: 4,
            CIRCLE_SEGMENTS_MEDIUM: 6,
            CIRCLE_SEGMENTS_HIGH: 9,
          });
        } catch (error) {
          console.warn('Could not apply web-ifc config:', error);
        }

        // Don't generate geometry for categories the twin view never renders.
        try {
          await manager.parser.setupOptionalCategories({
            [IFC_SPACE]: false,
            [IFC_OPENING_ELEMENT]: false,
          });
        } catch (error) {
          console.warn('Could not configure IFC optional categories:', error);
        }

        manager.setOnProgress((event) => {
          if (this.onImportProgress && event.total > 0) {
            this.onImportProgress(Math.round((event.loaded / event.total) * 100), 'parse');
          }
        });

        this.ifcLoader = loader;
        return loader;
      })();
    }
    return this.ifcLoaderReady;
  }

  private reportDownloadProgress(event: ProgressEvent): void {
    if (this.onImportProgress && event.lengthComputable && event.total > 0) {
      this.onImportProgress(Math.round((event.loaded / event.total) * 100), 'download');
    }
  }

  /**
   * Scale the model to ~2 world units and center it on the origin.
   * Bounds are computed once; the post-scale center is derived arithmetically
   * (scaling happens about the origin), avoiding a second full traversal
   * of the geometry — significant for large models.
   */
  private normalizeModelTransform(model: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim <= 0) return;

    const scale = 2 / maxDim;
    model.scale.multiplyScalar(scale);

    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    model.position.sub(center);
    model.updateMatrixWorld(true);
  }

  /**
   * Detect model format from URL
   */
  private getModelFormat(url: string): ModelFormat {
    const normalizedUrl = url.toLowerCase().split('#')[0].split('?')[0];
    const extension = normalizedUrl.split('.').pop() ?? '';
    const format = ModelManager.EXTENSION_FORMATS[extension];
    if (!format) {
      throw new Error(`Unsupported format: .${extension}. Supported: .glb, .gltf, .obj, .ifc`);
    }
    return format;
  }

  /**
   * Load a 3D model (GLTF/GLB or OBJ format)
   */
  async loadModel(url: string, name: string): Promise<THREE.Object3D> {
    try {
      const format = this.getModelFormat(url);
      return await this.loadStrategies[format].fromUrl(url, name);
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Load GLTF/GLB model
   */
  private loadGLTFModel(url: string, name: string, format: ModelFormat): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf: GLTF) => {
          const model = gltf.scene;
          model.userData.name = name;
          model.userData.format = format;

          // Handle animations if present
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            this.mixers.set(name, mixer);
            this.animations.set(name, gltf.animations);
          }

          this.scene.add(model);
          this.models.set(name, model);
          resolve(model);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Load OBJ model with optional MTL
   */
  private async loadOBJModel(url: string, name: string): Promise<THREE.Object3D> {
    try {
      // Extract base path for MTL file
      const basePath = url.substring(0, url.lastIndexOf('/') + 1);
      const fileName = url.substring(url.lastIndexOf('/') + 1);
      const fileNameWithoutExt = fileName.replace('.obj', '');
      const mtlUrl = basePath + fileNameWithoutExt + '.mtl';

      // Try to load MTL file
      let materials: MTLMaterialCreator | null = null;
      try {
        materials = await new Promise((resolve, reject) => {
          this.mtlLoader.load(mtlUrl, resolve, undefined, reject);
        });
        if (materials) {
          materials.preload();
          this.objLoader.setMaterials(materials);
        }
      } catch {
        console.warn(`MTL file not found: ${mtlUrl}. Using default material.`);
        // Continue without MTL - will use default material
      }

      // Load OBJ file
      return new Promise((resolve, reject) => {
        this.objLoader.load(
          url,
          (model: any) => {
            model.userData.name = name;
            model.userData.format = 'obj';

            // Apply default material if no MTL was loaded
            if (!materials) {
              const defaultMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.3,
                roughness: 0.7
              });

              model.traverse((child: any) => {
                if ((child as THREE.Mesh).isMesh) {
                  (child as THREE.Mesh).material = defaultMaterial;
                }
              });
            }

            this.normalizeModelTransform(model);

            this.scene.add(model);
            this.models.set(name, model);
            resolve(model);
          },
          (event) => this.reportDownloadProgress(event),
          reject
        );
      });
    } catch (error) {
      throw new Error(`Failed to load OBJ model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Warm the lazily-loaded IFC loader (its JS chunk + worker/WASM setup) ahead
   * of first use, e.g. during browser idle time, so the first .ifc import does
   * not wait on the dynamic import. Fire-and-forget and idempotent — a later
   * real import reuses the same cached loader.
   */
  prefetchIFCLoader(): void {
    void this.ensureIFCLoader().catch(() => {});
  }

  private async loadIFCModel(url: string, name: string): Promise<THREE.Object3D> {
    const ifcLoader = await this.ensureIFCLoader();
    return new Promise((resolve, reject) => {
      ifcLoader.load(
        url,
        (ifcModel: any) => {
          ifcModel.userData.name = name;
          ifcModel.userData.format = 'ifc';

          if (ifcModel.modelID !== undefined) {
            this.ifcModelIds.set(name, ifcModel.modelID);
          }

          this.normalizeModelTransform(ifcModel);

          this.scene.add(ifcModel);
          this.models.set(name, ifcModel);
          resolve(ifcModel);
        },
        (event) => this.reportDownloadProgress(event),
        reject
      );
    });
  }

  private async loadIFCModelFromFile(name: string, file: File): Promise<THREE.Object3D> {
    const url = URL.createObjectURL(file);
    try {
      return await this.loadIFCModel(url, name);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Load a model from File objects (for drag & drop)
   */
  async loadModelFromFiles(name: string, mainFile: File, mtlFile?: File | null): Promise<THREE.Object3D> {
    try {
      const format = this.getModelFormat(mainFile.name);
      return await this.loadStrategies[format].fromFiles(name, mainFile, mtlFile);
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Load GLTF/GLB model from File object
   */
  private loadGLTFModelFromFile(name: string, file: File, format: ModelFormat): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        this.gltfLoader.parse(
          arrayBuffer,
          '',
          (gltf: GLTF) => {
            const model = gltf.scene;
            model.userData.name = name;
            model.userData.format = format;

            // Handle animations if present
            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              this.mixers.set(name, mixer);
              this.animations.set(name, gltf.animations);
            }

            this.normalizeModelTransform(model);

            this.scene.add(model);
            this.models.set(name, model);
            resolve(model);
          },
          reject
        );
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Load OBJ model from File objects
   */
  private async loadOBJModelFromFiles(name: string, objFile: File, mtlFile?: File | null): Promise<THREE.Object3D> {
    try {
      let materials: MTLMaterialCreator | null = null;

      // Load MTL if provided
      if (mtlFile) {
        try {
          materials = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const mtlText = event.target?.result as string;
              try {
                const parsedMaterials = this.mtlLoader.parse(mtlText, '');
                parsedMaterials.preload();
                resolve(parsedMaterials);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error('Failed to read MTL file'));
            reader.readAsText(mtlFile);
          });
          if (materials) {
            this.objLoader.setMaterials(materials);
          }
        } catch {
          console.warn(`Failed to load MTL file`);
          materials = null;
        }
      }

      // Load OBJ file
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const objText = event.target?.result as string;

          try {
            const model = this.objLoader.parse(objText);
            model.userData.name = name;
            model.userData.format = 'obj';

            // Apply default material if no MTL was loaded
            if (!materials) {
              const defaultMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.3,
                roughness: 0.7
              });

              model.traverse((child: any) => {
                if ((child as THREE.Mesh).isMesh) {
                  (child as THREE.Mesh).material = defaultMaterial;
                }
              });
            }

            this.normalizeModelTransform(model);

            this.scene.add(model);
            this.models.set(name, model);


            resolve(model);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read OBJ file'));
        reader.readAsText(objFile);
      });
    } catch (error) {
      throw new Error(`Failed to load OBJ model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a loaded model by name
   */
  getModel(name: string): THREE.Object3D | undefined {
    return this.models.get(name);
  }

  /**
   * Get animations for a model
   */
  getAnimations(name: string): THREE.AnimationClip[] | undefined {
    return this.animations.get(name);
  }

  /**
   * Whether a model has an animation mixer (i.e. its nodes can move at runtime).
   */
  hasAnimations(name: string): boolean {
    return this.mixers.has(name);
  }

  /**
   * Play an animation on a model (GLTF/GLB only)
   */
  playAnimation(modelName: string, animationIndex = 0): THREE.AnimationAction | null {
    const mixer = this.mixers.get(modelName);
    const animations = this.animations.get(modelName);

    if (mixer && animations && animations[animationIndex]) {
      const action = mixer.clipAction(animations[animationIndex]);
      action.play();
      return action;
    }

    console.warn(`No animation at index ${animationIndex} for model ${modelName}`);
    return null;
  }

  /**
   * Stop all animations for a model
   */
  stopAnimations(modelName: string): void {
    const mixer = this.mixers.get(modelName);
    if (mixer) {
      mixer.stopAllAction();
    }
  }

  /**
   * Remove a model and clean up resources
   */
  removeModel(name: string): void {
    const model = this.models.get(name);
    if (model) {
      this.scene.remove(model);

      const ifcModelId = this.ifcModelIds.get(name);
      if (ifcModelId !== undefined && this.ifcLoader) {
        // close() is typed void here but returns a promise in worker mode.
        Promise.resolve(this.ifcLoader.ifcManager.close(ifcModelId) as unknown).catch(() => {});
        this.ifcModelIds.delete(name);
      }

      // Dispose geometries and materials
      model.traverse((child: any) => {
        const meshChild = child as THREE.Mesh;
        if (meshChild.geometry) {
          meshChild.geometry.dispose();
        }
        if (meshChild.material) {
          if (Array.isArray(meshChild.material)) {
            meshChild.material.forEach((mat: any) => mat.dispose());
          } else {
            meshChild.material.dispose();
          }
        }
      });

      // Dispose mixer and animations
      const mixer = this.mixers.get(name);
      if (mixer) {
        mixer.stopAllAction();
        this.mixers.delete(name);
      }

      this.animations.delete(name);
      this.models.delete(name);
    }
  }

  /**
   * Update all animations (call each frame)
   */
  updateAnimations(deltaTime: number): void {
    this.mixers.forEach((mixer) => {
      mixer.update(deltaTime);
    });
  }

  /**
   * Dispose all models and clean up resources
   */
  disposeAll(): void {
    this.models.forEach((_, name) => {
      this.removeModel(name);
    });
  }
}





