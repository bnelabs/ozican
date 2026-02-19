/**
 * UX-10: Shared swipe-to-dismiss utility.
 *
 * Attaches touch-based swipe gesture detection to any panel element.
 * Dragging down by ≥40% of the panel height (or at ≥0.4px/ms velocity)
 * triggers dismissal. Partial swipes spring back.
 *
 * @param {HTMLElement} el - The panel element to make swipeable
 * @param {Function} onDismiss - Called when the user swipes past the threshold
 * @returns {{ release: Function }} Call release() to detach all listeners
 */
export function makeSwipeDismissible(el, onDismiss) {
  let startY = 0;
  let startTime = 0;
  let currentY = 0;
  let isDragging = false;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    currentY = 0;
    isDragging = true;
    // Disable the CSS transition while dragging so movement is instant
    el.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;
    const delta = e.touches[0].clientY - startY;
    if (delta < 0) return; // don't allow swiping up
    currentY = delta;
    el.style.transform = `translateY(${currentY}px)`;
  }

  function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;

    const elapsed = Date.now() - startTime || 1;
    const velocity = currentY / elapsed; // px/ms
    const height = el.offsetHeight || 200;
    const threshold = height * 0.4;

    // Re-enable CSS transition
    el.style.transition = '';

    if (currentY >= threshold || velocity >= 0.4) {
      // Animate out then dismiss
      el.style.transform = `translateY(${height}px)`;
      el.addEventListener('transitionend', () => {
        el.style.transform = '';
        onDismiss();
      }, { once: true });
    } else {
      // Spring back
      el.style.transform = '';
    }

    currentY = 0;
  }

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', onTouchEnd, { passive: true });

  return {
    release() {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.style.transform = '';
      el.style.transition = '';
    },
  };
}
