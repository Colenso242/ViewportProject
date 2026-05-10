<template>
  <main class="app-shell">
    <Toolbar
      :api-status="apiStatus"
      :show-object-tree="showObjectTree"
      :ghosting-enabled="ghostingEnabled"
      @toggle-tree="toggleObjectTree"
      @toggle-ghosting="toggleGhosting"
      @toggle-overview="showOverview = !showOverview"
    />

    <div class="main-container">
      <div class="viewport-wrapper" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;">
        <div class="workspace-row" style="flex: 1; display: flex; overflow: hidden;">
          <ObjectTree
            v-if="showObjectTree"
            :object-tree-items="objectTreeItems"
            :selected-object="selectedObject"
            @select="selectObject"
          />

          <Viewport3D
            ref="viewportComponent"
            :is-dragging="isDragging"
            style="flex: 1; position: relative"
            @drag-over="isDragging = true"
            @drag-leave="isDragging = false"
            @drop="handleDrop"
            @click="handleViewportClick"
            @pointer-move="handleViewportPointerMove"
            @pointer-leave="handleViewportPointerLeave"
          >
            <template #info>
              <ObjectInfo
                :selected-object="selectedObject"
                :hovered-object="hoveredObject"
              />
            </template>
            <template #overlay>
              <SensorOverlay
                v-if="cameraRef && currentModel && viewportComponent"
                :camera="cameraRef"
                :viewportEl="(viewportComponent as any)?.viewportElement"
                :currentModel="currentModel"
                :sensorMappings="sensorMappings"
                :sensorData="sensorData"
              />

              <!-- Floating Overlay Dashboard -->
              <div v-if="selectedSensorId && !showOverview" class="floating-dashboard-overlay">
                <div class="floating-header">
                  <span>Sensor: {{ selectedSensorId }}</span>
                  <button @click="deselectObject" class="close-overlay">✕</button>
                </div>
                <TimeseriesDashboard
                  :sensorId="selectedSensorId"
                  :liveReading="sensorData[selectedSensorId]" />
              </div>
            </template>
          </Viewport3D>

          <PropertiesPanel
            v-if="selectedObject"
            :selected-object="selectedObject"
            :sensors-info="sensorsInfo"
            :sensor-mappings="sensorMappings"
            :sensor-data="sensorData"
            @close="deselectObject"
            @toggle-visibility="selectedObject.visible = !selectedObject.visible"
            @update-mapping="handleMappingUpdate"
          />
        </div>
      </div>

      <OverviewPanel
        v-if="showOverview"
        @close="showOverview = false"
        :sensorData="sensorData"
        :sensorsInfo="sensorsInfo"
      />

    </div>

    <LoadingIndicator :loading-status="loadingStatus" />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, computed, ComponentPublicInstance } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { io, Socket } from 'socket.io-client';
import { ModelManager } from './utils/ModelManager';
import Toolbar from './components/viewport/Toolbar.vue';
import ObjectTree from './components/viewport/ObjectTree.vue';
import Viewport3D from './components/viewport/Viewport3D.vue';
import ObjectInfo from './components/viewport/ObjectInfo.vue';
import PropertiesPanel from './components/viewport/PropertiesPanel.vue';
import SensorOverlay from './components/viewport/SensorOverlay.vue';
import LoadingIndicator from './components/viewport/LoadingIndicator.vue';
import TimeseriesDashboard from './components/analytics/TimeseriesDashboard.vue';
import OverviewPanel from './components/analytics/OverviewPanel.vue';
import './App.css';

interface LoadingStatusType {
  type: 'loading' | 'success' | 'error';
  message: string;
}

const viewportComponent = ref<ComponentPublicInstance | null>(null);
const apiStatus = ref<string>('checking...');
const isDragging = ref<boolean>(false);
const loadingStatus = ref<LoadingStatusType | null>(null);
const showObjectTree = ref<boolean>(false);
const showOverview = ref<boolean>(false);
const ghostingEnabled = ref<boolean>(true);
const selectedObject = ref<THREE.Object3D | null>(null);
const hoveredObject = ref<THREE.Object3D | null>(null);

const selectedSensorId = computed(() => {
  if (selectedObject.value) {
    return sensorMappings.value[selectedObject.value.uuid] || null;
  }
  return null;
});

