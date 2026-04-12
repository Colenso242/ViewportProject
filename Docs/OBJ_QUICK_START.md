# OBJ Renderer - 60 Second Quick Start

## What You Got

Your model renderer now supports **3 formats**:
- ✅ GLB (best for web)
- ✅ GLTF (flexible)
- ✅ OBJ (universal)

## Try It Right Now

### 1. Test the Included Model
Add this to your `App.vue` `onMounted` hook:

```javascript
onMounted(async () => {
  checkApi();
  initThree();
  animate();

  // Test OBJ loading
  try {
    const testCube = await modelManager.loadModel('/models/obj/testcube.obj', 'testcube');
    console.log('✅ OBJ loaded successfully!', testCube);
  } catch (error) {
    console.error('❌ Failed to load:', error);
  }
});
```

### 2. Run Your App
```bash
npm run dev    # Frontend
npm run dev    # Backend (in another terminal)
```

### 3. Check Browser Console
You should see: `✅ OBJ loaded successfully!` + a blue cube in viewport

Done! 🎉

## Add Your Own OBJ

### Option A: From Sketchfab (Easy)
1. Go to https://sketchfab.com
2. Search for model
3. Download as OBJ
4. Extract files
5. Copy `.obj` + `.mtl` to `frontend/public/models/obj/`

### Option B: From Blender (Custom)
1. Model in Blender
2. File → Export → Wavefront (.obj)
3. ✅ Enable "Write Materials"
4. Save to `frontend/public/models/obj/`

### Option C: Convert GLB to OBJ
Use: https://products.aspose.app/3d/conversion/obj

## Load Your Model

```javascript
const model = await modelManager.loadModel('/models/obj/yourmodel.obj', 'myModel');
model.position.y = 0.5;
```

## API Cheat Sheet

```javascript
// Load (auto-detects format)
await modelManager.loadModel('/models/file.obj', 'name')

// Get model
modelManager.getModel('name')

// Transform
model.position.set(0, 0, 0)
model.rotation.y = Math.PI / 4
model.scale.set(2, 2, 2)

// Remove
modelManager.removeModel('name')
```

## Common Issues

| Problem | Solution |
|---------|----------|
| Model doesn't appear | Check file path, verify file exists |
| Model looks gray | MTL file missing (normal, uses fallback) |
| Can't see model | Zoom out with scroll wheel |
| Loading error | Check console for details |

## File Locations

```
frontend/public/models/
├── obj/
│   ├── testcube.obj  ← Test model
│   ├── testcube.mtl  ← Test material
│   ├── yourmodel.obj ← Your model
│   └── yourmodel.mtl ← Your material
```

## Key Points

| Aspect | Details |
|--------|---------|
| **Format** | OBJ = Wavefront format (text-based) |
| **Materials** | MTL file in same directory, matching name |
| **Auto-scale** | Models center and scale automatically |
| **Fallback** | Gray material if MTL not found |
| **Animations** | Not supported (use GLB for animations) |

## Formats Comparison

| Feature | GLB | OBJ |
|---------|-----|-----|
| Animations | ✅ | ❌ |
| Compressed | ✅ | ❌ |
| Compatibility | ✅ | ✅✅ |
| File size | Small | Large |

**Pro Tip**: Use GLB for web, OBJ for interchange/CAD

## Dev Console Helpers

Try in browser console:
```javascript
// Load test model
testModelLoad('/models/obj/testcube.obj', 'cube')

// Get info
getModelInfo('cube')

// Transform
moveModel('cube', 0, 1, 0)

// Stats
getStats()

// More help
help()
```

## Next Steps

1. ✅ Test with included cube
2. ✅ Download model from Sketchfab
3. ✅ Place in `/models/obj/`
4. ✅ Load in your app
5. ✅ Build something awesome!

## Files Included

```
✅ ModelManager.js    - Extended with OBJ support
✅ testcube.obj       - Test model (blue cube)
✅ testcube.mtl       - Test material
✅ Full documentation - See OBJ_RENDERER_GUIDE.md
```

## Support

See these files for help:
- **OBJ_RENDERER_GUIDE.md** - Complete reference
- **OBJ_IMPLEMENTATION_CHECKLIST.md** - What's done
- **modelLoaderExample.js** - Code examples

---

That's it! You now have OBJ support. Go build! 🚀

