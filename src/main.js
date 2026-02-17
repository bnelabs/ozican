/**
 * Ozican — Solar System Explorer
 * Main entry point: wires the 3D scene to the UI.
 */
import { SolarSystemScene } from './scene/SolarSystemScene.js';
import { renderPlanetInfo, renderMoonInfo } from './ui/InfoPanel.js';
import { renderCompareTable, renderCompareCards } from './ui/ComparePanel.js';
import { PLANET_ORDER, SOLAR_SYSTEM } from './data/solarSystem.js';
import { startOnboarding } from './ui/Onboarding.js';

// ==================== DOM Elements ====================
const canvasContainer = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loading-screen');
const loadProgress = document.getElementById('load-progress');
const infoPanel = document.getElementById('info-panel');
const infoContent = document.getElementById('info-content');
const infoClose = document.getElementById('info-close');
const comparePanel = document.getElementById('compare-panel');
const compareContent = document.getElementById('compare-content');
const compareClose = document.getElementById('compare-close');
const tooltip = document.getElementById('tooltip');

const btnOverview = document.getElementById('btn-overview');
const btnCompare = document.getElementById('btn-compare');
const btnSpeed = document.getElementById('btn-speed');
const btnOrbits = document.getElementById('btn-orbits');
const btnLabels = document.getElementById('btn-labels');
const btnFullscreen = document.getElementById('btn-fullscreen');
const speedLabel = document.getElementById('speed-label');

const planetBar = document.getElementById('planet-bar');
const planetThumbs = document.querySelectorAll('.planet-thumb');

// ==================== State ====================
let scene;
let currentPlanetKey = null;
let currentMoonIndex = null;
let speedIndex = 2; // default 1x
const speeds = [0, 0.25, 1, 3, 10];
const speedNames = ['Paused', '0.25x', '1x', '3x', '10x'];
let labelsVisible = true;
let keyboardHelpVisible = false;

// Label elements (created dynamically)
const labelElements = {};

// ==================== Initialize ====================

let loadingTimedOut = false;
let loadingComplete = false;
const loadingTimeout = setTimeout(() => {
  if (!loadingComplete) {
    loadingTimedOut = true;
    const loaderText = loadingScreen.querySelector('.loader-text');
    if (loaderText) {
      const msg = document.createElement('p');
      msg.className = 'loading-timeout';
      msg.textContent = 'Taking longer than expected...';
      loaderText.appendChild(msg);
    }
  }
}, 15000);

function onProgress(percent) {
  if (loadProgress) {
    loadProgress.style.width = percent + '%';
  }
  if (percent >= 100) {
    loadingComplete = true;
    clearTimeout(loadingTimeout);
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        // Launch onboarding after loading
        startOnboarding();
        // Check for deep link
        handleInitialHash();
      }, 800);
    }, 400);
  }
}

// ==================== Error Handling ====================

function showError(message) {
  loadingScreen.innerHTML = `
    <div class="error-screen">
      <h2>Unable to Launch</h2>
      <p>${message}</p>
      <button onclick="location.reload()">Reload Page</button>
    </div>
  `;
  loadingScreen.style.display = 'flex';
  loadingScreen.classList.remove('fade-out');
}

// Listen for scene errors
document.addEventListener('scene-error', (e) => {
  showError(e.detail || 'An error occurred while loading the 3D scene.');
});

try {
  scene = new SolarSystemScene(canvasContainer, onProgress);
} catch (err) {
  showError('WebGL is not supported by your browser. Please try a modern browser like Chrome, Firefox, or Edge.');
}

// ==================== Planet Labels ====================

function createLabels() {
  for (const key of PLANET_ORDER) {
    const el = document.createElement('div');
    el.className = 'planet-label';
    el.textContent = SOLAR_SYSTEM[key].name;
    el.dataset.planet = key;
    document.body.appendChild(el);
    labelElements[key] = el;
  }
}

function updateLabels() {
  if (!labelsVisible) {
    for (const el of Object.values(labelElements)) {
      el.style.opacity = '0';
    }
    return;
  }

  for (const key of PLANET_ORDER) {
    const el = labelElements[key];
    if (!el) continue;

    const pos = scene.getScreenPosition(key);
    if (pos.visible && pos.x > -100 && pos.x < window.innerWidth + 100 &&
        pos.y > -100 && pos.y < window.innerHeight + 100) {
      const offset = SOLAR_SYSTEM[key].displayRadius * 8 + 12;
      el.style.left = pos.x + 'px';
      el.style.top = (pos.y - offset) + 'px';
      el.style.transform = 'translateX(-50%)';
      el.style.opacity = '1';
    } else {
      el.style.opacity = '0';
    }
  }
}

createLabels();

// ==================== Scene Callbacks ====================

