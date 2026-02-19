/**
 * Focus trap utility for modal dialogs.
 * Keeps Tab/Shift+Tab cycling within the modal's focusable children.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Activate a focus trap on the given element.
 * @param {HTMLElement} el - The modal/dialog element
 * @returns {{ release: () => void }} - Call release() to remove the trap and restore focus
 */
export function trapFocus(el) {
  const previouslyFocused = document.activeElement;

  function getFocusable() {
    return [...el.querySelectorAll(FOCUSABLE)].filter(
      node => !node.closest('[hidden]') && node.offsetParent !== null
    );
  }

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) { e.preventDefault(); return; }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: wrap from first → last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: wrap from last → first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Focus the first focusable element inside the trap
  const focusable = getFocusable();
  if (focusable.length > 0) {
    requestAnimationFrame(() => focusable[0].focus());
  }

  el.addEventListener('keydown', handleKeyDown);

  return {
    release() {
      el.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && previouslyFocused.focus) {
        try { previouslyFocused.focus(); } catch {}
      }
    },
  };
}
