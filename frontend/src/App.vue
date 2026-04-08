<template>
  <main class="app-shell">
    <header class="toolbar">
      <h1>Three.js Viewport</h1>
      <small>API status: {{ apiStatus }}</small>
    </header>

    <section ref="viewport" class="viewport" aria-label="3D viewport"></section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const viewport = ref(null);
const apiStatus = ref('checking...');

let renderer;
let camera;
let scene;
let cube;
let controls;
let frameId;
let handleResize;

async function checkApi() {
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    apiStatus.value = payload.status;
  } catch (_error) {
    apiStatus.value = 'offline';
  }
}

function initThree() {
  const el = viewport.value;
  const width = el.clientWidth;
  const height = el.clientHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  el.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(0, 1, 3);

  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(2, 4, 3);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  handleResize = () => {
    const nextWidth = el.clientWidth;
    const nextHeight = el.clientHeight;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
  };

  window.addEventListener('resize', handleResize);
}

function animate() {
  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.015;
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
  window.removeEventListener('resize', handleResize);

  if (controls) {
    controls.dispose();
  }

  if (cube) {
    cube.geometry.dispose();
    cube.material.dispose();
  }

  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #0f172a;
  color: #f8fafc;
}

.app-shell {
  min-height: 100vh;
  padding: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.toolbar h1 {
  margin: 0;
  font-size: 1.25rem;
}

.viewport {
  width: 100%;
  height: calc(100vh - 4rem);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>

