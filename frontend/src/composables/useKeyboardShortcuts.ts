import { onMounted, onBeforeUnmount } from 'vue';

/**
 * App-wide keyboard shortcuts. The caller supplies the behaviour for each
 * binding (props-down style), so this composable stays decoupled from app state
 * and only owns the listener lifecycle and the key → handler mapping.
 */
export interface ShortcutHandlers {
  /** Close the topmost surface / exit the current mode. */
  onEscape?: () => void;
  onToggleTree?: () => void;
  onTogglePlacements?: () => void;
  onToggleGhosting?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

// Don't hijack single-key shortcuts while the user is typing in a field.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  function onKeydown(event: KeyboardEvent): void {
    // Escape stays active even inside inputs, so it can always dismiss overlays.
    if (event.key === 'Escape') {
      handlers.onEscape?.();
      return;
    }

    const mod = event.ctrlKey || event.metaKey;

    // Undo / redo. Ctrl/Cmd+Z, with Shift (or Ctrl/Cmd+Y) for redo.
    if (mod && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) handlers.onRedo?.();
      else handlers.onUndo?.();
      return;
    }
    if (mod && (event.key === 'y' || event.key === 'Y')) {
      event.preventDefault();
      handlers.onRedo?.();
      return;
    }

    // Leave every other modifier combo to the browser/OS.
    if (mod || event.altKey) return;
    if (isTypingTarget(event.target)) return;

    switch (event.key.toLowerCase()) {
      case 'o':
        handlers.onToggleTree?.();
        break;
      case 'p':
        handlers.onTogglePlacements?.();
        break;
      case 'g':
        handlers.onToggleGhosting?.();
        break;
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
}
