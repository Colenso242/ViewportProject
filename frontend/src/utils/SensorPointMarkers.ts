import * as THREE from 'three';
import type { SensorPoint } from '../types';

const MARKER_WORLD_RADIUS = 0.025;
const MARKER_COLOR = 0x4f8ff7;
const MARKER_LINKED_COLOR = 0x10b981;

/**
 * Manages the sphere markers that visualize point sensors.
 * The marker group is attached as a child of the model so positions can be
 * stored in model-local coordinates and survive the load-time normalization.
 */
export class SensorPointMarkers {
  private group: THREE.Group | null = null;
  private model: THREE.Object3D | null = null;
  private markers = new Map<string, THREE.Mesh>();
  private geometry = new THREE.SphereGeometry(1, 16, 12);
  private unlinkedMaterial = new THREE.MeshBasicMaterial({ color: MARKER_COLOR });
  private linkedMaterial = new THREE.MeshBasicMaterial({ color: MARKER_LINKED_COLOR });

  attach(model: THREE.Object3D): void {
    this.detach();
    this.model = model;
    this.group = new THREE.Group();
    this.group.name = 'sensor-point-markers';
    model.add(this.group);
  }

  detach(): void {
    if (this.group && this.model) {
      this.model.remove(this.group);
    }
    this.markers.clear();
    this.group = null;
    this.model = null;
  }

  sync(points: SensorPoint[]): void {
    if (!this.group || !this.model) return;

    const seen = new Set<string>();
    // The model is scaled uniformly to fit the view; markers compensate so
    // they keep a constant world-space size.
    const modelScale = this.model.scale.x || 1;
    const localRadius = MARKER_WORLD_RADIUS / modelScale;

    for (const point of points) {
      seen.add(point.placementId);
      let marker = this.markers.get(point.placementId);
      if (!marker) {
        marker = new THREE.Mesh(this.geometry, this.unlinkedMaterial);
        marker.name = 'Sensor Point';
        marker.userData.isSensorPointMarker = true;
        marker.userData.sensorPointId = point.placementId;
        this.group.add(marker);
        this.markers.set(point.placementId, marker);
      }
      marker.scale.setScalar(localRadius);
      marker.position.set(point.position.x, point.position.y, point.position.z);
      marker.material = point.sensorId ? this.linkedMaterial : this.unlinkedMaterial;
    }

    for (const [id, marker] of this.markers) {
      if (!seen.has(id)) {
        this.group.remove(marker);
        this.markers.delete(id);
      }
    }
  }

  getMarker(placementId: string): THREE.Mesh | undefined {
    return this.markers.get(placementId);
  }

  getWorldPosition(placementId: string, target: THREE.Vector3): THREE.Vector3 | null {
    const marker = this.markers.get(placementId);
    if (!marker) return null;
    return marker.getWorldPosition(target);
  }

  dispose(): void {
    this.detach();
    this.geometry.dispose();
    this.unlinkedMaterial.dispose();
    this.linkedMaterial.dispose();
  }
}
