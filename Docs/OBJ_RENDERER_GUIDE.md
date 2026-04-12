# OBJ Model Renderer Implementation Guide

## Overview

Extended the existing model renderer to support **OBJ format** in addition to GLTF/GLB. The system now automatically detects the model format and uses the appropriate loader.

## What's New

### Supported Formats
- ✅ **GLB** - Binary GLTF (recommended for web)
- ✅ **GLTF** - Text-based GLTF with separate files
- ✅ **OBJ** - Wavefront OBJ format with optional MTL materials

### Key Features
- **Auto-detection**: Detects format from file extension
- **Material support**: Loads MTL files if available
- **Fallback materials**: Uses default gray material if MTL not found
- **Auto-scaling**: OBJ models are automatically centered and scaled
- **Mixed formats**: Load GLB and OBJ models in the same scene

## File Structure

```
frontend/
  public/
    models/
      character.glb          ← GLB format
      scene.gltf             ← GLTF format
      cube.obj               ← OBJ without materials
      obj/
        ├── chair.obj        ← OBJ with MTL
        ├── chair.mtl
        ├── table.obj
        ├── table.mtl
        └── textures/        ← Optional texture files
```

## OBJ Format Details

### What is OBJ?

Wavefront OBJ is a simple text-based 3D format that stores:
- **Vertices** (.v) - 3D points
- **Faces** (.f) - Polygon connectivity
- **Normals** (.vn) - Surface normals
- **Texture coords** (.vt) - UV mapping

### OBJ + MTL

OBJ files can reference a **.mtl** (Material Template Library) file that defines:
- Colors and textures
- Metalness and roughness
- Transparency
- Bump maps

**Important**: MTL file must have the same name as OBJ and be in the same directory.

Example:
```
mymodel.obj
mymodel.mtl      ← Must match filename
```

## Usage

### Load OBJ Without MTL
```javascript
const model = await modelManager.loadModel('/models/cube.obj', 'cube');
// Uses default gray material
```

### Load OBJ With MTL
```javascript
// File structure: /models/obj/chair.obj + /models/obj/chair.mtl
const model = await modelManager.loadModel('/models/obj/chair.obj', 'chair');
// Automatically loads and applies chair.mtl
```

### Load GLB (for comparison)
```javascript
const model = await modelManager.loadModel('/models/character.glb', 'character');
// Optimized, supports animations
```

### Mixed Formats
```javascript
// Load different types in same scene
const obj = await modelManager.loadModel('/models/obj/table.obj', 'table');
const glb = await modelManager.loadModel('/models/scene.glb', 'scene');

obj.position.set(0, 0, 0);
glb.position.set(2, 0, 0);
```

## ModelManager API

### Format Detection
```javascript
const format = modelManager.getModelFormat('/models/file.obj');
// Returns: 'obj', 'glb', or 'gltf'
```

### Load Model
```javascript
const model = await modelManager.loadModel(url, name, options);
// Automatically detects and loads correct format
```

### Get Model Info
```javascript
const model = modelManager.getModel('name');
const format = model.userData.format; // 'glb', 'gltf', or 'obj'
```

### Transform Model
```javascript
model.position.set(0, 1, 0);
model.rotation.y = Math.PI / 4;
model.scale.set(2, 2, 2);
```

### Cleanup
```javascript
modelManager.removeModel('name');
modelManager.disposeAll();
```

## OBJ-Specific Features

### Auto-Scaling
OBJ models are automatically:
- **Centered** at origin (0, 0, 0)
- **Scaled** to fit in a 2x2x2 bounding box

This ensures consistency regardless of OBJ file scale.

