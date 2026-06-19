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

          <SensorPlacementsList
            v-if="currentModel && pointSensors.length"
            :selected-placement-id="selectedPlacementId"
            @select="selectPlacement"
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
            @pointer-move="handlePointerMove"
            @pointer-leave="handlePointerLeave"
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
                :viewportEl="viewportComponent?.viewportElement ?? null"
                :currentModel="currentModel"
                :sensorMappings="sensorMappings"
                :sensorData="sensorData"
                :pointSensors="pointSensors"
                :getPointWorldPosition="getPointWorldPosition"
                :animated="currentModelAnimated"
              />

              <!-- Floating Overlay Dashboard -->
              <!-- Seal pointer events here so they don't bubble to the viewport,
                   which would raycast into the scene behind the panel: clicks
                   would deselect (closing it) and moves would hover-highlight
                   meshes underneath. -->
              <Transition name="popover">
                <div
                  v-if="selectedSensorId && !showOverview"
                  class="floating-dashboard-overlay"
                  @click.stop
                  @mousedown.stop
                  @mousemove.stop
                >
                  <div class="floating-header">
                    <span>Sensor <span class="sensor-tag">{{ selectedSensorId }}</span></span>
                    <button @click="deselectObject" class="icon-btn danger-hover" title="Close">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <TimeseriesDashboard :sensorId="selectedSensorId" />
                </div>
              </Transition>
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
import { onBeforeUnmount, onMounted, ref, computed, watch, useTemplateRef } from 'vue';
import * as THREE from 'three';
import Toolbar from './components/viewport/Toolbar.vue';
import ObjectTree from './components/viewport/ObjectTree.vue';
import SensorPlacementsList from './components/viewport/SensorPlacementsList.vue';
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
import { useObjectInteraction } from './composables/useObjectInteraction';
import { useSensorPlacement } from './composables/useSensorPlacement';
import { useModelLoader } from './composables/useModelLoader';
import { storeToRefs } from 'pinia';
import { ApiService } from './services/ApiService';

const viewportComponent = useTemplateRef<InstanceType<typeof Viewport3D>>('viewportComponent');
function getViewportEl(): HTMLElement | undefined {
  return viewportComponent.value?.viewportElement ?? undefined;
}

const sensorStore = useSensorStore();
const sceneStore = useSceneStore();

const { sensorData, sensorMappings, pointSensors } = storeToRefs(sensorStore);
const {
  showObjectTree, showOverview, ghostingEnabled, isDragging, placementMode,
  loadingStatus, selectedObject, hoveredObject, currentModel
} = storeToRefs(sceneStore);

const apiStatus = ref<string>('checking...');

const {
  initThree, startAnimationLoop, stopAnimationLoop, fitCameraToModel, cameraRef, getScene, getModelManager
} = useThreeScene();

const { pickObject, pickIntersection } = useRaycaster(cameraRef, currentModel);

const {
  buildInteractionMaterials, clearInteractionMaterials, applyInteractionMaterials
} = useMaterialManager(sensorMappings, sensorData, ghostingEnabled);

const {
  selectObject, deselectObject, selectAt, handlePointerMove, handlePointerLeave
} = useObjectInteraction({ pickObject, applyInteractionMaterials, getViewportEl });

const {
  getPointWorldPosition, tryPlaceFromClick, selectPlacement, attachMarkers, detachMarkers, loadMarkersForModel
} = useSensorPlacement({ pickIntersection, getViewportEl, selectObject, deselectObject });

const { handleDrop } = useModelLoader({
  getModelManager, getScene, fitCameraToModel,
  buildInteractionMaterials, clearInteractionMaterials,
  deselectObject, attachMarkers, detachMarkers, loadMarkersForModel
});

// Re-color the model live as sensor readings arrive. The store swaps the whole
// sensorData object per socket batch, so this fires once per update (not every
// frame) — keeping critical/warning highlights in sync without a render-loop cost.
watch(sensorData, () => {
  applyInteractionMaterials(hoveredObject.value, selectedObject.value);
});

const selectedPlacementId = computed(() => selectedObject.value?.userData.sensorPointId ?? null);

const selectedSensorId = computed(() => {
  if (selectedObject.value) {
    return sensorMappings.value[selectedObject.value.uuid] || null;
  }
  return null;
});

// Animated models move their nodes at runtime, so cached world positions go stale.
const currentModelAnimated = computed(() =>
  !!currentModel.value && getModelManager().hasAnimations('dropped-model')
);

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

function handleViewportClick(event: MouseEvent): void {
  if (tryPlaceFromClick(event)) return;
  selectAt(event);
}

onMounted(() => {
  sensorStore.loadMappings();
  sensorStore.initSocket();

  checkApi();
  const el = getViewportEl();
  if (el) initThree(el);

  startAnimationLoop();

  // Warm the lazily code-split IFC loader during idle so the first .ifc import
  // is instant, without paying for it during startup.
  const warmIFC = () => getModelManager()?.prefetchIFCLoader();
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
  if (typeof idle === 'function') idle(warmIFC, { timeout: 3000 });
  else setTimeout(warmIFC, 2000);
});

onBeforeUnmount(() => {
  stopAnimationLoop();
  clearInteractionMaterials();
});

</script>
