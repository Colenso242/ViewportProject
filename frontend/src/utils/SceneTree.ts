import type { InjectionKey } from 'vue';
import type * as THREE from 'three';

/**
 * Composite pattern over the Three.js scene graph.
 *
 * A {@link SceneTreeNode} is the *Component*: leaves (objects with no children)
 * and composites (objects that contain others) expose exactly the same
 * interface, so the recursive `TreeNodeItem` view — and any traversal helper —
 * can treat every node uniformly without asking "is this a group or a mesh?".
 *
 * Three.js `Object3D` is itself a runtime composite, but it carries rendering
 * concerns and deep reactivity hazards. This is a thin, immutable projection of
 * that graph tailored to the object-tree UI.
 */
export class SceneTreeNode {
  /** The underlying Three.js object this node represents. */
  readonly object: THREE.Object3D;
  /** Display label, resolved once at build time. */
  readonly name: string;
  /** Child nodes — empty for a leaf. */
  readonly children: SceneTreeNode[];

  private _descendantCount: number | null = null;

  constructor(object: THREE.Object3D, children: SceneTreeNode[]) {
    this.object = object;
    this.children = children;
    this.name = displayName(object);
  }

  /** Stable identity, shared with the Three.js object and the scene store. */
  get uuid(): string {
    return this.object.uuid;
  }

  /** A node with no children. The leaf/composite distinction is the whole point of the pattern. */
  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  /** Total number of descendants (not counting self). Memoized — the tree is immutable. */
  get descendantCount(): number {
    if (this._descendantCount === null) {
      this._descendantCount = this.children.reduce(
        (sum, child) => sum + 1 + child.descendantCount,
        0,
      );
    }
    return this._descendantCount;
  }

  /** Depth-first visit of this node and every descendant. */
  traverse(visit: (node: SceneTreeNode) => void): void {
    visit(this);
    for (const child of this.children) child.traverse(visit);
  }

  /** First node (self or descendant) matching `predicate`, or `null`. */
  find(predicate: (node: SceneTreeNode) => boolean): SceneTreeNode | null {
    if (predicate(this)) return this;
    for (const child of this.children) {
      const hit = child.find(predicate);
      if (hit) return hit;
    }
    return null;
  }

  /**
   * The uuids of the ancestors leading from this node down to `uuid`
   * (the target itself excluded), or `null` if it isn't in this subtree.
   * Used to auto-expand the path to a selected object.
   */
  pathTo(uuid: string, trail: string[] = []): string[] | null {
    if (this.uuid === uuid) return trail;
    for (const child of this.children) {
      const found = child.pathTo(uuid, [...trail, this.uuid]);
      if (found) return found;
    }
    return null;
  }
}

/** Resolve a human-readable label for an object, falling back to its type. */
function displayName(object: THREE.Object3D): string {
  return object.name?.trim() || object.type || 'Object';
}

/** Internal scaffolding (e.g. the sensor-marker overlay) that isn't model geometry. */
function isHelper(object: THREE.Object3D): boolean {
  return object.name === 'sensor-point-markers' || object.userData?.isSensorPointMarker === true;
}

/**
 * Build a composite {@link SceneTreeNode} tree mirroring a Three.js object graph.
 * The returned node wraps `root`; its `children` are the top level shown in the UI.
 * Helper subtrees (sensor markers) are skipped so the tree shows only model objects.
 */
export function buildSceneTree(root: THREE.Object3D): SceneTreeNode {
  const children = root.children.filter((child) => !isHelper(child)).map(buildSceneTree);
  return new SceneTreeNode(root, children);
}

/**
 * Behaviour the recursive tree view needs, provided once by `ObjectTree` and
 * injected by every `TreeNodeItem`, so expansion/selection/filter state lives in
 * one place instead of being drilled through every recursion level.
 */
export interface TreeController {
  isExpanded(node: SceneTreeNode): boolean;
  toggle(node: SceneTreeNode): void;
  select(node: SceneTreeNode): void;
  /** Frame the node's object in the 3D camera (e.g. on double-click). */
  focus(node: SceneTreeNode): void;
  isSelected(node: SceneTreeNode): boolean;
  /** Whether a node passes the active filter (always true when no query). */
  isVisible(node: SceneTreeNode): boolean;
}

export const treeControllerKey: InjectionKey<TreeController> = Symbol('treeController');
