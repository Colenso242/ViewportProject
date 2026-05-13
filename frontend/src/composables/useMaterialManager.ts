import * as THREE from 'three';
import { Ref } from 'vue';

interface MeshMaterialState {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
  ghost: THREE.Material | THREE.Material[];
  highlight: THREE.Material | THREE.Material[];
  critical: THREE.Material | THREE.Material[];
}

type ColoredMaterial = THREE.Material & { color: THREE.Color };
type EmissiveMaterial = THREE.Material & { emissive: THREE.Color; emissiveIntensity: number };

function hasColor(m: THREE.Material): m is ColoredMaterial {
  return 'color' in m && (m as ColoredMaterial).color instanceof THREE.Color;
}

function hasEmissive(m: THREE.Material): m is EmissiveMaterial {
  return 'emissive' in m && (m as EmissiveMaterial).emissive instanceof THREE.Color;
}

const HIGHLIGHT_TINT = new THREE.Color(0xfbbf24);
const HIGHLIGHT_EMISSIVE = new THREE.Color(0x664400);
const CRITICAL_TINT = new THREE.Color(0xef4444);
const CRITICAL_EMISSIVE = new THREE.Color(0x990000);
const WARNING_EMISSIVE = new THREE.Color(0xb45309);

export function useMaterialManager(
  sensorMappings: Ref<Record<string, string>>,
  sensorData: Ref<Record<string, any>>,
  ghostingEnabled: Ref<boolean>
) {
  const meshMaterialStates = new Map<string, MeshMaterialState>();

  function createGhostMaterial(material: THREE.Material): THREE.Material {
    const ghost = material.clone();
    ghost.transparent = true;
    ghost.opacity = 0.13;
    ghost.depthWrite = false;
    return ghost;
  }

  function createHighlightMaterial(material: THREE.Material): THREE.Material {
    const highlight = material.clone();
    highlight.transparent = true;
    highlight.opacity = 0.95;
    highlight.depthWrite = true;
    if (hasColor(highlight)) highlight.color.lerp(HIGHLIGHT_TINT, 0.35);
    if (hasEmissive(highlight)) {
      highlight.emissive.copy(HIGHLIGHT_EMISSIVE);
      highlight.emissiveIntensity = 0.45;
    }
    return highlight;
  }

  function createCriticalMaterial(material: THREE.Material): THREE.Material {
    const crit = material.clone();
    crit.transparent = true;
    crit.opacity = 0.9;
    crit.depthWrite = true;
    if (hasColor(crit)) crit.color.lerp(CRITICAL_TINT, 0.8);
    if (hasEmissive(crit)) {
      crit.emissive.copy(CRITICAL_EMISSIVE);
      crit.emissiveIntensity = 0.8;
    }
    return crit;
  }

  function buildInteractionMaterials(model: THREE.Object3D): void {
    clearInteractionMaterials();
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;

      const original = mesh.material;
      const ghost = Array.isArray(original) ? original.map(createGhostMaterial) : createGhostMaterial(original);
      const highlight = Array.isArray(original) ? original.map(createHighlightMaterial) : createHighlightMaterial(original);
      const critical = Array.isArray(original) ? original.map(createCriticalMaterial) : createCriticalMaterial(original);

      meshMaterialStates.set(mesh.uuid, { mesh, original, ghost, highlight, critical });
    });
    applyInteractionMaterials(null, null);
  }

  function clearInteractionMaterials(): void {
    meshMaterialStates.forEach(({ mesh, original, ghost, highlight, critical }) => {
      if (mesh.material !== original) mesh.material = original;
      [ghost, highlight, critical].flat().forEach(m => m.dispose());
    });
    meshMaterialStates.clear();
  }

  function resolveFocusedMesh(hovered: THREE.Object3D | null, selected: THREE.Object3D | null): THREE.Mesh | null {
    const candidate = hovered ?? selected;
    if (!candidate) return null;
    const directMesh = candidate as THREE.Mesh;
    if (directMesh.isMesh) return directMesh;

    let firstMesh: THREE.Mesh | null = null;
    candidate.traverse((child) => {
      if (!firstMesh && (child as THREE.Mesh).isMesh) firstMesh = child as THREE.Mesh;
    });
    return firstMesh;
  }

  function applyInteractionMaterials(hovered: THREE.Object3D | null, selected: THREE.Object3D | null): void {
    if (meshMaterialStates.size === 0) return;

    const focusedMesh = resolveFocusedMesh(hovered, selected);
    const time = Date.now() * 0.003;
    const pulseIntensity = (Math.sin(time) + 1) / 2;

    meshMaterialStates.forEach((state) => {
      const sensorId = sensorMappings.value[state.mesh.uuid];
      const isCritical = sensorId && sensorData.value[sensorId]?.isCritical;
      const isWarning = sensorId && sensorData.value[sensorId]?.isWarning;

      if (isCritical || isWarning) {
        const crits = Array.isArray(state.critical) ? state.critical : [state.critical];
        const targetEmissive = (isWarning && !isCritical) ? WARNING_EMISSIVE : CRITICAL_EMISSIVE;
        crits.forEach(m => {
          if (hasEmissive(m)) {
            m.emissiveIntensity = 0.5 + pulseIntensity * 0.5;
            m.emissive.copy(targetEmissive);
          }
        });
      }

      if (focusedMesh && state.mesh.uuid === focusedMesh.uuid) {
        state.mesh.material = (isCritical || isWarning) ? state.critical : state.highlight;
      } else if (focusedMesh) {
        state.mesh.material = state.ghost;
      } else {
        if (isCritical || isWarning) state.mesh.material = state.critical;
        else state.mesh.material = ghostingEnabled.value ? state.ghost : state.original;
      }
    });
  }

  return { buildInteractionMaterials, clearInteractionMaterials, applyInteractionMaterials };
}
