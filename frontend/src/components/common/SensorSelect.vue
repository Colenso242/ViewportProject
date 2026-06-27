<template>
  <select class="select-control" :value="modelValue" @change="onChange">
    <option v-if="placeholder !== undefined" value="">{{ placeholder }}</option>
    <option v-for="sensor in sensorsInfo" :key="sensor.id" :value="sensor.id">
      {{ label(sensor) }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';
import type { SensorConfig } from '../../types';

const props = defineProps<{
  modelValue: string;
  /** When provided, renders an empty leading option (e.g. "-- No Sensor --"). */
  placeholder?: string;
  /** Default to the first sensor once the catalog loads and nothing is chosen. */
  autoSelectFirst?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { sensorsInfo } = storeToRefs(useSensorStore());

// One consistent label everywhere, e.g. "temp-1 · Temperature (°C)".
function label(sensor: SensorConfig): string {
  const name = sensor.name?.trim();
  const unit = sensor.unit?.trim();
  return `${sensor.id}${name ? ` · ${name}` : ''}${unit ? ` (${unit})` : ''}`;
}

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value);
}

watch(
  sensorsInfo,
  (info) => {
    if (props.autoSelectFirst && info.length > 0 && !props.modelValue) {
      emit('update:modelValue', info[0].id);
    }
  },
  { immediate: true }
);
</script>
