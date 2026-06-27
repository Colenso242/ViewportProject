import * as THREE from 'three';
import { shallowRef } from 'vue';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ModelManager } from '../utils/ModelManager';

export function useThreeScene() {
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let controls: OrbitControls;
  let composer: EffectComposer;
  let modelManager: ModelManager;
  let frameId: number;
  let handleResize: (() => void) | undefined;

  const cameraRef = shallowRef<THREE.PerspectiveCamera | null>(null);

  function initThree(viewportEl: HTMLElement) {
    const width = viewportEl.clientWidth;
    const height = viewportEl.clientHeight;

    // ACES tone mapping + sRGB output + soft shadows give a more cinematic look;
    // tone mapping is applied at the end of the post-processing chain (OutputPass).
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    viewportEl.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = makeGradientBackground();

    // Soft image-based ambient from a procedural room: gives every PBR material
    // gentle reflections and grounded shading instead of a flat fill light.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);
    cameraRef.value = camera;

    // Cool-toned sky/ground ambient: lifts the whole model with a subtle
    // top-to-bottom gradient (cool blue above, muted slate below).
    const hemiLight = new THREE.HemisphereLight(0x9db8ff, 0x33405c, 0.9);
    scene.add(hemiLight);

    // Low ambient floor so faces turned away from every light still read
    // (no pure-black surfaces), kept faint and cool so it doesn't wash shading.
    const ambientLight = new THREE.AmbientLight(0x6b7da6, 0.18);
    scene.add(ambientLight);

    // Key light — the main shaper, casts soft shadows.
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.normalBias = 0.02;
    const shadowCam = keyLight.shadow.camera;
    shadowCam.near = 0.5;
    shadowCam.far = 40;
    shadowCam.left = shadowCam.bottom = -6;
    shadowCam.right = shadowCam.top = 6;
    scene.add(keyLight);

    // Fill — softens the shadow side with a faint cool tint.
    const fillLight = new THREE.DirectionalLight(0xbcd2ff, 0.5);
    fillLight.position.set(-8, 4, -2);
    scene.add(fillLight);

    // Rim — an accent-blue back light that traces a cool glow along edges.
    const rimLight = new THREE.DirectionalLight(0x4f8ff7, 1.2);
    rimLight.position.set(-5, 6, -8);
    scene.add(rimLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;

    modelManager = new ModelManager(scene);

    // Post-processing: render the scene, add a soft bloom over the brightest
    // areas (key-lit faces, emissive warning/critical pulses, accent rim), then
    // tone-map + convert color space in the final OutputPass.
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.55, // strength
      0.5,  // radius
      0.85  // luminance threshold — only bright pixels glow
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    handleResize = () => {
      const nextWidth = viewportEl.clientWidth;
      const nextHeight = viewportEl.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      composer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener('resize', handleResize);
  }

  function startAnimationLoop(onFrame?: () => void) {
    const animate = () => {
      controls.update();
      onFrame?.();
      composer.render();
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
    if (composer) composer.dispose();
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

  /**
   * Frame a single object: re-center the orbit on its bounds and pull the camera
   * to a fitting distance while preserving the current view direction.
   */
  function focusObject(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 0.5;
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.max(Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6, 0.5);

    const direction = new THREE.Vector3().subVectors(camera.position, controls.target);
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    direction.normalize();

    camera.position.copy(center).addScaledVector(direction, distance);
    controls.target.copy(center);
    controls.update();
  }

  // A vertical gradient drawn into the scene background (rather than via CSS), so
  // it survives the post-processing chain and stays dark enough not to bloom.
  function makeGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#16203a');
      grad.addColorStop(1, '#070b14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  return {
    initThree,
    startAnimationLoop,
    stopAnimationLoop,
    fitCameraToModel,
    focusObject,
    cameraRef,
    getScene: () => scene,
    getModelManager: () => modelManager,
  };
}