### Default Material
If MTL file is not found:
- **Color**: Medium gray (#888888)
- **Metalness**: 0.3
- **Roughness**: 0.7

This creates a subtle metallic appearance.

### Texture Handling
OBJ + MTL can reference texture files:
```
models/obj/
  ├── chair.obj
  ├── chair.mtl
  └── textures/
      ├── chair_diffuse.png
      ├── chair_normal.png
      └── chair_roughness.png
```

The backend serves all files, so textures work automatically.

## Limitations

### OBJ Format
- **No animations**: OBJ is static geometry only
- **No cameras**: OBJ doesn't store camera data
- **No lights**: Lighting defined separately (not in OBJ)
- **Limited materials**: MTL is simpler than GLTF materials

### OBJ vs GLB Comparison

| Feature | OBJ | GLB |
|---------|-----|-----|
| Animation | ❌ | ✅ |
| File size | Large (text) | Small (binary) |
| Compatibility | Very wide | Good |
| Materials | Basic (MTL) | Advanced (GLTF) |
| Textures | Supported | Supported |
| Normals | Supported | Supported |
| Web friendly | OK | Excellent |

## Performance Tips

### For OBJ Files
1. **Keep MTL files**: Materials are loaded separately, so it's OK to have many
2. **Optimize geometry**: Reduce polygon count in Blender before export
3. **Use GLB for complex models**: GLB is more efficient
4. **Cache loaded models**: Don't reload the same model multiple times

### Recommended Approach
- Use **GLB** for: animated models, complex scenes, web optimization
- Use **OBJ** for: simple static geometry, CAD data, interchange format

## File Size Comparison

Same model in different formats:
- OBJ + MTL: ~500 KB (text-based)
- GLB: ~150 KB (binary-compressed)

**GLB is 3x smaller!** Use GLB for web applications.

## MTL File Format

Example `chair.mtl`:
```
newmtl chair_material
Ka 0.1 0.1 0.1
Kd 0.8 0.8 0.8
Ks 1.0 1.0 1.0
Ns 32
map_Kd textures/chair_diffuse.png
map_Bump textures/chair_normal.png
```

## Backend Configuration

The backend automatically serves models:
```javascript
app.use('/models', express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'models')));
```

This handles:
- `.obj` files
- `.mtl` files  
- texture files in subdirectories

All files in `frontend/public/models/` are accessible at `/models/`.

## Troubleshooting

### OBJ file not loading
- Check file path in browser console
- Verify file exists in `frontend/public/models/`
- Check file extension is `.obj`

### OBJ loads but looks gray
- MTL file not found (check file naming)
- Check `Network` tab in DevTools for 404 errors
- Verify MTL has same name as OBJ

### Materials not appearing
- MTL file must be in same directory as OBJ
- Filenames must match: `model.obj` + `model.mtl`
- Check browser console for warnings

### Textures not loading
- Texture files must be in subdirectory (e.g., `textures/`)
- MTL must reference correct texture paths
- Check CORS headers (backend handles this)

### Performance issues
- OBJ files are large; consider GLB instead
- Check polygon count in Blender
- Profile with DevTools

## Creating OBJ + MTL from Blender

1. Open model in Blender
2. Select model
3. File → Export → Wavefront (.obj)
4. Enable: **Write Materials**
5. Choose output directory
6. Generates: `model.obj` + `model.mtl`
7. Copy both files to `/models/obj/`

## Converting OBJ to GLB

Use **Babylon.js Sandbox** or **three.js converter**:
1. Open model in browser-based converter
2. Export as GLB
3. Use GLB version for better performance

## Resources

### OBJ File Sources
- sketchfab.com (free OBJ downloads)
- thingiverse.com (3D printing models)
- cgtrader.com (CAD models)

### OBJ Documentation
- https://en.wikipedia.org/wiki/Wavefront_.obj_file
- https://threejs.org/docs/#examples/en/loaders/OBJLoader

### Tools
- Blender (free 3D editor)
- Meshlab (model viewer/editor)
- Babylon.js Sandbox (online viewer)

## Summary

✅ OBJ renderer fully integrated  
✅ Auto-format detection  
✅ MTL material support  
✅ Fallback materials  
✅ Auto-scaling and centering  
✅ Production-ready error handling  

Ready to load OBJ models! 🚀

