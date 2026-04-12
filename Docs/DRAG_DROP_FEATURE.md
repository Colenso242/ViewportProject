# Drag & Drop Model Loading Feature

## Overview
The 3D viewport now supports drag and drop functionality for loading custom 3D models directly into the scene. Simply drag model files onto the viewport and they will load automatically.

## Supported Formats
- **OBJ** (.obj) - with optional MTL material files (.mtl)
- **glTF** (.gltf)
- **GLB** (.glb)

## Features

### 1. **Visual Feedback**
- When dragging files over the viewport, a blue overlay appears with a hint message
- The viewport border changes color to indicate a valid drop zone
- Loading status indicator shows progress at the bottom right

### 2. **Automatic Model Processing**
- Models are automatically centered in the scene
- Models are automatically scaled to fit the viewport
- Camera automatically repositions to frame the entire model

### 3. **Material Support**
- **OBJ files with MTL**: Drop both .obj and .mtl files together - they'll be grouped and loaded with materials
- **OBJ files without MTL**: Default gray material is applied
- **glTF/GLB files**: All materials and textures are preserved

### 4. **Animation Support**
- Animations are automatically detected and prepared for playback
- Use `modelManager.playAnimation('dropped-model', animationIndex)` to play animations

### 5. **Previous Model Removal**
- When loading a new model, the previous one is automatically cleaned up
- Resources are properly disposed to prevent memory leaks

## Usage

### Basic Usage
1. Open the 3D viewport in your browser
2. Drag a 3D model file onto the viewport
3. The model will load and be displayed in the center of the viewport
4. Use mouse controls (orbit controls) to rotate and zoom

### For OBJ Files with Materials
1. Prepare both the .obj file and its corresponding .mtl file
2. Drag both files onto the viewport
3. The system will automatically detect and pair them

### Programmatic Access
```javascript
// The loaded model is accessible via ModelManager
const model = modelManager.getModel('dropped-model');

// Play animations if available
modelManager.playAnimation('dropped-model', 0);

// Remove the model manually if needed
modelManager.removeModel('dropped-model');
```

## Technical Details

### New Methods in ModelManager

#### `loadModelFromFiles(name, mainFile, mtlFile = null)`
Loads a model from File objects (typically from drag & drop events)
- **name**: Unique identifier for the model
- **mainFile**: The main model file (File object)
- **mtlFile**: Optional MTL file for OBJ models
- **Returns**: Promise that resolves to the loaded THREE.Object3D

#### `loadGLTFModelFromFile(name, file, format)`
Loads a GLTF/GLB model from a File object
- Automatically handles animations
- Performs auto-scaling and centering

#### `loadOBJModelFromFiles(name, objFile, mtlFile = null)`
Loads an OBJ model from File objects
- Supports optional MTL materials
- Falls back to default material if MTL not provided
- Automatically scales and centers the model

### File Grouping Logic
The drop handler automatically groups files by their base name:
- `model.obj` + `model.mtl` → grouped together
- `model.glb` → loaded as is
- Multiple files with different base names → first valid model is loaded

## Error Handling

The implementation includes comprehensive error handling:
- Failed MTL loading falls back to default materials
- Failed model loading shows error message with details
- All errors are logged to console for debugging
- Error messages displayed for 3 seconds at bottom right

## Loading Indicators

Three types of loading status are shown:
1. **Loading**: "Loading filename..." (blue indicator)
2. **Success**: "Loaded: filename" (green indicator, auto-hides after 2 seconds)
3. **Error**: "Failed to load model: error message" (red indicator)

## Implementation Files

### Modified Files
- **frontend/src/App.vue**: Added drag & drop handlers, UI, and model management
- **frontend/src/utils/ModelManager.js**: Added File-based loading methods

### Key Components
1. **Drag handlers**: `@dragover`, `@dragleave`, `@drop` on viewport
2. **Drop overlay**: Visual feedback during drag operations
3. **Loading indicator**: Status messages for load operations
4. **File grouping**: Intelligently pairs .obj and .mtl files
5. **Camera fitting**: Automatically positions camera to frame the model

## Browser Compatibility

The drag and drop feature uses standard Web APIs:
- File API
- FileReader API
- Blob/URL API
- All modern browsers are supported (Chrome, Firefox, Safari, Edge)

## Performance Considerations

- Models are automatically scaled to fit in a 2-unit bounding box
- Large models may take time to parse depending on file size
- Multiple file uploads load only the first valid model
- Previous models are properly cleaned up to prevent memory leaks

## Troubleshooting

### Model doesn't appear
- Check browser console for error messages
- Ensure model file is in a supported format
- Try a simpler model first to verify functionality

### MTL materials not loading
- Ensure .mtl file is in the same directory and has matching name
- Check that texture files referenced in MTL are included
- Falls back to default material if issues occur

### Camera doesn't frame model correctly
- This is handled automatically based on model size
- Use mouse wheel to zoom if needed
- Use middle mouse button to pan/orbit

### Models appearing too small/large
- Models are automatically scaled, but extreme sizes may appear odd
- Use the zoom controls to adjust view

## Future Enhancements

Possible improvements to consider:
- Multiple model support (load multiple models at once)
- Model transformation UI (position, rotation, scale)
- Material editor UI
- Animation player UI
- Export functionality (save scene to file)
- Texture upload support
- Model history/undo functionality