// IoT Data
const ioSocket = ref<Socket | null>(null);
const sensorData = ref<Record<string, any>>({});
const sensorsInfo = ref<any[]>([]);
const sensorMappings = ref<Record<string, string>>({}); // uuid -> sensorId

let renderer: THREE.WebGLRenderer;
let cameraRef = shallowRef<THREE.PerspectiveCamera | null>(null);
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let controls: OrbitControls;
let frameId: number;
let handleResize: (() => void) | undefined;
let modelManager: ModelManager;
const currentModel = shallowRef<THREE.Object3D | null>(null);
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

interface MeshMaterialState {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
  ghost: THREE.Material | THREE.Material[];
  highlight: THREE.Material | THREE.Material[];
  critical: THREE.Material | THREE.Material[];
}

const meshMaterialStates = new Map<string, MeshMaterialState>();

const objectTreeItems = computed(() => {
  if (!currentModel.value) return [];
  const items: THREE.Object3D[] = [];
  currentModel.value.traverse((child) => {
    if (child !== currentModel.value) {
      items.push(child);
    }
  });
  return items;
});

async function checkApi(): Promise<void> {
  try {
    const response = await fetch('/api/health');
    const { status } = await response.json();
    apiStatus.value = status;
  } catch {
    apiStatus.value = 'offline';
  }
}

function initThree(): void {
  const viewportEl = (viewportComponent.value as any)?.viewportElement;
  if (!viewportEl) return;

  const width = viewportEl.clientWidth;
  const height = viewportEl.clientHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  viewportEl.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  scene.fog = new THREE.Fog(0x1a1a1a, 50, 100);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 2, 5);

  // Enhanced lighting for architectural spaces
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  // Add a point light for more atmospheric lighting
  const pointLight = new THREE.PointLight(0xffffff, 0.5);
  pointLight.position.set(-5, 3, -5);
  scene.add(pointLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false;

  cameraRef.value = camera;

  // Initialize ModelManager
  modelManager = new ModelManager(scene);

  handleResize = () => {
    const nextWidth = viewportEl.clientWidth;
    const nextHeight = viewportEl.clientHeight;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
  };

  window.addEventListener('resize', handleResize);
}

function toggleObjectTree(): void {
  showObjectTree.value = !showObjectTree.value;
}

function toggleGhosting(): void {
  ghostingEnabled.value = !ghostingEnabled.value;
  applyInteractionMaterials();
}

function handleViewportClick(event: MouseEvent): void {
  const hit = pickObject(event);
  if (hit) {
    selectObject(hit);
    return;
  }

  deselectObject();
}

function selectObject(obj: THREE.Object3D): void {
  hoveredObject.value = obj;
  selectedObject.value = obj;
  applyInteractionMaterials();
}

function deselectObject(): void {
  hoveredObject.value = null;
  selectedObject.value = null;
  applyInteractionMaterials();
}

function handleViewportPointerMove(event: MouseEvent): void {
  const hit = pickObject(event);
  if (hit) {
    if (hoveredObject.value !== hit) {
      hoveredObject.value = hit;
      applyInteractionMaterials();
    }
    return;
  }

  if (hoveredObject.value !== null) {
    hoveredObject.value = null;
    applyInteractionMaterials();
  }
}

function handleViewportPointerLeave(): void {
  if (hoveredObject.value !== null) {
    hoveredObject.value = null;
    applyInteractionMaterials();
  }
}

function pickObject(event: MouseEvent): THREE.Object3D | null {
  const viewportEl = (viewportComponent.value as any)?.viewportElement;
  if (!viewportEl || !currentModel.value) {
    return null;
  }

  const rect = viewportEl.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(currentModel.value, true);
  return intersects[0]?.object ?? null;
}

function createGhostMaterial(material: THREE.Material): THREE.Material {
  const ghost = material.clone();
  const transparentGhost = ghost as THREE.Material & { opacity?: number; transparent?: boolean; depthWrite?: boolean };
  transparentGhost.transparent = true;
  transparentGhost.opacity = 0.13;
  transparentGhost.depthWrite = false;
  return ghost;
}

