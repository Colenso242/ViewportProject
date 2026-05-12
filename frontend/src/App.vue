<template>
  <main class="app-shell">
    <Toolbar
      :api-status="apiStatus"
      :show-object-tree="showObjectTree"
      :ghosting-enabled="ghostingEnabled"
      @toggle-tree="toggleObjectTree"
      @toggle-ghosting="toggleGhosting"
      @toggle-overview="toggleOverview"
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
                <TimeseriesDashboard :sensorId="selectedSensorId" />
              </div>
            </template>
          </Viewport3D>

          <PropertiesPanel
            v-if="selectedObject"
            :selected-object="selectedObject"
            @close="deselectObject"
          />
        </div>
      </div>

      <OverviewPanel
        v-if="showOverview"
        @close="showOverview = false"
      />

    </div>

    <LoadingIndicator :loading-status="loadingStatus" />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, ComponentPublicInstance } from 'vue';
import * as THREE from 'three';
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

import { useSensorStore } from './stores/useSensorStore';
import { useSceneStore } from './stores/useSceneStore';
import { useThreeScene } from './composables/useThreeScene';
import { useRaycaster } from './composables/useRaycaster';
import { useMaterialManager } from './composables/useMaterialManager';
import { storeToRefs } from 'pinia';
import { ApiService } from './services/ApiService';

const viewportComponent = ref<ComponentPublicInstance | null>(null);

const sensorStore = useSensorStore();
const sceneStore = useSceneStore();

const { sensorData, sensorsInfo, sensorMappings } = storeToRefs(sensorStore);
const {
  showObjectTree, showOverview, ghostingEnabled, isDragging,
  loadingStatus, selectedObject, hoveredObject, currentModel
} = storeToRefs(sceneStore);

const apiStatus = ref<string>('checking...');

const {
  initThree, startAnimationLoop, stopAnimationLoop, fitCameraToModel, cameraRef, getScene, getModelManager
} = useThreeScene();

const { pickObject } = useRaycaster(cameraRef, currentModel);

const {
  buildInteractionMaterials, clearInteractionMaterials, applyInteractionMaterials
} = useMaterialManager(sensorMappings, sensorData, ghostingEnabled);

const selectedSensorId = computed(() => {
  if (selectedObject.value) {
    return sensorMappings.value[selectedObject.value.uuid] || null;
  }
  return null;
});

const objectTreeItems = computed(() => {
  if (!currentModel.value) return [];
  const items: THREE.Object3D[] = [];
  currentModel.value.traverse((child) => {
    if (child !== currentModel.value) items.push(child);
  });
  return items;
});

async function checkApi(): Promise<void> {
  try {
    const { status } = await ApiService.checkHealth();
    apiStatus.value = status;
  } catch {
    apiStatus.value = 'offline';
  }
}

function toggleObjectTree(): void {
  sceneStore.toggleObjectTree();
}

function toggleGhosting(): void {
  sceneStore.toggleGhosting();
  applyInteractionMaterials(hoveredObject.value, selectedObject.value);
}

function toggleOverview(): void {
  sceneStore.toggleOverview();
}

function handleViewportClick(event: MouseEvent): void {
  const hit = pickObject(event, (viewportComponent.value as any)?.viewportElement);
  if (hit) selectObject(hit);
  else deselectObject();
}

function selectObject(obj: THREE.Object3D): void {
  hoveredObject.value = obj;
  selectedObject.value = obj;
  applyInteractionMaterials(hoveredObject.value, selectedObject.value);
}

function deselectObject(): void {
  hoveredObject.value = null;
  selectedObject.value = null;
  applyInteractionMaterials(hoveredObject.value, selectedObject.value);
}

function handleViewportPointerMove(event: MouseEvent): void {
  const hit = pickObject(event, (viewportComponent.value as any)?.viewportElement);
  if (hit) {
    if (hoveredObject.value !== hit) {
      hoveredObject.value = hit;
      applyInteractionMaterials(hoveredObject.value, selectedObject.value);
    }
  } else if (hoveredObject.value !== null) {
    hoveredObject.value = null;
    applyInteractionMaterials(hoveredObject.value, selectedObject.value);
  }
}

function handleViewportPointerLeave(): void {
  if (hoveredObject.value !== null) {
    hoveredObject.value = null;
    applyInteractionMaterials(hoveredObject.value, selectedObject.value);
  }
}

async function handleDrop(event: DragEvent): Promise<void> {
  sceneStore.isDragging = false;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const fileMap = new Map<string, { [key: string]: File }>();
  for (let file of Array.from(files)) {
    const baseName = file.name.replace(/\.(obj|mtl|glb|gltf)$/i, '');
    if (!fileMap.has(baseName)) fileMap.set(baseName, {});
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext) fileMap.get(baseName)![ext] = file;
  }

  for (let [, files] of fileMap) {
    try {
      const mainFile = files.obj || files.glb || files.gltf;
      if (!mainFile) continue;

      sceneStore.setLoading('loading', `Loading ${mainFile.name}...`);

      if (currentModel.value) {
        clearInteractionMaterials();
        getModelManager().removeModel('dropped-model');
        getScene().remove(currentModel.value);
        currentModel.value = null;
      }

      const model = await getModelManager().loadModelFromFiles('dropped-model', mainFile, files.mtl);
      currentModel.value = model;
      buildInteractionMaterials(model);

      sceneStore.setLoading('success', `Loaded: ${mainFile.name}`);
      setTimeout(() => sceneStore.setLoading(null), 2000);

      fitCameraToModel(model);
      deselectObject();
      break;
    } catch (error) {
      sceneStore.setLoading('error', `Failed: ${error}`);
      setTimeout(() => sceneStore.setLoading(null), 3000);
    }
  }
}

function onFrame() {
  applyInteractionMaterials(hoveredObject.value, selectedObject.value);
}

onMounted(() => {
  sensorStore.loadMappings();
  sensorStore.initSocket();

  checkApi();
  const el = (viewportComponent.value as any)?.viewportElement;
  if (el) initThree(el);

  startAnimationLoop(onFrame);
});

onBeforeUnmount(() => {
  stopAnimationLoop();
  clearInteractionMaterials();
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
