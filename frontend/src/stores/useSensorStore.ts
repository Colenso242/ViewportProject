import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '../services/SocketService';
import type { SensorReading, SensorConfig } from '../types';

const MAPPINGS_STORAGE_KEY = 'iot-sensor-mappings-v2';

export const useSensorStore = defineStore('sensorStore', () => {
  const sensorData = ref<Record<string, SensorReading>>({});
  const sensorsInfo = ref<SensorConfig[]>([]);
  // stableMeshId -> sensorId
  const sensorMappings = ref<Record<string, string>>({});

  function initSocket() {
    const socket = socketService.connect();

    socket.on('sensors-info', (info: SensorConfig[]) => {
      sensorsInfo.value = info;
    });

    socket.on('sensor-update', (data: SensorReading[]) => {
      const newData = { ...sensorData.value };
      data.forEach(d => { newData[d.id] = d; });
      sensorData.value = newData;
    });
  }

  function disconnectSocket() {
    const socket = socketService.getSocket();
    if (socket) {
      socket.off('sensors-info');
      socket.off('sensor-update');
    }
    socketService.disconnect();
    sensorData.value = {};
    sensorsInfo.value = [];
  }

  function loadMappings() {
    const saved = localStorage.getItem(MAPPINGS_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        sensorMappings.value = parsed;
      }
    } catch (err) {
      console.warn('Failed to parse stored sensor mappings; resetting.', err);
      localStorage.removeItem(MAPPINGS_STORAGE_KEY);
    }
  }

  function updateMapping(stableId: string, sensorId: string) {
    const next = { ...sensorMappings.value };
    if (sensorId) {
      next[stableId] = sensorId;
    } else {
      delete next[stableId];
    }
    sensorMappings.value = next;
    localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(next));
  }

  return {
    sensorData,
    sensorsInfo,
    sensorMappings,
    initSocket,
    disconnectSocket,
    loadMappings,
    updateMapping
  };
});
