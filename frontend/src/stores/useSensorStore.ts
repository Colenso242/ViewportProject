import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '../services/SocketService';
import type { SensorReading, SensorConfig } from '../types';

export const useSensorStore = defineStore('sensorStore', () => {
  const sensorData = ref<Record<string, SensorReading>>({});
  const sensorsInfo = ref<SensorConfig[]>([]);
  const sensorMappings = ref<Record<string, string>>({}); // uuid -> sensorId

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

  return {
    sensorData,
    sensorsInfo,
    sensorMappings,
    initSocket,
    loadMappings,
    updateMapping
  };
});

