<template>
  <main class="app-shell">
    <header class="toolbar">
      <h1>Three.js Viewport</h1>
      <small>API status: {{ apiStatus }}</small>
    </header>

    <section
      ref="viewport"
      class="viewport"
      aria-label="3D viewport"
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
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelManager } from './utils/ModelManager.js';

const viewport = ref(null);
const apiStatus = ref('checking...');
const isDragging = ref(false);
const loadingStatus = ref(null);

let renderer;
let camera;
let scene;
let cube;
let controls;
let frameId;
let handleResize;
let modelManager;
let currentModel = null;

async function checkApi() {
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    apiStatus.value = payload.status;
  } catch (_error) {
    apiStatus.value = 'offline';
  }
}

function initThree() {
  const el = viewport.value;
  const width = el.clientWidth;
  const height = el.clientHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  el.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(0, 1, 3);

  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(2, 4, 3);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Initialize ModelManager
  modelManager = new ModelManager(scene);

  handleResize = () => {
    const nextWidth = el.clientWidth;
    const nextHeight = el.clientHeight;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
  };

  window.addEventListener('resize', handleResize);
}

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
      const model = await modelManager.loadModelFromFiles('dropped-model', mainFile, files.mtl);
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

function fitCameraToModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.5;

  const center = box.getCenter(new THREE.Vector3());
  camera.position.copy(center);
  camera.position.z += cameraZ;
  controls.target.copy(center);
  controls.update();
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
}

onMounted(() => {
  checkApi();
  initThree();
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', handleResize);

  if (controls) {
    controls.dispose();
  }

  if (cube) {
    cube.geometry.dispose();
    cube.material.dispose();
  }

  if (modelManager) {
    modelManager.disposeAll();
  }

  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #0f172a;
  color: #f8fafc;
}

.app-shell {
  min-height: 100vh;
  padding: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.toolbar h1 {
  margin: 0;
  font-size: 1.25rem;
}

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

.loading-indicator p {
  margin: 0;
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

