# Drag & Drop UI Visual Guide

## User Interface Components

### 1. **Viewport with Drag Overlay**

When a user drags a file over the viewport:

```
┌─────────────────────────────────────────────────────┐
│  Three.js Viewport              API status: ok      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  ╔════════════════════════════════════════════╗ ││
│  │  ║                                            ║ ││
│  │  ║   Drop your 3D model here                  ║ ││
│  │  ║   Supported: .obj, .glb, .gltf (+ .mtl)   ║ ││
│  │  ║                                            ║ ││
│  │  ╚════════════════════════════════════════════╝ ││
│  │                                                 ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│                 [Blue overlay with blur]           │
│                 [Viewport border turns blue]       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2. **Loading Status Indicators**

**Loading State** (appears immediately after drop):
```
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]
  Loading model.obj...
```
Color: Blue (#3b82f6)
Position: Bottom right, fixed
Duration: Stays until load completes

**Success State** (appears after successful load):
```
[✓ Loaded: model.obj]
```
Color: Green (#10b981)
Position: Bottom right, fixed
Duration: Auto-hides after 2 seconds

**Error State** (appears if load fails):
```
[✗ Failed to load model: Unsupported format]
```
Color: Red (#ef4444)
Position: Bottom right, fixed
Duration: Shows for 3 seconds

### 3. **Color Scheme**

- **Normal Viewport Border**: `#334155` (slate gray)
- **Dragging Viewport Border**: `#3b82f6` (blue)
- **Overlay Background**: `rgba(59, 130, 246, 0.1)` (light blue with blur)
- **Drop Hint Text**: `#3b82f6` (blue)
- **Drop Hint Subtext**: `#94a3b8` (light gray)
- **Success Indicator**: `#10b981` (green)
- **Error Indicator**: `#ef4444` (red)
- **Loading Indicator**: `#3b82f6` (blue)

### 4. **Animation Effects**

#### Drop Overlay Animation
- **On Enter**: Instantly appears with blur
- **On Leave**: Instantly disappears
- **Duration**: Instant (no fade)

#### Border Animation
- **On Enter**: Smooth color transition to blue
- **On Leave**: Smooth color transition back to gray
- **Duration**: 0.2 seconds

#### Status Indicator Animation
- **On Appear**: Slide in from right (400px offset)
- **Duration**: 0.3 seconds ease
- **On Disappear**: Fade out and slide up
- **Duration**: Auto (depends on timeout)

### 5. **File Grouping Behavior**

When multiple files are dropped:

```
Input Files:
├── model.obj
├── model.mtl
├── texture.png
└── readme.txt

Processing:
├── Group by base name: "model"
│   ├── obj: model.obj ✓
│   └── mtl: model.mtl ✓
│
└── Result: Load model.obj + model.mtl

Status: "Loading model.obj..."
```

### 6. **Camera Auto-Framing**

**Before (with default cube):**
```
View Center: [0, 0, 0]
Camera Position: [0, 1, 3]
Cube visible in center
```

**After (with loaded model):**
```
View Center: [Model center coordinates]
Camera Position: [Auto-calculated based on model size]
Model fills viewport (with padding)
Camera zoomed appropriately
```

### 7. **Loading Process Timeline**

```
Time    Event                   UI State
─────────────────────────────────────────────
0ms     File dropped            Overlay visible
10ms    Files grouped           Processing...
20ms    Model format detected   Still loading...
50ms    File reader started     Status: "Loading model.obj..."
100ms   Parse begins            Blue indicator visible
1000ms  Model scaled/centered   Still loading...
1500ms  Camera positioned       Still loading...
2000ms  Model added to scene    Green success indicator
2100ms  Render cycle 1          Model visible
2200ms  Success message         "Loaded: model.obj"
4200ms  Auto dismiss            Status clears
```

### 8. **Error States with Messages**

```
Error: Unsupported format
├── Message: "Failed to load model: Unsupported format"
├── Console: Detailed error with file info
└── UI: Red error box for 3 seconds

Error: MTL file missing
├── Message: "Loaded: model.obj" (falls back to default material)
├── Console: Warning about missing MTL
└── UI: Still shows success (graceful fallback)

Error: Corrupted file
├── Message: "Failed to load model: Invalid model data"
├── Console: Parser error details
└── UI: Red error box for 3 seconds
```

### 9. **Keyboard Accessibility**

```
Tab Navigation:
│
├── [Toolbar]
│   └── Focus on title/status
│
├── [Viewport] - Focusable
│   └── Can receive drop events
│   └── Keyboard nav disabled (3D interaction only)
│
└── [Status Indicator]
    └── Announced by screen reader
```

### 10. **Responsive Behavior**

**Desktop (1920x1080):**
```
┌─────────────────────────────────────────────────┐
│ Toolbar                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│              Viewport Area                      │
│           (Full remaining space)                │
│                                                 │
│                    ┌─────────────────┐          │
│                    │ ✓ Loaded: ...   │          │
│                    └─────────────────┘          │
└─────────────────────────────────────────────────┘
```

**Tablet (768x1024):**
```
Same layout, responsive height calculations
```

**Mobile (375x667):**
```
Same layout, full width maintained
Touch drag & drop supported
```

### 11. **Browser DevTools View**

In Chrome DevTools, the structure appears as:
```
main.app-shell
├── header.toolbar
│   ├── h1
│   └── small
│
├── section.viewport (with @dragover, @dragleave, @drop)
│   ├── div.drop-overlay (v-if="isDragging")
│   │   └── div.drop-hint
│   │       ├── p "Drop your 3D model here"
│   │       └── small "Supported formats..."
│   │
│   └── [Three.js Canvas]
│
└── div.loading-indicator (v-if="loadingStatus")
    ├── :class="loadingStatus.type" (loading|success|error)
    └── p "{{ loadingStatus.message }}"
```

### 12. **Performance Indicators (Optional Future)**

Could add to status indicator:
```
┌─────────────────────────────┐
│ ✓ Model Loaded              │
│ Vertices: 45,234            │
│ Materials: 3                │
│ Load time: 1.2s             │
│ Memory: 5.4 MB              │
└─────────────────────────────┘
```

### 13. **Real Example Sequence**

User action → Visual feedback:

```
1. User drags model.obj over viewport
   → Viewport border turns BLUE
   → Drop overlay appears with BLUE hint text
   → Background tints LIGHT BLUE

2. User drops the file
   → Overlay disappears
   → BLUE "Loading model.obj..." appears bottom right
   → Three.js renders the loading frame

3. Model loads (1-2 seconds later)
   → Model appears in center of viewport
   → BLUE indicator replaced with GREEN "Loaded: model.obj"
   → Camera positioned to show full model

4. After 2 seconds
   → GREEN indicator auto-hides
   → Only the model remains visible
   → User can interact with it using mouse
```

### 14. **Multi-File Drop Example**

```
User drops: model.obj, model.mtl, texture.png, readme.txt

What happens:
├── model.obj + model.mtl detected as pair
├── texture.png ignored (not a 3D model)
├── readme.txt ignored (not a 3D model)
│
└── Result: Loads paired OBJ+MTL
    Status: "Loading model.obj..."
```

---

This visual guide helps developers and designers understand the complete user experience of the drag & drop feature.

