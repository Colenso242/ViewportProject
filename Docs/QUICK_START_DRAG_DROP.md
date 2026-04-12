# Drag & Drop Feature - Quick Start Guide

## 🚀 Get Started in 30 Seconds

### 1. Start Your Application

```bash
# Terminal 1: Frontend
cd frontend
npm run dev

# Terminal 2: Backend
cd backend
npm start
```

### 2. Open Your Browser
```
http://localhost:5173
```

### 3. Drag & Drop a Model
- Download or prepare a `.obj`, `.glb`, or `.gltf` file
- Drag it onto the viewport
- Watch it load! 🎉

## ✨ What You'll See

**Dragging a file:**
- Blue border around viewport
- Light blue overlay appears
- Text says "Drop your 3D model here"

**After dropping:**
- Blue loading indicator (bottom right)
- Model appears in center
- Green "Loaded" message
- Camera auto-positions

## 📁 Supported Formats

| Format | Files | Example |
|--------|-------|---------|
| OBJ with Materials | `.obj` + `.mtl` | model.obj + model.mtl |
| OBJ Simple | `.obj` only | model.obj |
| GLB | `.glb` | model.glb |
| glTF | `.gltf` | model.gltf |

## 🎮 Mouse Controls

Once model is loaded:
- **Left Click + Drag**: Rotate
- **Middle Click + Drag**: Pan
- **Scroll**: Zoom
- **Right Click**: Default menu

## 📝 Example: Load Built-in Test Cube

```
1. Navigate to: frontend/public/models/obj/
2. You'll find: testcube.obj and testcube.mtl
3. Drag both files onto viewport
4. You should see a blue cube!
```

## ⚠️ Troubleshooting

### Model doesn't appear
- Check browser console (F12)
- Try a simpler model first
- Ensure format is supported

### MTL file not loading
- Make sure it's in same folder as .obj
- Same base name (e.g., model.obj + model.mtl)
- Will fall back to gray material if missing

### Very slow to load
- Might be large file
- Check file size (< 50MB recommended)
- Try a compressed GLB format

## 📚 Learn More

For detailed information, see:
- **Quick overview**: `DRAG_DROP_FEATURE.md`
- **Visual guide**: `DRAG_DROP_UI_GUIDE.md`
- **Testing**: `DRAG_DROP_TESTING.md`
- **Code examples**: `DRAG_DROP_CODE_REFERENCE.md`

## 🔗 Free Model Resources

Need test models? Try these:
- **Sketchfab**: https://sketchfab.com (search, download as .glb)
- **Poly Haven**: https://polyhaven.com/models (high quality)
- **TurboSquid**: https://www.turbosquid.com/Search/3D-Models/free
- **CGTrader**: https://www.cgtrader.com/free-3d-models
- **Three.js**: https://github.com/mrdoob/three.js/tree/master/examples/models

## 💡 Tips & Tricks

### Tip 1: Drop multiple files
Drop both OBJ and MTL at once - they'll be paired automatically!

### Tip 2: Fast model replacement
Just drop a new model to replace the old one

### Tip 3: Check what loaded
Open browser console and type:
```javascript
modelManager.getModel('dropped-model')
```

### Tip 4: Check animations
```javascript
modelManager.getAnimations('dropped-model')
```

### Tip 5: Play animation
```javascript
modelManager.playAnimation('dropped-model', 0)
```

## 🐛 Report Issues

If something doesn't work:
1. Check browser console (F12 > Console)
2. Note the error message
3. Try with different model
4. Check file format and size

## 📱 Mobile Support

- Android Chrome: ✅ Works
- iOS Safari: ⚠️ Limited (browser restriction)
- Desktop: ✅ Full support

## 🎯 Next Features

Planned enhancements:
- Multiple models at once
- Model transformation UI
- Animation player
- Material editor
- Export to file

## 🎓 Learning Path

1. **Start**: Drag & drop a simple model
2. **Explore**: Try different formats
3. **Understand**: Read the code reference
4. **Customize**: Modify colors/transforms
5. **Integrate**: Add to your project

---

**That's it!** You're ready to use the drag & drop feature. Happy modeling! 🎨

