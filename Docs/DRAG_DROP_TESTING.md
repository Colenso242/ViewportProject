# Testing the Drag & Drop Feature

## Quick Start Testing

### Step 1: Start the Application
```bash
cd frontend
npm install  # if not already done
npm run dev
```

Then in another terminal:
```bash
cd backend
npm install  # if not already done
npm start
```

### Step 2: Test with Sample Models

#### Test 1: Drop the Built-in Test Cube
1. Navigate to your project's `frontend/public/models/obj/` directory
2. You should find `testcube.obj` and `testcube.mtl`
3. Drag both files onto the viewport
4. **Expected**: The cube should appear, centered in the viewport

#### Test 2: Test Simple OBJ File (without MTL)
1. Create a simple .obj file or download one from:
   - Sketchfab (filter for .obj)
   - TurboSquid (free models)
   - CGTrader (free models)
2. Drag just the .obj file onto the viewport
3. **Expected**: Model loads with default gray material

#### Test 3: Test GLB File
1. Download a sample .glb file (GLB format)
   - Good sources: Sketchfab (many models available as .glb)
2. Drag the .glb file onto the viewport
3. **Expected**: Model loads with original materials and textures

#### Test 4: Test Visual Feedback
1. Start dragging a file over the viewport
2. **Expected**: Blue overlay appears with text "Drop your 3D model here"
3. Move the file outside the viewport
4. **Expected**: Overlay disappears
5. Drop the file inside the viewport
6. **Expected**: Loading indicator appears, then success message

#### Test 5: Test Multiple Models
1. Drop a model (Model A)
2. Wait for it to load
3. Drop a different model (Model B)
4. **Expected**: Model A is removed, Model B is loaded

#### Test 6: Test Camera Framing
1. Drop a very small model
2. **Expected**: Camera automatically zooms to fit the model
3. Drop a very large model
4. **Expected**: Camera automatically pulls back to fit the model

### Step 3: Manual Testing Checklist

- [ ] Drag and drop activates overlay
- [ ] Overlay shows correct text
- [ ] OBJ + MTL files load with materials
- [ ] OBJ only files load with default material
- [ ] GLB/GLTF files load with original materials
- [ ] Loading indicator appears during load
- [ ] Success message appears after load
- [ ] Camera frames the model correctly
- [ ] Orbit controls work on loaded model
- [ ] Previous model is removed when new one loads
- [ ] Error message appears for invalid files
- [ ] Multiple file formats can be tested
- [ ] Very large models load without crashing
- [ ] Very small models are visible with correct camera positioning

### Step 4: Browser Console Testing

Monitor the browser console (F12 > Console tab) while testing:

```javascript
// You can manually test model loading:
await modelManager.loadModel('/path/to/model.obj', 'test-model');

// Check loaded models:
modelManager.getModel('dropped-model');

// Test animations if model has them:
const animations = modelManager.getAnimations('dropped-model');
if (animations) {
  modelManager.playAnimation('dropped-model', 0);
}

// Remove a model:
modelManager.removeModel('dropped-model');
```

## Sample Test Models to Download

### Free GLB Models (One File)
- https://sketchfab.com/3d-models (search, download .glb)
- https://polyhaven.com/models (high quality, free)

### Free OBJ Models (with MTL)
- https://casual-effects.com/data/ (Sponza, Crytek-Sponza)
- https://www.turbosquid.com/Search/3D-Models/free (filter for Free)

### Testing Specific Scenarios

#### Test Blender-exported OBJ
1. Create simple model in Blender
2. Export as OBJ (File > Export > OBJ)
3. Both .obj and .mtl will be created
4. Drag both onto viewport
5. **Expected**: Loads with materials

#### Test Three.js Examples
1. Download models from three.js examples:
   - https://github.com/mrdoob/three.js/tree/master/examples/models
2. Try different formats:
   - .gltf files
   - .glb files
   - .obj files with .mtl

#### Test Large Models
1. Download a complex model (>10MB)
2. Drag onto viewport
3. **Expected**: Loading takes time, but completes
4. Monitor browser memory (DevTools > Performance/Memory)

#### Test Error Handling
1. Drag an invalid file (like .txt) onto viewport
2. **Expected**: Error message appears
3. Drag a corrupted model file
4. **Expected**: Error message appears with details

## Performance Metrics to Track

When testing large models:
- Initial load time
- Parse/process time
- Render FPS (check in three.js)
- Memory usage
- Camera responsiveness

```javascript
// Check performance in console:
console.time('model-load');
// ... load model ...
console.timeEnd('model-load');
```

## Accessibility Testing

- [ ] Can use keyboard to access all controls
- [ ] Screen reader reads the drop hint text
- [ ] High contrast mode works
- [ ] Can zoom with keyboard
- [ ] Error messages are announced

## Cross-Browser Testing

Test on:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

All should support:
- Drag & drop API
- FileReader API
- Blob URLs
- Three.js rendering

## Known Limitations

1. Models with external texture files may not load correctly (OBJ references external files)
2. Very large models (>100MB) may cause browser to hang
3. Some three.js-specific features (post-processing, shaders) won't be on dropped models by default
4. Animation playback requires manual code (no UI yet)

## Troubleshooting Test Issues

### Model doesn't appear
1. Check browser console for errors
2. Try a known working model first
3. Verify model format is supported
4. Check if model coordinates are at origin

### Loading indicator never disappears
1. Check console for JavaScript errors
2. Try a simpler/smaller model
3. Refresh page and try again

### Camera too close/far
1. This should be automatic, but you can adjust with zoom
2. Use mouse wheel to adjust
3. File a bug if consistently wrong

### Drag & drop not working
1. Ensure browser supports File API
2. Check console for JavaScript errors
3. Try different file types
4. Try different browsers

## Success Criteria

The feature is working correctly when:
1. ✅ Can drop files and see loading overlay
2. ✅ OBJ/GLB/GLTF files load successfully
3. ✅ Models appear centered in viewport
4. ✅ Camera automatically frames the model
5. ✅ Previous model is removed when loading new one
6. ✅ Orbit controls work on loaded models
7. ✅ Error messages appear for problems
8. ✅ No console errors during normal operation
9. ✅ Memory is cleaned up when models are removed
10. ✅ All supported formats work correctly

## Reporting Issues

If you find problems:
1. Document the exact steps to reproduce
2. Include browser/OS information
3. Capture console errors
4. Include model files or links if possible
5. Note performance metrics if relevant