if (scene) {
  scene.onPlanetClick = (key) => {
    openInfoPanel(key);
  };

  scene.onMoonClick = (planetKey, moonIndex) => {
    openMoonInfoPanel(planetKey, moonIndex);
  };

  scene.onHoverChange = (key) => {
    if (key) {
      tooltip.textContent = SOLAR_SYSTEM[key].name;
      tooltip.classList.remove('hidden');
    } else {
      tooltip.classList.add('hidden');
    }
  };

  scene.onFrame = () => {
    updateLabels();

    // Update tooltip position
    if (scene.hoveredPlanet) {
      const pos = scene.getScreenPosition(scene.hoveredPlanet);
      tooltip.style.left = (pos.x + 15) + 'px';
      tooltip.style.top = (pos.y - 15) + 'px';
    }
  };
}

// ==================== Info Panel ====================

function openInfoPanel(key) {
  currentPlanetKey = key;
  currentMoonIndex = null;
  infoContent.innerHTML = renderPlanetInfo(key);
  infoPanel.classList.remove('hidden');
  infoPanel.setAttribute('aria-hidden', 'false');
  comparePanel.classList.add('hidden');
  comparePanel.setAttribute('aria-hidden', 'true');
  btnCompare.classList.remove('active');
  btnCompare.setAttribute('aria-pressed', 'false');

  // Highlight active planet thumb
  planetThumbs.forEach(t => {
    t.classList.toggle('active', t.dataset.planet === key);
  });

  // Wire up moon click handlers inside panel
  const moonItems = infoContent.querySelectorAll('.moon-item');
  moonItems.forEach(item => {
    item.addEventListener('click', () => {
      const pKey = item.dataset.planet;
      const mIdx = parseInt(item.dataset.moonIndex, 10);
      openMoonInfoPanel(pKey, mIdx);
    });
  });

  // Focus camera
  if (scene) scene.focusOnPlanet(key);

  // URL deep linking
  history.replaceState(null, '', '#' + key);
}

function openMoonInfoPanel(planetKey, moonIndex) {
  currentMoonIndex = moonIndex;
  infoContent.innerHTML = renderMoonInfo(planetKey, moonIndex);
  infoPanel.classList.remove('hidden');
  infoPanel.setAttribute('aria-hidden', 'false');

  // Wire back button
  const backBtn = document.getElementById('back-to-planet');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      openInfoPanel(backBtn.dataset.planet);
    });
  }

  // Wire moon prev/next buttons
  const prevBtn = document.getElementById('moon-prev');
  const nextBtn = document.getElementById('moon-next');
  const planet = SOLAR_SYSTEM[planetKey];
  const moonCount = planet && planet.moons ? planet.moons.length : 0;

  if (prevBtn && moonIndex > 0) {
    prevBtn.addEventListener('click', () => {
      openMoonInfoPanel(planetKey, moonIndex - 1);
    });
  } else if (prevBtn) {
    prevBtn.disabled = true;
    prevBtn.style.opacity = '0.3';
  }

  if (nextBtn && moonIndex < moonCount - 1) {
    nextBtn.addEventListener('click', () => {
      openMoonInfoPanel(planetKey, moonIndex + 1);
    });
  } else if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.3';
  }
}

function closeInfoPanel() {
  infoPanel.classList.add('hidden');
  infoPanel.setAttribute('aria-hidden', 'true');
  currentPlanetKey = null;
  currentMoonIndex = null;
  planetThumbs.forEach(t => t.classList.remove('active'));

  // Clear URL hash
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

infoClose.addEventListener('click', closeInfoPanel);

// ==================== Planet Bar ====================

planetThumbs.forEach(thumb => {
  thumb.addEventListener('click', () => {
    const key = thumb.dataset.planet;
    openInfoPanel(key);
  });
});

// ==================== Planet Bar Scroll Indicators ====================

function updateScrollIndicators() {
  if (!planetBar) return;
  const { scrollLeft, scrollWidth, clientWidth } = planetBar;
  planetBar.classList.toggle('scroll-left', scrollLeft > 5);
  planetBar.classList.toggle('scroll-right', scrollLeft < scrollWidth - clientWidth - 5);
}

planetBar.addEventListener('scroll', updateScrollIndicators, { passive: true });
window.addEventListener('resize', updateScrollIndicators);
// Initial check
setTimeout(updateScrollIndicators, 100);

// ==================== Navigation Buttons ====================

btnOverview.addEventListener('click', () => {
  if (scene) scene.goToOverview();
  closeInfoPanel();
  btnOverview.classList.add('active');
});

btnCompare.addEventListener('click', () => {
  const isHidden = comparePanel.classList.contains('hidden');
  if (isHidden) {
    const isMobile = window.innerWidth <= 768;
    compareContent.innerHTML = isMobile ? renderCompareCards() : renderCompareTable();
    comparePanel.classList.remove('hidden');
    comparePanel.setAttribute('aria-hidden', 'false');
    infoPanel.classList.add('hidden');
    infoPanel.setAttribute('aria-hidden', 'true');
    btnCompare.classList.add('active');
    btnCompare.setAttribute('aria-pressed', 'true');
  } else {
    comparePanel.classList.add('hidden');
    comparePanel.setAttribute('aria-hidden', 'true');
    btnCompare.classList.remove('active');
    btnCompare.setAttribute('aria-pressed', 'false');
  }
});

compareClose.addEventListener('click', () => {
  comparePanel.classList.add('hidden');
  comparePanel.setAttribute('aria-hidden', 'true');
  btnCompare.classList.remove('active');
  btnCompare.setAttribute('aria-pressed', 'false');
});

btnSpeed.addEventListener('click', () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  if (scene) scene.setAnimationSpeed(speeds[speedIndex]);
  speedLabel.textContent = speedNames[speedIndex];
  btnSpeed.setAttribute('aria-label', 'Animation Speed: ' + speedNames[speedIndex]);
});

