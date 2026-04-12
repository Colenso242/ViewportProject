# Drag & Drop Code Reference

## Quick Reference Guide

### For Users: How to Use

```javascript
// Simply drag and drop files onto the viewport in your browser
// Supported files:
// - .obj (with optional .mtl)
// - .glb
// - .gltf

// The model will automatically:
// 1. Load and parse
// 2. Center in the viewport
// 3. Scale to fit the view
// 4. Position the camera
```

### For Developers: API Reference

#### Loading Models from Files

```javascript
// Basic usage in App.vue
const model = await modelManager.loadModelFromFiles(
  'my-model',        // unique name
  objFile,           // File object
  mtlFile            // Optional MTL File object
);
```

#### Complete Drop Handler Example

```javascript
async function handleDrop(event) {
  isDragging.value = false;
  const files = event.dataTransfer.files;

  if (files.length === 0) return;

  // Group files by base name
  const fileMap = new Map();
  for (let file of files) {
    const baseName = file.name.replace(/\.(obj|mtl|glb|gltf)$/i, '');
    if (!fileMap.has(baseName)) {
      fileMap.set(baseName, {});
    }
    const ext = file.name.split('.').pop().toLowerCase();
    fileMap.get(baseName)[ext] = file;
  }

  // Load the first model file found
  for (let [name, files] of fileMap) {
    try {
      const mainFile = files.obj || files.glb || files.gltf;
      if (!mainFile) continue;

      loadingStatus.value = { type: 'loading', message: `Loading ${mainFile.name}...` };

      // Remove previous model
      if (currentModel) {
        modelManager.removeModel('dropped-model');
        scene.remove(currentModel);
      }

      // Load the model
      const model = await modelManager.loadModelFromFiles(
        'dropped-model',
        mainFile,
        files.mtl
      );
      currentModel = model;

      loadingStatus.value = { type: 'success', message: `Loaded: ${mainFile.name}` };
      setTimeout(() => {
        loadingStatus.value = null;
      }, 2000);

      // Fit camera to model
      fitCameraToModel(model);
      break;
    } catch (error) {
      console.error('Error loading model:', error);
      loadingStatus.value = { type: 'error', message: `Failed to load model: ${error.message}` };
      setTimeout(() => {
        loadingStatus.value = null;
      }, 3000);
    }
  }
}
```

### ModelManager New Methods

#### 1. loadModelFromFiles(name, mainFile, mtlFile = null)

```javascript
/**
 * Load a model from File objects (for drag & drop)
 * @param {string} name - Unique identifier for the model
 * @param {File} mainFile - The main model file (.obj, .glb, or .gltf)
 * @param {File} mtlFile - Optional MTL file for OBJ models
 * @returns {Promise<THREE.Object3D>} - Loaded model
 */
async loadModelFromFiles(name, mainFile, mtlFile = null) {
  try {
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
```

#### 2. loadGLTFModelFromFile(name, file, format)

```javascript
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
```

#### 3. loadOBJModelFromFiles(name, objFile, mtlFile = null)

```javascript
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
```

### Vue Template Example

```vue
<template>
  <section 
    ref="viewport" 
    class="viewport" 
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    :class="{ 'dragging': isDragging }"
  >
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-hint">
        <p>Drop your 3D model here</p>
        <small>Supported: .obj, .glb, .gltf (+ .mtl for OBJ)</small>
      </div>
    </div>
  </section>

  <div v-if="loadingStatus" class="loading-indicator" :class="loadingStatus.type">
    <p>{{ loadingStatus.message }}</p>
  </div>
</template>
```

### Vue Style Example

```vue
<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: calc(100vh - 4rem);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.viewport.dragging {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.drop-hint {
  text-align: center;
  pointer-events: none;
}

.drop-hint p {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
}

.drop-hint small {
  display: block;
  color: #94a3b8;
  font-size: 0.875rem;
}

.loading-indicator {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  color: white;
  font-weight: 500;
  animation: slideIn 0.3s ease;
  z-index: 20;
}

.loading-indicator.loading {
  background: #3b82f6;
}

.loading-indicator.success {
  background: #10b981;
}

.loading-indicator.error {
  background: #ef4444;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
```

### Common Tasks

#### Get the loaded model
```javascript
const model = modelManager.getModel('dropped-model');
```

#### Check if model has animations
```javascript
const animations = modelManager.getAnimations('dropped-model');
if (animations && animations.length > 0) {
  console.log(`Model has ${animations.length} animations`);
}
```

#### Play an animation
```javascript
modelManager.playAnimation('dropped-model', 0); // First animation
```

#### Stop animations
```javascript
modelManager.stopAnimations('dropped-model');
```

#### Remove a model
```javascript
modelManager.removeModel('dropped-model');
```

#### Get model transform
```javascript
const model = modelManager.getModel('dropped-model');
console.log('Position:', model.position);
console.log('Rotation:', model.rotation);
console.log('Scale:', model.scale);
```

#### Modify model color (if using default material)
```javascript
const model = modelManager.getModel('dropped-model');
model.traverse((child) => {
  if (child.isMesh && child.material) {
    child.material.color.setHex(0xff0000); // Red
  }
});
```

#### Get model bounding box
```javascript
const model = modelManager.getModel('dropped-model');
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
console.log('Model dimensions:', { x: size.x, y: size.y, z: size.z });
```

### Error Handling Examples

```javascript
// Try-catch with detailed error info
try {
  const model = await modelManager.loadModelFromFiles(
    'test-model',
    objFile,
    mtlFile
  );
} catch (error) {
  console.error('Load failed:', {
    message: error.message,
    stack: error.stack,
    fileName: objFile.name
  });

  // Show user-friendly error
  loadingStatus.value = {
    type: 'error',
    message: `Failed to load: ${error.message}`
  };
}
```

### File Detection Examples

```javascript
// Detect file type from File object
function getFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.obj')) return 'obj';
  if (name.endsWith('.mtl')) return 'mtl';
  if (name.endsWith('.glb')) return 'glb';
  if (name.endsWith('.gltf')) return 'gltf';
  return 'unknown';
}

// Check if file is a valid model
function isModelFile(file) {
  const type = getFileType(file);
  return ['obj', 'glb', 'gltf'].includes(type);
}

// Group files intelligently
function groupFiles(files) {
  const groups = new Map();
  
  for (let file of files) {
    const base = file.name.replace(/\.(obj|mtl|glb|gltf)$/i, '');
    const type = getFileType(file);
    
    if (!groups.has(base)) {
      groups.set(base, { name: base, files: {} });
    }
    groups.get(base).files[type] = file;
  }
  
  return Array.from(groups.values());
}
```

### Testing in Console

```javascript
// Test model loading in browser console
async function testModelLoad() {
  try {
    // Get first file from input
    const input = document.querySelector('input[type="file"]');
    const file = input.files[0];
    
    if (!file) {
      console.error('No file selected');
      return;
    }
    
    console.time('model-load');
    const model = await modelManager.loadModelFromFiles('test', file);
    console.timeEnd('model-load');
    
    console.log('Model loaded:', model);
    return model;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
testModelLoad();
```

---

This reference guide provides quick access to all the code and APIs needed to work with the drag & drop feature.

