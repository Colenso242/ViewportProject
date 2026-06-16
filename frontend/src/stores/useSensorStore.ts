import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '../services/SocketService';
import { ApiService } from '../services/ApiService';
import type { SensorReading, SensorConfig, SensorPoint } from '../types';

const POINTS_STORAGE_PREFIX = 'iot-sensor-points:';

export const useSensorStore = defineStore('sensorStore', () => {
  const sensorData = ref<Record<string, SensorReading>>({});
  const sensorsInfo = ref<SensorConfig[]>([]);
  const sensorMappings = ref<Record<string, string>>({}); // uuid -> sensorId
  const pointSensors = ref<SensorPoint[]>([]); // points placed on the current model

  function initSocket() {
    const socket = socketService.connect();

    socket.on('sensors-info', (info: SensorConfig[]) => {
      console.log('📡 Received sensors-info:', info);
      sensorsInfo.value = info;
    });

    socket.on('sensor-update', (data: SensorReading[]) => {
      // console.log('📊 Received sensor-update:', data);
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

  async function loadPointSensors(modelId: string): Promise<void> {
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
    removePointSensor
  };
});

