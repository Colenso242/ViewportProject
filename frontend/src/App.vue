<template>
  <main class="app-shell">
    <Toolbar
      :api-status="apiStatus"
      :show-object-tree="showObjectTree"
      @toggle-tree="toggleObjectTree"
    />

    <div class="main-container">
      <ObjectTree
        v-if="showObjectTree"
        :object-tree-items="objectTreeItems"
        :selected-object="selectedObject"
        @select="selectObject"
      />

      <Viewport3D
        ref="viewportComponent"
        :is-dragging="isDragging"
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
            @close="deselectObject"
            @toggle-visibility="selectedObject.visible = !selectedObject.visible"
          />
        </template>
      </Viewport3D>
    </div>

    <LoadingIndicator :loading-status="loadingStatus" />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, ComponentPublicInstance } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelManager } from './utils/ModelManager';
import Toolbar from './components/Toolbar.vue';
import ObjectTree from './components/ObjectTree.vue';
import Viewport3D from './components/Viewport3D.vue';
import ObjectInfo from './components/ObjectInfo.vue';
import LoadingIndicator from './components/LoadingIndicator.vue';
import './App.css';

interface LoadingStatusType {
  type: 'loading' | 'success' | 'error';
  message: string;
}

const viewport = ref<HTMLElement | null>(null);
const viewportComponent = ref<ComponentPublicInstance | null>(null);
const apiStatus = ref<string>('checking...');
const isDragging = ref<boolean>(false);
const loadingStatus = ref<LoadingStatusType | null>(null);
const showObjectTree = ref<boolean>(false);
const selectedObject = ref<THREE.Object3D | null>(null);
const hoveredObject = ref<THREE.Object3D | null>(null);

let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let cube: THREE.Mesh | undefined;
let controls: OrbitControls;
let frameId: number;
let handleResize: (() => void) | undefined;
let modelManager: ModelManager;
let currentModel: THREE.Object3D | null = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

interface MeshMaterialState {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
  ghost: THREE.Material | THREE.Material[];
  highlight: THREE.Material | THREE.Material[];
}

const meshMaterialStates = new Map<string, MeshMaterialState>();

const objectTreeItems = computed(() => {
  if (!currentModel) return [];
  const items: THREE.Object3D[] = [];
  currentModel.traverse((child) => {
    if (child !== currentModel) {
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

  // default cube
  // const geometry = new THREE.BoxGeometry(1, 1, 1);
  // const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
  // cube = new THREE.Mesh(geometry, material);
  // scene.add(cube);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false;

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
    selectObject(hit);
    return;
  }

  deselectObject();
}

function handleViewportPointerLeave(): void {
  deselectObject();
}

function pickObject(event: MouseEvent): THREE.Object3D | null {
  const viewportEl = (viewportComponent.value as any)?.viewportElement;
  if (!viewportEl || !currentModel) {
    return null;
  }

  const rect = viewportEl.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(currentModel, true);
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

    meshMaterialStates.set(mesh.uuid, {
      mesh,
      original,
      ghost,
      highlight
    });
  });

  applyInteractionMaterials();
}

function clearInteractionMaterials(): void {
  meshMaterialStates.forEach(({ mesh, original, ghost, highlight }) => {
    if (mesh.material !== original) {
      mesh.material = original;
    }

    const ghostMaterials = Array.isArray(ghost) ? ghost : [ghost];
    ghostMaterials.forEach((material) => material.dispose());

    const highlightMaterials = Array.isArray(highlight) ? highlight : [highlight];
    highlightMaterials.forEach((material) => material.dispose());
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
  if (!currentModel || meshMaterialStates.size === 0) return;

  const focusedMesh = resolveFocusedMesh();

  meshMaterialStates.forEach((state) => {
    if (focusedMesh && state.mesh.uuid === focusedMesh.uuid) {
      state.mesh.material = state.highlight;
    } else {
      state.mesh.material = state.ghost;
    }
  });
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
      if (currentModel) {
        clearInteractionMaterials();
        modelManager.removeModel('dropped-model');
        scene.remove(currentModel);
        currentModel = null;
      }

      // Load the model
      const model = await modelManager.loadModelFromFiles('dropped-model', mainFile, files.mtl);
      currentModel = model;
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
  if (handleResize) {
    window.removeEventListener('resize', handleResize);
  }

  if (controls) {
    controls.dispose();
  }

  if (cube) {
    cube.geometry.dispose();
    cube.material.dispose();
  }

  if (modelManager) {
    clearInteractionMaterials();
    modelManager.disposeAll();
  }


  if (renderer) {
    renderer.dispose();
  }
});

</script>