import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '../services/SocketService';
import { ApiService } from '../services/ApiService';
import { Caretaker, Memento } from '../utils/Memento';
import type { SensorReading, SensorConfig, SensorPoint } from '../types';

const POINTS_STORAGE_PREFIX = 'iot-sensor-points:';

// The slice of store state that user edits mutate, captured by the undo history.
interface SensorEditState {
  sensorMappings: Record<string, string>;
  pointSensors: SensorPoint[];
}

export const useSensorStore = defineStore('sensorStore', () => {
  const sensorData = ref<Record<string, SensorReading>>({});
  const sensorsInfo = ref<SensorConfig[]>([]);
  const sensorMappings = ref<Record<string, string>>({}); // uuid -> sensorId
  const pointSensors = ref<SensorPoint[]>([]); // points placed on the current model

  // Caretaker for the memento history. The store itself is the originator:
  // `snapshot()` produces a memento, `applySnapshot()` restores from one.
  const history = new Caretaker<SensorEditState>();
  // Reactive mirrors of the (non-reactive) caretaker depth, so the UI can
  // enable/disable its undo/redo controls.
  const canUndo = ref(false);
  const canRedo = ref(false);
  function syncHistoryFlags(): void {
    canUndo.value = history.canUndo;
    canRedo.value = history.canRedo;
  }

  function initSocket() {
    const socket = socketService.connect();

    socket.on('sensors-info', (info: SensorConfig[]) => {
      if (import.meta.env.DEV) console.log('📡 Received sensors-info:', info);
      sensorsInfo.value = info;
    });

    socket.on('sensor-update', (data: SensorReading[]) => {
      const newData = { ...sensorData.value };
      data.forEach(d => { newData[d.id] = d; });
      sensorData.value = newData;
    });
  }

  function loadMappings() {
    const saved = localStorage.getItem('iot-sensor-mappings');
    if (saved) {
      try {
        sensorMappings.value = JSON.parse(saved);
      } catch {}
    }
  }

  function updateMapping(uuid: string, sensorId: string) {
    record();
    sensorMappings.value = { ...sensorMappings.value, [uuid]: sensorId };
    localStorage.setItem('iot-sensor-mappings', JSON.stringify(sensorMappings.value));
  }

  // --- Point sensors (persisted in the backend, localStorage as offline fallback) ---

  function savePointsLocally(modelId: string) {
    const points = pointSensors.value.filter(p => p.modelId === modelId);
    localStorage.setItem(POINTS_STORAGE_PREFIX + modelId, JSON.stringify(points));
  }

  function loadPointsLocally(modelId: string): SensorPoint[] {
    const saved = localStorage.getItem(POINTS_STORAGE_PREFIX + modelId);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }

  // --- Undo/redo via the memento pattern (this store is the originator) ---

  function snapshot(): Memento<SensorEditState> {
    return new Memento({
      sensorMappings: { ...sensorMappings.value },
      pointSensors: pointSensors.value.map(p => ({ ...p, position: { ...p.position } })),
    });
  }

  // Capture the pre-change state before a user edit so it can be undone.
  function record(): void {
    history.save(snapshot());
    syncHistoryFlags();
  }

  // Restore captured state and re-sync the persistence layers to match:
  // localStorage always, backend best-effort (by diffing the placement sets).
  function applySnapshot(state: SensorEditState): void {
    const before = pointSensors.value;
    sensorMappings.value = { ...state.sensorMappings };
    pointSensors.value = state.pointSensors.map(p => ({ ...p, position: { ...p.position } }));
    localStorage.setItem('iot-sensor-mappings', JSON.stringify(sensorMappings.value));

    new Set([...before, ...pointSensors.value].map(p => p.modelId)).forEach(savePointsLocally);
    reconcileBackend(before, pointSensors.value);
  }

  function reconcileBackend(before: SensorPoint[], after: SensorPoint[]): void {
    const beforeById = new Map(before.map(p => [p.placementId, p]));
    const afterById = new Map(after.map(p => [p.placementId, p]));
    for (const id of beforeById.keys()) {
      if (!afterById.has(id)) ApiService.deletePlacement(id).catch(() => {});
    }
    for (const [id, point] of afterById) {
      const prev = beforeById.get(id);
      if (!prev) ApiService.createPlacement(point).catch(() => {});
      else if (prev.sensorId !== point.sensorId) ApiService.updatePlacement(id, point.sensorId).catch(() => {});
    }
  }

  function undo(): void {
    const memento = history.undo(snapshot());
    if (memento) applySnapshot(memento.getState());
    syncHistoryFlags();
  }

  function redo(): void {
    const memento = history.redo(snapshot());
    if (memento) applySnapshot(memento.getState());
    syncHistoryFlags();
  }

  async function loadPointSensors(modelId: string): Promise<void> {
    // A different model's edits aren't meaningfully undoable here.
    history.clear();
    syncHistoryFlags();
    if (!modelId) {
      pointSensors.value = [];
      return;
    }
    try {
      pointSensors.value = await ApiService.fetchPlacements(modelId);
      savePointsLocally(modelId);
    } catch (error) {
      console.warn('Placements API unavailable, using local copy:', error);
      pointSensors.value = loadPointsLocally(modelId);
    }
  }

  async function addPointSensor(point: SensorPoint): Promise<void> {
    record();
    pointSensors.value = [...pointSensors.value, point];
    savePointsLocally(point.modelId);
    try {
      await ApiService.createPlacement(point);
    } catch (error) {
      console.warn('Failed to persist placement to backend:', error);
    }
  }

  async function setPointSensorLink(placementId: string, sensorId: string): Promise<void> {
    const point = pointSensors.value.find(p => p.placementId === placementId);
    if (!point) return;
    record();
    pointSensors.value = pointSensors.value.map(p =>
      p.placementId === placementId ? { ...p, sensorId } : p
    );
    savePointsLocally(point.modelId);
    try {
      await ApiService.updatePlacement(placementId, sensorId);
    } catch (error) {
      console.warn('Failed to persist placement update to backend:', error);
    }
  }

  async function removePointSensor(placementId: string): Promise<void> {
    const point = pointSensors.value.find(p => p.placementId === placementId);
    if (!point) return;
    record();
    pointSensors.value = pointSensors.value.filter(p => p.placementId !== placementId);
    savePointsLocally(point.modelId);
    try {
      await ApiService.deletePlacement(placementId);
    } catch (error) {
      console.warn('Failed to persist placement removal to backend:', error);
    }
  }

  return {
    sensorData,
    sensorsInfo,
    sensorMappings,
    pointSensors,
    initSocket,
    loadMappings,
    updateMapping,
    loadPointSensors,
    addPointSensor,
    setPointSensorLink,
    removePointSensor,
    undo,
    redo,
    canUndo,
    canRedo
  };
});

