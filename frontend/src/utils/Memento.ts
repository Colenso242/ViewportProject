/**
 * Memento pattern — used to give the app undo/redo without leaking the shape of
 * the state being captured.
 *
 * - {@link Memento}: an opaque, immutable snapshot of an *originator's* state.
 *   The caretaker holds it but never looks inside; only the originator that
 *   created it knows how to read it back.
 * - {@link Caretaker}: keeps the undo/redo history of mementos and decides which
 *   one to hand back, with no knowledge of their contents.
 *
 * The originator (e.g. the sensor store) is responsible for producing a memento
 * from its current state and for restoring itself from one.
 */
export class Memento<T> {
  // Held privately so the caretaker can neither read nor mutate the snapshot.
  // The originator retrieves it via getState() only when restoring.
  constructor(private readonly state: T) {}

  getState(): T {
    return this.state;
  }
}

export class Caretaker<T> {
  private readonly undoStack: Memento<T>[] = [];
  private readonly redoStack: Memento<T>[] = [];

  constructor(private readonly limit = 50) {}

  /** Record a memento of the state as it was *before* the latest change. */
  save(memento: Memento<T>): void {
    this.undoStack.push(memento);
    // Bound memory: drop the oldest history beyond the limit.
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    // A fresh action invalidates any redo timeline.
    this.redoStack.length = 0;
  }

  /**
   * Return the memento to restore for an undo, stashing the originator's
   * `current` memento so the step can be redone. Null when there's nothing to undo.
   */
  undo(current: Memento<T>): Memento<T> | null {
    const memento = this.undoStack.pop();
    if (!memento) return null;
    this.redoStack.push(current);
    return memento;
  }

  /** Mirror of {@link undo} for redo. Null when there's nothing to redo. */
  redo(current: Memento<T>): Memento<T> | null {
    const memento = this.redoStack.pop();
    if (!memento) return null;
    this.undoStack.push(current);
    return memento;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
