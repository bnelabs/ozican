/**
 * Ozican — Solar System Explorer
 * Main entry point: wires the 3D scene to the UI.
 */
import { SolarSystemScene } from './scene/SolarSystemScene.js';
import { renderPlanetInfo, renderMoonInfo } from './ui/InfoPanel.js';
import { renderCompareTable } from './ui/ComparePanel.js';
import { PLANET_ORDER, SOLAR_SYSTEM } from './data/solarSystem.js';

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
let speedIndex = 2; // default 1x
const speeds = [0, 0.25, 1, 3, 10];
const speedNames = ['Paused', '0.25x', '1x', '3x', '10x'];
let labelsVisible = true;

// Label elements (created dynamically)
const labelElements = {};

// ==================== Initialize ====================

function onProgress(percent) {
  if (loadProgress) {
    loadProgress.style.width = percent + '%';
  }
  if (percent >= 100) {
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 800);
    }, 400);
  }
}

scene = new SolarSystemScene(canvasContainer, onProgress);

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

// ==================== Info Panel ====================

function openInfoPanel(key) {
  currentPlanetKey = key;
  infoContent.innerHTML = renderPlanetInfo(key);
  infoPanel.classList.remove('hidden');
  comparePanel.classList.add('hidden');

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
  scene.focusOnPlanet(key);
}

function openMoonInfoPanel(planetKey, moonIndex) {
  infoContent.innerHTML = renderMoonInfo(planetKey, moonIndex);
  infoPanel.classList.remove('hidden');

  // Wire back button
  const backBtn = document.getElementById('back-to-planet');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      openInfoPanel(backBtn.dataset.planet);
    });
  }
}

function closeInfoPanel() {
  infoPanel.classList.add('hidden');
  currentPlanetKey = null;
  planetThumbs.forEach(t => t.classList.remove('active'));
}

infoClose.addEventListener('click', closeInfoPanel);

// ==================== Planet Bar ====================

planetThumbs.forEach(thumb => {
  thumb.addEventListener('click', () => {
    const key = thumb.dataset.planet;
    openInfoPanel(key);
  });
});

// ==================== Navigation Buttons ====================

btnOverview.addEventListener('click', () => {
  scene.goToOverview();
  closeInfoPanel();
  btnOverview.classList.add('active');
});

btnCompare.addEventListener('click', () => {
  const isHidden = comparePanel.classList.contains('hidden');
  if (isHidden) {
    compareContent.innerHTML = renderCompareTable();
    comparePanel.classList.remove('hidden');
    infoPanel.classList.add('hidden');
    btnCompare.classList.add('active');
  } else {
    comparePanel.classList.add('hidden');
    btnCompare.classList.remove('active');
  }
});

compareClose.addEventListener('click', () => {
  comparePanel.classList.add('hidden');
  btnCompare.classList.remove('active');
});

btnSpeed.addEventListener('click', () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  scene.setAnimationSpeed(speeds[speedIndex]);
  speedLabel.textContent = speedNames[speedIndex];
});

btnOrbits.addEventListener('click', () => {
  const visible = scene.toggleOrbits();
  btnOrbits.classList.toggle('active', visible);
});

btnLabels.addEventListener('click', () => {
  labelsVisible = scene.toggleLabels();
  btnLabels.classList.toggle('active', labelsVisible);
});

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// ==================== Keyboard Shortcuts ====================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!infoPanel.classList.contains('hidden')) {
      closeInfoPanel();
    } else if (!comparePanel.classList.contains('hidden')) {
      comparePanel.classList.add('hidden');
      btnCompare.classList.remove('active');
    } else {
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
    scene.setAnimationSpeed(speeds[speedIndex]);
    speedLabel.textContent = speedNames[speedIndex];
  }
});

// ==================== Touch Support ====================

let touchStartX = 0;
let touchStartY = 0;
canvasContainer.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

// ==================== Console welcome ====================
console.log(
  '%c Ozican %c Solar System Explorer ',
  'background: #4a9eff; color: white; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1a1a2e; color: #e8e8f0; font-size: 14px; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);
console.log('Press 1-9 to select planets, Space to pause, Esc to go back to overview.');
