import * as THREE from 'three';
import { shallowRef } from 'vue';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelManager } from '../utils/ModelManager';

export function useThreeScene() {
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let controls: OrbitControls;
  let modelManager: ModelManager;
  let frameId: number;
  let handleResize: (() => void) | undefined;

  const cameraRef = shallowRef<THREE.PerspectiveCamera | null>(null);

  function initThree(viewportEl: HTMLElement) {
    const width = viewportEl.clientWidth;
    const height = viewportEl.clientHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    viewportEl.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 50, 100);

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);
    cameraRef.value = camera;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 3, -5);
    scene.add(pointLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;

    modelManager = new ModelManager(scene);

    handleResize = () => {
      const nextWidth = viewportEl.clientWidth;
      const nextHeight = viewportEl.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener('resize', handleResize);
  }

  function startAnimationLoop(onFrame: () => void) {
    const animate = () => {
      controls.update();
      onFrame();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();
  }

  function stopAnimationLoop() {
    cancelAnimationFrame(frameId);
    if (handleResize) {
      window.removeEventListener('resize', handleResize);
    }
    if (controls) controls.dispose();
    if (renderer) renderer.dispose();
    if (modelManager) modelManager.disposeAll();
  }

  function fitCameraToModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;

    const center = box.getCenter(new THREE.Vector3());
    camera.position.copy(center);
    camera.position.z += cameraZ;
    controls.target.copy(center);
    controls.update();
  }

  return {
    initThree,
    startAnimationLoop,
    stopAnimationLoop,
    fitCameraToModel,
    cameraRef,
    getScene: () => scene,
    getModelManager: () => modelManager,
  };
}