function createHighlightMaterial(material: THREE.Material): THREE.Material {
  const highlight = material.clone();
  const typedHighlight = highlight as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    opacity?: number;
    transparent?: boolean;
    depthWrite?: boolean;
  };

  typedHighlight.transparent = true;
  typedHighlight.opacity = 0.95;
  typedHighlight.depthWrite = true;

  if (typedHighlight.color) {
    typedHighlight.color = typedHighlight.color.clone().lerp(new THREE.Color(0xfbbf24), 0.35);
  }
  if (typedHighlight.emissive) {
    typedHighlight.emissive = new THREE.Color(0x664400);
    typedHighlight.emissiveIntensity = 0.45;
  }

  return highlight;
}

function createCriticalMaterial(material: THREE.Material): THREE.Material {
  const crit = material.clone();
  const typedCrit = crit as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
  };

  typedCrit.transparent = true;
  typedCrit.opacity = 0.9;
  typedCrit.depthWrite = true;

  if (typedCrit.color) {
    typedCrit.color = typedCrit.color.clone().lerp(new THREE.Color(0xef4444), 0.8);
  }
  if (typedCrit.emissive) {
    typedCrit.emissive = new THREE.Color(0x990000);
    typedCrit.emissiveIntensity = 0.8;
  }

  return crit;
}

function buildInteractionMaterials(model: THREE.Object3D): void {
  clearInteractionMaterials();

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }

    const original = mesh.material;
    const ghost = Array.isArray(original)
      ? original.map((material) => createGhostMaterial(material))
      : createGhostMaterial(original);
    const highlight = Array.isArray(original)
      ? original.map((material) => createHighlightMaterial(material))
      : createHighlightMaterial(original);
    const critical = Array.isArray(original)
      ? original.map((material) => createCriticalMaterial(material))
      : createCriticalMaterial(original);

    meshMaterialStates.set(mesh.uuid, {
      mesh,
      original,
      ghost,
      highlight,
      critical
    });
  });

  applyInteractionMaterials();
}

function clearInteractionMaterials(): void {
  meshMaterialStates.forEach(({ mesh, original, ghost, highlight, critical }) => {
    if (mesh.material !== original) {
      mesh.material = original;
    }

    const ghostMaterials = Array.isArray(ghost) ? ghost : [ghost];
    ghostMaterials.forEach((material) => material.dispose());

    const highlightMaterials = Array.isArray(highlight) ? highlight : [highlight];
    highlightMaterials.forEach((material) => material.dispose());

    const criticalMaterials = Array.isArray(critical) ? critical : [critical];
    criticalMaterials.forEach((material) => material.dispose());
  });

  meshMaterialStates.clear();
}

function resolveFocusedMesh(): THREE.Mesh | null {
  const candidate = (hoveredObject.value ?? selectedObject.value) as THREE.Object3D | null;
  if (!candidate) return null;

  const directMesh = candidate as THREE.Mesh;
  if (directMesh.isMesh) {
    return directMesh;
  }

  let firstMesh: THREE.Mesh | null = null;
  candidate.traverse((child) => {
    if (!firstMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        firstMesh = mesh;
      }
    }
  });

  return firstMesh;
}

function applyInteractionMaterials(): void {
  if (!currentModel.value || meshMaterialStates.size === 0) return;

  const focusedMesh = resolveFocusedMesh();

  // Determine if a material should be purely critical
  const time = Date.now() * 0.003;
  const pulseIntensity = (Math.sin(time) + 1) / 2; // 0 to 1

  meshMaterialStates.forEach((state) => {
    const sensorId = sensorMappings.value[state.mesh.uuid];
    let isCritical = false;
    let isWarning = false;

    if (sensorId && sensorData.value[sensorId]) {
      const sensorReading = sensorData.value[sensorId];
      isCritical = sensorReading.isCritical;
      isWarning = sensorReading.isWarning;

      // Update the critical material's emissive intensity dynamically for pulsing
      if (isCritical) {
        const crits = Array.isArray(state.critical) ? state.critical : [state.critical];
        crits.forEach(m => {
          if ((m as any).emissiveIntensity !== undefined) {
            (m as any).emissiveIntensity = 0.5 + pulseIntensity * 0.5; // pulses between 0.5 and 1.0
          }
        });
      }
    }

    if (focusedMesh && state.mesh.uuid === focusedMesh.uuid) {
      state.mesh.material = isCritical ? state.critical : state.highlight;
    } else if (focusedMesh) {
      state.mesh.material = state.ghost;
    } else {
      if (isCritical) {
        state.mesh.material = state.critical;
      } else {
        state.mesh.material = ghostingEnabled.value ? state.ghost : state.original;
      }
    }
  });
}

