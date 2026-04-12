# 3D Model Renderer - Quick Start Guide

## 🚀 Get Started in 60 Seconds

### 1. Test It Now (Takes 30 seconds)
Add this to your `App.vue` in the `onMounted` hook:

```javascript
onMounted(async () => {
  checkApi();
  initThree();
  animate();

  // Test OBJ model loading
  try {
    const model = await modelManager.loadModel('/models/obj/testcube.obj', 'testcube');
    console.log('✅ OBJ loaded!', model);
  } catch (error) {
    console.error('❌ Error:', error);
  }
});
```

Then run your dev servers and check the browser console. You should see a blue cube in the viewport!

### 2. Load Your Own Model (Takes 30 seconds)

**Option A: From Sketchfab (Easy)**
1. Go to https://sketchfab.com
2. Find a model you like
3. Click "Download"
4. Select "Wavefront (.obj)" format
5. Extract the files
6. Copy `.obj` and `.mtl` files to `frontend/public/models/obj/`
7. Update the URL in your code

**Option B: From Blender (Custom)**
1. Open Blender
2. Model something
3. File → Export → Wavefront (.obj)
4. ✅ Enable "Write Materials"
5. Save to `frontend/public/models/obj/`
6. Use in your app

### 3. Use in Your App

```javascript
// Load OBJ
const model = await modelManager.loadModel('/models/obj/yourmodel.obj', 'mymodel');

// Position it
model.position.set(0, 0, 0);

// Scale it
model.scale.set(2, 2, 2);

// That's it!
```

## 🎮 API Reference

```javascript
// Load any format (auto-detects: .glb, .gltf, .obj)
await modelManager.loadModel(url, name)

// Get a model
modelManager.getModel(name)

// Transform
model.position.set(x, y, z)
model.rotation.y = Math.PI / 4
model.scale.set(1, 1, 1)

// Remove
modelManager.removeModel(name)
```

## 🧪 Browser Console Commands

Try these in your browser console:

```javascript
// Load test model
testModelLoad('/models/obj/testcube.obj', 'cube')

// List loaded models
listModels()

// Get model info
getModelInfo('cube')

// Transform
moveModel('cube', 0, 1, 0)
scaleModel('cube', 2)

// Performance stats
getStats()

// Help
help()
```

## 📁 Where to Put Models

```
frontend/public/models/
├── obj/
│   ├── testcube.obj      (✅ Included)
│   ├── testcube.mtl      (✅ Included)
│   └── yourmodel.obj     ← Add here
│   └── yourmodel.mtl     ← Add here too
├── character.glb         (GLB models)
└── scene.gltf           (GLTF models)
```

## ✅ What Works

- ✅ Load OBJ files
- ✅ Load with materials (MTL)
- ✅ Auto-scaling and centering
- ✅ Mix GLB, GLTF, and OBJ formats
- ✅ Transform (position, rotate, scale)
- ✅ Error handling

## ❌ Limitations (OBJ Only)

- ❌ No animations (use GLB for that)
- ❌ Larger file size (use GLB for web)

## 🆘 Troubleshooting

**Model won't load?**
- Check file path matches your URL
- Verify file exists in `frontend/public/models/obj/`
- Check browser console for errors

**Materials not showing?**
- Verify MTL filename matches OBJ filename
- Both files must be in same directory
- Check Network tab for 404 errors

**Can't see model?**
- Try zooming out (scroll wheel)
- Try rotating (mouse drag)
- Check if model is really big or really small

## 🔗 Resources

**Get Free Models:**
- https://sketchfab.com (filter by free, download as OBJ)
- https://poly.pizza (CC licensed)
- https://quaternius.com (voxel art)

**Learn 3D:**
- Blender Tutorial: https://blender.org/download/
- Three.js Docs: https://threejs.org

## 📚 Full Guides

- **OBJ_RENDERER_GUIDE.md** - Complete OBJ documentation
- **README_3D_RENDERER.md** - Full feature overview
- **QUICK_REFERENCE.md** - API cheat sheet

---

**Ready?** Load a model and start building! 🚀
