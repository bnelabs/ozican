/**
 * Lightweight onboarding tooltip system.
 * Shows a 4-step guided tour on first visit.
 */
import { t } from '../i18n/i18n.js';

const STORAGE_KEY = 'ozmos-onboarding-done';

function getSteps() {
  return [
    {
      target: '#canvas-container',
      text: t('onboarding.step1'),
    },
    {
      target: '#planet-bar',
      text: t('onboarding.step2'),
    },
    {
      target: '#btn-compare',
      text: t('onboarding.step3'),
    },
    {
      target: '#btn-speed',
      text: t('onboarding.step4'),
    },
  ];
}

let currentStep = 0;
let overlay = null;
let highlight = null;
let tooltipEl = null;

function cleanup() {
  if (overlay) overlay.remove();
  if (highlight) highlight.remove();
  if (tooltipEl) tooltipEl.remove();
  overlay = null;
  highlight = null;
  tooltipEl = null;
}

function finish() {
  cleanup();
  localStorage.setItem(STORAGE_KEY, 'true');
}

function positionTooltip(targetRect) {
  if (!tooltipEl) return;

  const tooltipWidth = 320;
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Default: below the target
  let top = targetRect.bottom + margin;
  let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

  // If below goes off-screen, position above
  if (top + 200 > vh) {
    top = targetRect.top - margin - 180;
  }

  // Keep within horizontal bounds
  if (left < margin) left = margin;
  if (left + tooltipWidth > vw - margin) left = vw - margin - tooltipWidth;

  tooltipEl.style.top = top + 'px';
  tooltipEl.style.left = left + 'px';
}

function showStep() {
  const steps = getSteps();
  const step = steps[currentStep];
  const targetEl = document.querySelector(step.target);
  if (!targetEl) {
    finish();
    return;
  }

  const rect = targetEl.getBoundingClientRect();

  // Create overlay if first step
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.addEventListener('click', finish);
    document.body.appendChild(overlay);
  }

  // Highlight target
  if (!highlight) {
    highlight = document.createElement('div');
    highlight.className = 'onboarding-highlight';
    document.body.appendChild(highlight);
  }

  highlight.style.top = (rect.top - 4) + 'px';
  highlight.style.left = (rect.left - 4) + 'px';
  highlight.style.width = (rect.width + 8) + 'px';
  highlight.style.height = (rect.height + 8) + 'px';

  // Create or update tooltip
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'onboarding-tooltip';
    document.body.appendChild(tooltipEl);
  }

  const isLast = currentStep >= steps.length - 1;
  tooltipEl.innerHTML = `
    <p>${step.text}</p>
    <div class="onboarding-footer">
      <span class="onboarding-steps">${currentStep + 1} / ${steps.length}</span>
      <div class="onboarding-actions">
        <button class="onboarding-skip">${t('onboarding.skip')}</button>
        <button class="onboarding-next">${isLast ? t('onboarding.done') : t('onboarding.next')}</button>
      </div>
    </div>
  `;

  tooltipEl.querySelector('.onboarding-skip').addEventListener('click', finish);
  tooltipEl.querySelector('.onboarding-next').addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      showStep();
    } else {
      finish();
    }
  });

  positionTooltip(rect);
}

export function startOnboarding() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  currentStep = 0;
  showStep();
}