function handleMappingUpdate(uuid: string, sensorId: string): void {
  sensorMappings.value = { ...sensorMappings.value, [uuid]: sensorId };
  // Save to localStorage
  localStorage.setItem('iot-sensor-mappings', JSON.stringify(sensorMappings.value));
  applyInteractionMaterials();
}

async function handleDrop(event: DragEvent): Promise<void> {
  isDragging.value = false;
  const files = event.dataTransfer?.files;

  if (!files || files.length === 0) return;

  // Group files by base name
  const fileMap = new Map<string, { [key: string]: File }>();
  for (let file of Array.from(files)) {
    const baseName = file.name.replace(/\.(obj|mtl|glb|gltf)$/i, '');
    if (!fileMap.has(baseName)) {
      fileMap.set(baseName, {});
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext) {
      fileMap.get(baseName)![ext] = file;
    }
  }

  // Load the first model file found
  for (let [, files] of fileMap) {
    try {
      const mainFile = files.obj || files.glb || files.gltf;
      if (!mainFile) continue;

      loadingStatus.value = { type: 'loading', message: `Loading ${mainFile.name}...` };
      console.log('Loading model:', mainFile.name);

      // Remove previous model
      if (currentModel.value) {
        clearInteractionMaterials();
        modelManager.removeModel('dropped-model');
        scene.remove(currentModel.value);
        currentModel.value = null;
      }

      // Load the model
      const model = await modelManager.loadModelFromFiles('dropped-model', mainFile, files.mtl);
      currentModel.value = model;
      buildInteractionMaterials(model);
      console.log('Model loaded successfully:', model);

      loadingStatus.value = { type: 'success', message: `Loaded: ${mainFile.name}` };
      setTimeout(() => {
        loadingStatus.value = null;
      }, 2000);

      // Fit camera to model
      fitCameraToModel(model);
      deselectObject();
      break;
    } catch (error) {
      console.error('Error loading model:', error);
      loadingStatus.value = {
        type: 'error',
        message: `Failed to load model: ${error instanceof Error ? error.message : String(error)}`
      };
      setTimeout(() => {
        loadingStatus.value = null;
      }, 3000);
    }
  }
}

function fitCameraToModel(model: THREE.Object3D): void {
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

function animate(): void {
  controls.update();
  applyInteractionMaterials(); // Continuously update to pulse critical materials
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
}

onMounted(() => {
  // Load sensor mappings
  const savedMappings = localStorage.getItem('iot-sensor-mappings');
  if (savedMappings) {
    try {
      sensorMappings.value = JSON.parse(savedMappings);
    } catch {}
  }

  // Connect WebSocket
  const host = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
  ioSocket.value = io(host);

  ioSocket.value.on('sensors-info', (info: any) => {
    console.log('📡 Received sensors-info:', info);
    sensorsInfo.value = info;
  });

  ioSocket.value.on('sensor-update', (data: any[]) => {
    console.log('📊 Received sensor-update:', data);
    const newData = { ...sensorData.value };
    data.forEach(d => { newData[d.id] = d; });
    sensorData.value = newData;
  });

  checkApi();
  initThree();
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  if (handleResize) {
    window.removeEventListener('resize', handleResize);
  }

  if (controls) {
    controls.dispose();
  }

  if (modelManager) {
    clearInteractionMaterials();
    modelManager.disposeAll();
  }

  if (ioSocket.value) {
    ioSocket.value.disconnect();
  }

  if (renderer) {
    renderer.dispose();
  }
});

</script>

<style>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.viewport-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
}

.workspace-row {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.floating-dashboard-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px;
  border-top: 1px solid #333;
  z-index: 10;
}

.floating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.close-overlay {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
}
</style>