btnOrbits.addEventListener('click', () => {
  if (!scene) return;
  const visible = scene.toggleOrbits();
  btnOrbits.classList.toggle('active', visible);
  btnOrbits.setAttribute('aria-pressed', String(visible));
});

btnLabels.addEventListener('click', () => {
  if (!scene) return;
  labelsVisible = scene.toggleLabels();
  btnLabels.classList.toggle('active', labelsVisible);
  btnLabels.setAttribute('aria-pressed', String(labelsVisible));
});

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// ==================== Keyboard Shortcuts ====================

function toggleKeyboardHelp() {
  keyboardHelpVisible = !keyboardHelpVisible;
  const existing = document.getElementById('keyboard-help-overlay');
  if (existing) {
    existing.remove();
    keyboardHelpVisible = false;
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'keyboard-help-overlay';
  overlay.className = 'keyboard-help-overlay';
  overlay.innerHTML = `
    <div class="keyboard-help">
      <h2>Keyboard Shortcuts</h2>
      <div class="keyboard-help-row"><span>Select planet</span><kbd>1</kbd> – <kbd>9</kbd></div>
      <div class="keyboard-help-row"><span>Pause / Resume</span><kbd>Space</kbd></div>
      <div class="keyboard-help-row"><span>Close panel / Overview</span><kbd>Esc</kbd></div>
      <div class="keyboard-help-row"><span>Show this help</span><kbd>?</kbd></div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      keyboardHelpVisible = false;
    }
  });
  document.body.appendChild(overlay);
  keyboardHelpVisible = true;
}

document.addEventListener('keydown', (e) => {
  // Keyboard help
  if (e.key === '?') {
    toggleKeyboardHelp();
    return;
  }

  if (e.key === 'Escape') {
    // Close keyboard help first if visible
    const helpOverlay = document.getElementById('keyboard-help-overlay');
    if (helpOverlay) {
      helpOverlay.remove();
      keyboardHelpVisible = false;
      return;
    }

    if (!infoPanel.classList.contains('hidden')) {
      closeInfoPanel();
    } else if (!comparePanel.classList.contains('hidden')) {
      comparePanel.classList.add('hidden');
      comparePanel.setAttribute('aria-hidden', 'true');
      btnCompare.classList.remove('active');
      btnCompare.setAttribute('aria-pressed', 'false');
    } else if (scene) {
      scene.goToOverview();
    }
  }

  // Number keys 1-9 for planets
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= 9 && PLANET_ORDER[num - 1]) {
    openInfoPanel(PLANET_ORDER[num - 1]);
  }

  // Space to toggle pause
  if (e.key === ' ') {
    e.preventDefault();
    if (speeds[speedIndex] === 0) {
      speedIndex = 2;
    } else {
      speedIndex = 0;
    }
    if (scene) scene.setAnimationSpeed(speeds[speedIndex]);
    speedLabel.textContent = speedNames[speedIndex];
    btnSpeed.setAttribute('aria-label', 'Animation Speed: ' + speedNames[speedIndex]);
  }
});

// ==================== Touch / Swipe Support ====================

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

canvasContainer.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }
}, { passive: true });

canvasContainer.addEventListener('touchend', (e) => {
  if (e.changedTouches.length !== 1) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dt = Date.now() - touchStartTime;

  // Must be a quick swipe: >50px horizontal, <300ms, more horizontal than vertical
  if (Math.abs(dx) > 50 && dt < 300 && Math.abs(dx) > Math.abs(dy)) {
    // Find current planet index
    const currentIdx = currentPlanetKey ? PLANET_ORDER.indexOf(currentPlanetKey) : -1;

    if (dx < 0) {
      // Swipe left → next planet
      const nextIdx = currentIdx < PLANET_ORDER.length - 1 ? currentIdx + 1 : 0;
      openInfoPanel(PLANET_ORDER[nextIdx]);
    } else {
      // Swipe right → previous planet
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : PLANET_ORDER.length - 1;
      openInfoPanel(PLANET_ORDER[prevIdx]);
    }
  }
}, { passive: true });

// ==================== URL Deep Linking ====================

function handleInitialHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash && SOLAR_SYSTEM[hash]) {
    openInfoPanel(hash);
  }
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && SOLAR_SYSTEM[hash]) {
    if (currentPlanetKey !== hash) {
      openInfoPanel(hash);
    }
  } else if (!hash) {
    closeInfoPanel();
  }
});

// ==================== Console welcome ====================
console.log(
  '%c Ozican %c Solar System Explorer ',
  'background: #4a9eff; color: white; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a1a2e; color: #e8e8f0; font-size: 14px; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);
