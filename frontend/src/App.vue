<template>
  <main class="app-shell">
    <Toolbar
      :api-status="apiStatus"
      :show-object-tree="showObjectTree"
      :ghosting-enabled="ghostingEnabled"
      :placement-mode="placementMode"
      @toggle-tree="toggleObjectTree"
      @toggle-ghosting="toggleGhosting"
      @toggle-overview="toggleOverview"
      @toggle-placement="togglePlacementMode"
    />

    <div class="main-container">
      <div class="viewport-wrapper">
        <div class="workspace-row">
          <ObjectTree
            v-if="showObjectTree"
            :object-tree-items="objectTreeItems"
            :selected-object="selectedObject"
            @select="selectObject"
          />

          <Viewport3D
            ref="viewportComponent"
            :is-dragging="isDragging"
            :has-model="!!currentModel"
            :placement-mode="placementMode"
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
                :pointSensors="pointSensors"
                :getPointWorldPosition="getPointWorldPosition"
              />

              <!-- Floating Overlay Dashboard -->
              <div v-if="selectedSensorId && !showOverview" class="floating-dashboard-overlay">
                <div class="floating-header">
                  <span>Sensor <span class="sensor-tag">{{ selectedSensorId }}</span></span>
                  <button @click="deselectObject" class="icon-btn danger-hover" title="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
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
import { onBeforeUnmount, onMounted, ref, computed, watch, ComponentPublicInstance } from 'vue';
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
import { SensorPointMarkers } from './utils/SensorPointMarkers';
import type { SensorPoint } from './types';

const viewportComponent = ref<ComponentPublicInstance | null>(null);

const sensorStore = useSensorStore();
const sceneStore = useSceneStore();

const { sensorData, sensorsInfo, sensorMappings, pointSensors } = storeToRefs(sensorStore);
const {
  showObjectTree, showOverview, ghostingEnabled, isDragging, placementMode,
  loadingStatus, selectedObject, hoveredObject, currentModel
} = storeToRefs(sceneStore);

const pointMarkers = new SensorPointMarkers();

const apiStatus = ref<string>('checking...');

const {
  initThree, startAnimationLoop, stopAnimationLoop, fitCameraToModel, cameraRef, getScene, getModelManager
} = useThreeScene();

const { pickObject, pickIntersection } = useRaycaster(cameraRef, currentModel);

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

function togglePlacementMode(): void {
  sceneStore.togglePlacementMode();
}

function getPointWorldPosition(placementId: string, target: THREE.Vector3): THREE.Vector3 | null {
  return pointMarkers.getWorldPosition(placementId, target);
}

function placeSensorPoint(worldPoint: THREE.Vector3): void {
  const model = currentModel.value;
  if (!model || !sceneStore.currentModelId) return;

  const local = model.worldToLocal(worldPoint.clone());
  const point: SensorPoint = {
    placementId: crypto.randomUUID(),
    modelId: sceneStore.currentModelId,
    sensorId: '',
    position: { x: local.x, y: local.y, z: local.z }
  };

  sceneStore.placementMode = false;
  void sensorStore.addPointSensor(point);
  pointMarkers.sync(pointSensors.value);

  // Select the new marker so the properties panel opens with the sensor picker.
  const marker = pointMarkers.getMarker(point.placementId);
  if (marker) selectObject(marker);
}

function handleViewportClick(event: MouseEvent): void {
  const viewportEl = (viewportComponent.value as any)?.viewportElement;

  if ((placementMode.value || event.shiftKey) && currentModel.value) {
    const intersection = pickIntersection(event, viewportEl);
    if (intersection && !intersection.object.userData.isSensorPointMarker) {
      placeSensorPoint(intersection.point);
      return;
    }
  }

  const hit = pickObject(event, viewportEl);
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
    const baseName = file.name.replace(/\.(obj|mtl|glb|gltf|ifc)$/i, '');
    if (!fileMap.has(baseName)) fileMap.set(baseName, {});
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext) fileMap.get(baseName)![ext] = file;
  }

  for (let [, files] of fileMap) {
    const manager = getModelManager();
    try {
      const mainFile = files.ifc || files.obj || files.glb || files.gltf;
      if (!mainFile) continue;

      sceneStore.setLoading('loading', `Loading ${mainFile.name}...`);
      manager.onImportProgress = (percent, stage) => {
        const verb = stage === 'parse' ? 'Parsing' : 'Reading';
        sceneStore.setLoading('loading', `${verb} ${mainFile.name}… ${percent}%`);
      };

      if (currentModel.value) {
        pointMarkers.detach();
        clearInteractionMaterials();
        manager.removeModel('dropped-model');
        getScene().remove(currentModel.value);
        currentModel.value = null;
      }

      const model = await manager.loadModelFromFiles('dropped-model', mainFile, files.mtl);
      manager.onImportProgress = null;
      currentModel.value = model;
      buildInteractionMaterials(model);

      // Stable per-file identifier; keys the persisted sensor placements.
      const modelId = `${mainFile.name}:${mainFile.size}`;
      sceneStore.currentModelId = modelId;
      pointMarkers.attach(model);
      await sensorStore.loadPointSensors(modelId);
      pointMarkers.sync(pointSensors.value);

      sceneStore.setLoading('success', `Loaded: ${mainFile.name}`);
      setTimeout(() => sceneStore.setLoading(null), 2000);

      fitCameraToModel(model);
      deselectObject();
      break;
    } catch (error) {
      manager.onImportProgress = null;
      sceneStore.setLoading('error', `Failed: ${error}`);
      setTimeout(() => sceneStore.setLoading(null), 3000);
    }
  }
}

watch(pointSensors, (points) => {
  pointMarkers.sync(points);

  // Deselect markers whose placement was removed.
  const selected = selectedObject.value;
  const selectedPointId = selected?.userData.sensorPointId;
  if (selectedPointId && !points.some(p => p.placementId === selectedPointId)) {
    deselectObject();
  }
});

onMounted(() => {
  sensorStore.loadMappings();
  sensorStore.initSocket();

  checkApi();
  const el = (viewportComponent.value as any)?.viewportElement;
  if (el) initThree(el);

  startAnimationLoop();
});

onBeforeUnmount(() => {
  stopAnimationLoop();
  clearInteractionMaterials();
  pointMarkers.dispose();
});

</script>
