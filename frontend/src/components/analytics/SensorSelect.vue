<template>
  <select :value="modelValue" @change="onChange" class="select-control widget-dropdown">
    <option v-for="sensor in sensorsInfo" :key="sensor.id" :value="sensor.id">
      {{ sensor.id }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSensorStore } from '../../stores/useSensorStore';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { sensorsInfo } = storeToRefs(useSensorStore());

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value);
}

// Default to the first sensor once the list is available and nothing is selected.
watch(sensorsInfo, (info) => {
  if (info && info.length > 0 && !props.modelValue) {
    emit('update:modelValue', info[0].id);
  }
}, { immediate: true });
</script>

<style scoped>
.widget-dropdown {
  margin-bottom: 1rem;
}
</style>
