// Example: How to use the ModelManager with different model formats

/**
 * ===== GLTF/GLB MODELS =====
 * 
 * Best for: Complex models, animations, optimized file size
 * Format: Binary (GLB) or text with separate files (GLTF)
 * Support: Animations, materials, textures
 */

async function loadGLBModel() {
  try {
    const model = await modelManager.loadModel('/models/character.glb', 'character');
    model.position.set(0, 0, 0);
    
    // Play animation if available
    const animations = modelManager.getAnimations('character');
    if (animations && animations.length > 0) {
      modelManager.playAnimation('character', 0);
    }
  } catch (error) {
    console.error('Failed to load GLB:', error);
  }
}


/**
 * ===== OBJ MODELS =====
 * 
 * Best for: Simple models, static meshes, wide compatibility
 * Format: Text-based geometry + optional MTL material file
 * Support: Static geometry, materials (if MTL provided), textures
 * Note: OBJ files don't support animations
 */

// Example 1: Simple OBJ without MTL (uses default gray material)
async function loadSimpleOBJ() {
  try {
    const model = await modelManager.loadModel('/models/cube.obj', 'cube');
    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);
  } catch (error) {
    console.error('Failed to load OBJ:', error);
  }
}

// Example 2: OBJ with MTL (same folder, matching filename)
// File structure: /models/obj/chair.obj + /models/obj/chair.mtl
async function loadOBJWithMaterial() {
  try {
    const model = await modelManager.loadModel('/models/obj/chair.obj', 'chair');
    
    // Auto-centers and scales the model
    model.position.set(0, 0, 0);
  } catch (error) {
    console.error('Failed to load OBJ with MTL:', error);
  }
}

// Example 3: Load multiple OBJ models
async function loadMultipleOBJs() {
  try {
    const models = [
      { url: '/models/obj/table.obj', name: 'table' },
      { url: '/models/obj/chair.obj', name: 'chair' },
      { url: '/models/obj/lamp.obj', name: 'lamp' }
    ];
    
    for (const { url, name } of models) {
      const model = await modelManager.loadModel(url, name);
      // Position each model
      model.position.x = Math.random() * 5 - 2.5;
    }
  } catch (error) {
    console.error('Failed to load models:', error);
  }
}


/**
 * ===== MIXED FORMAT USAGE =====
 * 
 * Load different formats based on availability
 */

async function loadAnyModel(format, filename, name) {
  try {
    let url;
    switch(format.toLowerCase()) {
      case 'glb':
        url = `/models/${filename}.glb`;
        break;
      case 'obj':
        url = `/models/obj/${filename}.obj`;
        break;
      case 'gltf':
        url = `/models/${filename}.gltf`;
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
    
    const model = await modelManager.loadModel(url, name);
    return model;
  } catch (error) {
    console.error(`Failed to load ${format} model:`, error);
    throw error;
  }
}


/**
 * ===== DIRECTORY STRUCTURE =====
 * 
 * Recommended organization:
 * 
 * frontend/public/models/
 * ├── character.glb          (GLB model, optimized)
 * ├── scene.glb              (GLB with animations)
 * ├── cube.obj               (Simple OBJ)
 * └── obj/
 *     ├── chair.obj          (OBJ + MTL pair)
 *     ├── chair.mtl
 *     ├── table.obj
 *     ├── table.mtl
 *     └── textures/          (Optional: for OBJ textures)
 */


/**
 * ===== TRANSFORMATION EXAMPLES =====
 * 
 * After loading any model, you can transform it:
 */

function transformModel(modelName) {
  const model = modelManager.getModel(modelName);
  if (!model) return;
  
  // Position
  model.position.set(0, 1, 0);
  
  // Rotation (in radians)
  model.rotation.y = Math.PI / 4;  // 45 degrees
  
  // Scale
  model.scale.set(2, 2, 2);  // 2x larger
}


/**
 * ===== CLEANUP =====
 */

function cleanup() {
  // Remove specific model
  modelManager.removeModel('chair');
  
  // Or remove all
  modelManager.disposeAll();
}


/**
 * ===== NOTES =====
 * 
 * GLB vs OBJ:
 * • GLB: Better for web (compressed, faster), supports animations
 * • OBJ: Better for interchange (universal), simpler format
 * 
 * OBJ + MTL:
 * • MTL file must be in same directory as OBJ
 * • MTL filename must match OBJ filename
 * • Example: mymodel.obj + mymodel.mtl
 * 
 * Performance:
 * • OBJ files are text-based (larger)
 * • GLB files are binary (smaller, faster)
 * • For web, GLB is recommended
 * 
 * Animations:
 * • Only GLTF/GLB support animations
 * • OBJ is static geometry only
 * • Use GLB for animated models
 */

