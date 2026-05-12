import * as THREE from 'three';
import { Ref } from 'vue';

interface MeshMaterialState {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
  ghost: THREE.Material | THREE.Material[];
  highlight: THREE.Material | THREE.Material[];
  critical: THREE.Material | THREE.Material[];
}

export function useMaterialManager(
  sensorMappings: Ref<Record<string, string>>,
  sensorData: Ref<Record<string, any>>,
  ghostingEnabled: Ref<boolean>
) {
  const meshMaterialStates = new Map<string, MeshMaterialState>();

  function createGhostMaterial(material: THREE.Material): THREE.Material {
    const ghost = material.clone();
    const transparentGhost = ghost as any;
    transparentGhost.transparent = true;
    transparentGhost.opacity = 0.13;
    transparentGhost.depthWrite = false;
    return ghost;
  }

  function createHighlightMaterial(material: THREE.Material): THREE.Material {
    const highlight = material.clone();
    const typedHighlight = highlight as any;
    typedHighlight.transparent = true;
    typedHighlight.opacity = 0.95;
    typedHighlight.depthWrite = true;
    if (typedHighlight.color) typedHighlight.color = typedHighlight.color.clone().lerp(new THREE.Color(0xfbbf24), 0.35);
    if (typedHighlight.emissive) {
      typedHighlight.emissive = new THREE.Color(0x664400);
      typedHighlight.emissiveIntensity = 0.45;
    }
    return highlight;
  }

  function createCriticalMaterial(material: THREE.Material): THREE.Material {
    const crit = material.clone();
    const typedCrit = crit as any;
    typedCrit.transparent = true;
    typedCrit.opacity = 0.9;
    typedCrit.depthWrite = true;
    if (typedCrit.color) typedCrit.color = typedCrit.color.clone().lerp(new THREE.Color(0xef4444), 0.8);
    if (typedCrit.emissive) {
      typedCrit.emissive = new THREE.Color(0x990000);
      typedCrit.emissiveIntensity = 0.8;
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
      [ghost, highlight, critical].flat().forEach(m => (m as THREE.Material).dispose());
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
        crits.forEach(m => {
          if ((m as any).emissiveIntensity !== undefined) {
             // critical pulses red, warning pulses yellow/orange but handled by material props
            (m as any).emissiveIntensity = 0.5 + pulseIntensity * 0.5;
            if(isWarning && !isCritical) {
                 (m as any).emissive = new THREE.Color(0xb45309); // orange for warning
            } else {
                 (m as any).emissive = new THREE.Color(0x990000); // red for critical
            }
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

