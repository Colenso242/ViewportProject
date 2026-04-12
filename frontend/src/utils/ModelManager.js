import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export class ModelManager {
  constructor(scene) {
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
   * @param {string} url - Model file path
   * @returns {string} - 'glb', 'gltf', or 'obj'
   */
  getModelFormat(url) {
    const normalizedUrl = url.toLowerCase().split('#')[0].split('?')[0];
    const extension = normalizedUrl.split('.').pop();
    if (extension === 'glb') return 'glb';
    if (extension === 'gltf') return 'gltf';
    if (extension === 'obj') return 'obj';
    throw new Error(`Unsupported format: .${extension}. Supported: .glb, .gltf, .obj`);
  }

  /**
   * Load a 3D model (GLTF/GLB or OBJ format)
   * @param {string} url - Path to model file
   * @param {string} name - Unique identifier for the model
   * @param {object} options - Optional configuration
   * @returns {Promise<THREE.Object3D>} - Loaded model
   */
  async loadModel(url, name, options = {}) {
    try {
      const format = this.getModelFormat(url);

      if (format === 'obj') {
        return await this.loadOBJModel(url, name, options);
      } else {
        return await this.loadGLTFModel(url, name, format, options);
      }
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Load GLTF/GLB model
   * @private
   */
  async loadGLTFModel(url, name, format, options) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
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
   * @private
   */
  async loadOBJModel(url, name, options = {}) {
    try {
      // Extract base path for MTL file
      const basePath = url.substring(0, url.lastIndexOf('/') + 1);
      const fileName = url.substring(url.lastIndexOf('/') + 1);
      const fileNameWithoutExt = fileName.replace('.obj', '');
      const mtlUrl = basePath + fileNameWithoutExt + '.mtl';

      // Try to load MTL file
      let materials = null;
      try {
        materials = await new Promise((resolve, reject) => {
          this.mtlLoader.load(mtlUrl, resolve, undefined, reject);
        });
        materials.preload();
        this.objLoader.setMaterials(materials);
      } catch (mtlError) {
        console.warn(`MTL file not found: ${mtlUrl}. Using default material.`);
        // Continue without MTL - will use default material
      }

      // Load OBJ file
      return new Promise((resolve, reject) => {
        this.objLoader.load(
          url,
          (model) => {
            model.userData.name = name;
            model.userData.format = 'obj';

            // Apply default material if no MTL was loaded
            if (!materials) {
              const defaultMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.3,
                roughness: 0.7
              });

              model.traverse((child) => {
                if (child.isMesh) {
                  child.material = defaultMaterial;
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
      throw new Error(`Failed to load OBJ model: ${error.message}`);
    }
  }

  /**
   * Load a model from File objects (for drag & drop)
   * @param {string} name - Unique identifier for the model
   * @param {File} mainFile - The main model file (.obj, .glb, or .gltf)
   * @param {File} mtlFile - Optional MTL file for OBJ models
   * @returns {Promise<THREE.Object3D>} - Loaded model
   */
  async loadModelFromFiles(name, mainFile, mtlFile = null) {
    try {
      // Detect format from file name
      const fileName = mainFile.name.toLowerCase();
      let format = 'glb';
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
   * @private
   */
  async loadGLTFModelFromFile(name, file, format) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.gltfLoader.parse(
          event.target.result,
          '',
          (gltf) => {
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
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Load OBJ model from File objects
   * @private
   */
  async loadOBJModelFromFiles(name, objFile, mtlFile = null) {
    try {
      let materials = null;

      // Load MTL if provided
      if (mtlFile) {
        try {
          materials = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const mtlText = event.target.result;
              const mtlUrl = URL.createObjectURL(mtlFile);
              this.mtlLoader.parse(
                mtlText,
                mtlUrl.substring(0, mtlUrl.lastIndexOf('/') + 1),
                (parsedMaterials) => {
                  parsedMaterials.preload();
                  resolve(parsedMaterials);
                },
                reject
              );
            };
            reader.onerror = reject;
            reader.readAsText(mtlFile);
          });
          this.objLoader.setMaterials(materials);
        } catch (mtlError) {
          console.warn(`Failed to load MTL file:`, mtlError);
          materials = null;
        }
      }

      // Load OBJ file
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const objText = event.target.result;
          const objUrl = URL.createObjectURL(objFile);
          const basePath = objUrl.substring(0, objUrl.lastIndexOf('/') + 1);

          try {
            const model = this.objLoader.parse(objText, basePath);
            model.userData.name = name;
            model.userData.format = 'obj';

            // Apply default material if no MTL was loaded
            if (!materials) {
              const defaultMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.3,
                roughness: 0.7
              });

              model.traverse((child) => {
                if (child.isMesh) {
                  child.material = defaultMaterial;
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

            // Cleanup object URLs
            URL.revokeObjectURL(objUrl);

            resolve(model);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(objFile);
      });
    } catch (error) {
      throw new Error(`Failed to load OBJ model: ${error.message}`);
    }
   }

   /**
    * Get a loaded model by name
    */
   getModel(name) {
     return this.models.get(name);
   }

   /**
    * Get animations for a model
    */
  getAnimations(name) {
    return this.animations.get(name);
  }

  /**
   * Get animation mixer for a model
   */
  getMixer(name) {
    return this.mixers.get(name);
  }

  /**
   * Play an animation on a model (GLTF/GLB only)
   */
  playAnimation(modelName, animationIndex = 0) {
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
  stopAnimations(modelName) {
    const mixer = this.mixers.get(modelName);
    if (mixer) {
      mixer.stopAllAction();
    }
  }

  /**
   * Remove a model and clean up resources
   */
  removeModel(name) {
    const model = this.models.get(name);
    if (model) {
      this.scene.remove(model);

      // Dispose geometries and materials
      model.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
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
  updateAnimations(deltaTime) {
    this.mixers.forEach((mixer) => {
      mixer.update(deltaTime);
    });
  }

  /**
   * Dispose all models and clean up resources
   */
  disposeAll() {
    this.models.forEach((_, name) => {
      this.removeModel(name);
    });
  }
}
