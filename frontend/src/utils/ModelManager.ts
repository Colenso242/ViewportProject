import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { IFCLoader } from 'web-ifc-three';

type MTLMaterialCreator = ReturnType<MTLLoader['parse']>;

type ModelFormat = 'glb' | 'gltf' | 'obj' | 'ifc';

export type ImportProgressCallback = (percent: number, stage: 'download' | 'parse') => void;

export class ModelManager {
  private scene: THREE.Scene;
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;
  private mtlLoader: MTLLoader;
  private ifcLoader: IFCLoader;
  private ifcLoaderReady: Promise<void> | null = null;
  private ifcModelIds: Map<string, number> = new Map();
  private models: Map<string, THREE.Object3D>;
  private animations: Map<string, THREE.AnimationClip[]>;
  private mixers: Map<string, THREE.AnimationMixer>;

  /** Reports import progress (file download and IFC geometry parsing). */
  onImportProgress: ImportProgressCallback | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
    this.mtlLoader = new MTLLoader();
    this.ifcLoader = new IFCLoader();
    this.models = new Map();
    this.animations = new Map();
    this.mixers = new Map();
  }

  private initIFCLoader(): Promise<void> {
    if (!this.ifcLoaderReady) {
      this.ifcLoaderReady = (async () => {
        const manager = this.ifcLoader.ifcManager;

        // Parse IFC files off the main thread so big imports don't freeze the UI.
        try {
          await manager.useWebWorkers(true, '/IFCWorker.js');
        } catch (error) {
          console.warn('IFC web worker unavailable, falling back to main-thread parsing.', error);
        }

        await manager.setWasmPath('/');

        // Georeferenced models sit millions of units from the origin; moving
        // them to the origin avoids float-precision jitter and speeds up
        // the bounds computation that follows.
        try {
          await manager.applyWebIfcConfig({ COORDINATE_TO_ORIGIN: true });
        } catch (error) {
          console.warn('Could not apply web-ifc config:', error);
        }

        manager.setOnProgress((event) => {
          if (this.onImportProgress && event.total > 0) {
            this.onImportProgress(Math.round((event.loaded / event.total) * 100), 'parse');
          }
        });
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
    const extension = normalizedUrl.split('.').pop();
    if (extension === 'glb') return 'glb';
    if (extension === 'gltf') return 'gltf';
    if (extension === 'obj') return 'obj';
    if (extension === 'ifc') return 'ifc';
    throw new Error(`Unsupported format: .${extension}. Supported: .glb, .gltf, .obj, .ifc`);
  }

  /**
   * Load a 3D model (GLTF/GLB or OBJ format)
   */
  async loadModel(url: string, name: string): Promise<THREE.Object3D> {
    try {
      const format = this.getModelFormat(url);

      if (format === 'obj') return await this.loadOBJModel(url, name);
      if (format === 'ifc') return await this.loadIFCModel(url, name);
      return await this.loadGLTFModel(url, name, format);
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

  private async loadIFCModel(url: string, name: string): Promise<THREE.Object3D> {
    await this.initIFCLoader();
    return new Promise((resolve, reject) => {
      this.ifcLoader.load(
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
      const fileName = mainFile.name.toLowerCase();
      let format: ModelFormat = 'glb';
      if (fileName.endsWith('.obj')) format = 'obj';
      else if (fileName.endsWith('.gltf')) format = 'gltf';
      else if (fileName.endsWith('.glb')) format = 'glb';
      else if (fileName.endsWith('.ifc')) format = 'ifc';

      if (format === 'obj') return await this.loadOBJModelFromFiles(name, mainFile, mtlFile);
      if (format === 'ifc') return await this.loadIFCModelFromFile(name, mainFile);
      return await this.loadGLTFModelFromFile(name, mainFile, format);
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
   * Get animation mixer for a model
   * @deprecated This method is kept for future use but not currently used in the application
   */
  getMixer(name: string): THREE.AnimationMixer | undefined {
    return this.mixers.get(name);
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
      if (ifcModelId !== undefined) {
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








