import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

type MTLMaterialCreator = ReturnType<MTLLoader['parse']>;

type ModelFormat = 'glb' | 'gltf' | 'obj';

export class ModelManager {
  private scene: THREE.Scene;
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;
  private mtlLoader: MTLLoader;
  private models: Map<string, THREE.Object3D>;
  private animations: Map<string, THREE.AnimationClip[]>;
  private mixers: Map<string, THREE.AnimationMixer>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
    this.mtlLoader = new MTLLoader();
    this.models = new Map();
    this.animations = new Map();
    this.mixers = new Map();
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
    throw new Error(`Unsupported format: .${extension}. Supported: .glb, .gltf, .obj`);
  }

  /**
   * Load a 3D model (GLTF/GLB or OBJ format)
   */
  async loadModel(url: string, name: string): Promise<THREE.Object3D> {
    try {
      const format = this.getModelFormat(url);

      if (format === 'obj') {
        return await this.loadOBJModel(url, name);
      } else {
        return await this.loadGLTFModel(url, name, format);
      }
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

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);

            const scaledBox = new THREE.Box3().setFromObject(model);
            const center = scaledBox.getCenter(new THREE.Vector3());
            model.position.sub(center);

            this.scene.add(model);
            this.models.set(name, model);
            resolve(model);
          },
          undefined,
          reject
        );
      });
    } catch (error) {
      throw new Error(`Failed to load OBJ model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load a model from File objects (for drag & drop)
   */
  async loadModelFromFiles(name: string, mainFile: File, mtlFile?: File | null): Promise<THREE.Object3D> {
    try {
      // Detect format from file name
      const fileName = mainFile.name.toLowerCase();
      let format: ModelFormat = 'glb';
      if (fileName.endsWith('.obj')) format = 'obj';
      else if (fileName.endsWith('.gltf')) format = 'gltf';
      else if (fileName.endsWith('.glb')) format = 'glb';

      if (format === 'obj') {
        return await this.loadOBJModelFromFiles(name, mainFile, mtlFile);
      } else {
        return await this.loadGLTFModelFromFile(name, mainFile, format);
      }
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

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);

            const scaledBox = new THREE.Box3().setFromObject(model);
            const center = scaledBox.getCenter(new THREE.Vector3());
            model.position.sub(center);

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

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);

            const scaledBox = new THREE.Box3().setFromObject(model);
            const center = scaledBox.getCenter(new THREE.Vector3());
            model.position.sub(center);

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








