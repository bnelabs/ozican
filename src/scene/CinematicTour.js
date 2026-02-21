/**
 * CinematicTour — auto-visits each planet with cinematic transitions,
 * an educational HUD showing planet facts, progress, and playback controls.
 */
import { PLANET_ORDER } from '../data/solarSystem.js';
import '../styles/tour-help.css';

const TOUR_FACTS = {
  sun:     ['Surface temperature: 5,778 K', 'Contains 99.86% of solar system mass', 'Light takes 8 minutes to reach Earth'],
  mercury: ['No atmosphere — surface temperatures range -180\u00b0C to 430\u00b0C', 'Smallest planet, slightly larger than Earth\'s Moon', 'Orbits the Sun every 88 Earth days'],
  venus:   ['Hottest planet at 465\u00b0C — hotter than Mercury despite being farther from Sun', 'Rotates backwards relative to most planets', 'Day longer than its year'],
  earth:   ['Only known planet with life', 'Surface 71% covered by water', 'Protected by a powerful magnetic field'],
  mars:    ['Olympus Mons: tallest volcano in solar system (21 km high)', 'Has two tiny moons: Phobos and Deimos', 'Day length: 24h 37min — closest to Earth\'s'],
  jupiter: ['Largest planet — 1,300 Earths could fit inside', 'Great Red Spot: a storm raging for 400+ years', '95 known moons, including volcanic Io'],
  saturn:  ['Ring system extends 282,000 km, but only ~10m thick', 'Least dense planet — would float in water', '146 known moons including Titan with thick atmosphere'],
  uranus:  ['Rotates on its side — axis tilted 98\u00b0', 'Coldest planetary atmosphere: -224\u00b0C', 'Has 13 faint rings and 28 moons'],
  neptune: ['Winds reach 2,100 km/h — fastest in solar system', 'Takes 165 Earth years to orbit the Sun', 'Moon Triton orbits backwards and is slowly spiraling inward'],
};

/** Capitalise first letter of a planet key for display */
function displayName(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export class CinematicTour {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.paused = false;
    this.currentIndex = 0;
    this.dwellTime = 8.0;
    this.dwellTimer = 0;
    this.waitingForTransition = false;
    this.onPlanetVisit = null;
    this.onPlanetLeave = null;
    this.onTourEnd = null;

    this._hudEl = null;
    this._factInterval = null;
    this._factIndex = 0;
  }

  /* ── public API ──────────────────────────────────── */

  start() {
    this.active = true;
    this.paused = false;
    this.currentIndex = 0;
    this.dwellTimer = 0;
    this.waitingForTransition = true;
    this._createHUD();
    this._visitCurrent();
  }

  stop() {
    this.active = false;
    this.paused = false;
    this.waitingForTransition = false;
    this.dwellTimer = 0;
    this._removeHUD();
  }

  toggle() {
    if (this.active) {
      this.stop();
    } else {
      this.start();
    }
    return this.active;
  }

  pause() {
    if (!this.active) return;
    this.paused = true;
    this._updatePauseBtn();
  }

  resume() {
    if (!this.active) return;
    this.paused = false;
    this._updatePauseBtn();
  }

  togglePause() {
    if (this.paused) this.resume();
    else this.pause();
  }

  prev() {
    if (!this.active) return;
    if (this.currentIndex > 0) {
      if (this.onPlanetLeave) this.onPlanetLeave(PLANET_ORDER[this.currentIndex]);
      this.currentIndex--;
      this._visitCurrent();
    }
  }

  next() {
    if (!this.active) return;
    if (this.onPlanetLeave) this.onPlanetLeave(PLANET_ORDER[this.currentIndex]);
    this.currentIndex++;
    if (this.currentIndex >= PLANET_ORDER.length) {
      this._endTour();
    } else {
      this._visitCurrent();
    }
  }

  get isActive() {
    return this.active;
  }

  /* ── internal navigation ─────────────────────────── */

  _visitCurrent() {
    const key = PLANET_ORDER[this.currentIndex];
    if (!key) {
      this._endTour();
      return;
    }
    this.waitingForTransition = true;
    this.dwellTimer = 0;
    this._factIndex = 0;
    this.scene.focusOnPlanet(key);
    if (this.onPlanetVisit) this.onPlanetVisit(key);
    this._updateHUD(key);
    this._startFactRotation(key);
  }

  _endTour() {
    this.active = false;
    this.scene.goToOverview();
    this._removeHUD();
    if (this.onTourEnd) this.onTourEnd();
  }

  /** Call this every frame with delta time */
  update(delta) {
    if (!this.active) return;
    if (this.paused) return;

    // Wait for the camera transition to finish
    if (this.waitingForTransition) {
      if (!this.scene.isTransitioning) {
        this.waitingForTransition = false;
        this.dwellTimer = 0;
      }
      return;
    }

    // Dwell at current planet
    this.dwellTimer += delta;
    if (this.dwellTimer >= this.dwellTime) {
      if (this.onPlanetLeave) {
        this.onPlanetLeave(PLANET_ORDER[this.currentIndex]);
      }
      this.currentIndex++;
      if (this.currentIndex >= PLANET_ORDER.length) {
        this._endTour();
      } else {
        this._visitCurrent();
      }
    }
  }

  /* ── HUD DOM management ──────────────────────────── */

  _createHUD() {
    this._removeHUD();

    const el = document.createElement('div');
    el.id = 'tour-hud';
    el.className = 'tour-hud';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cinematic Tour');

    el.innerHTML = `
      <div class="tour-hud-progress">
        <div class="tour-hud-progress-bar" id="tour-progress-bar"></div>
      </div>
      <div class="tour-hud-content">
        <div class="tour-hud-planet" id="tour-hud-planet"></div>
        <div class="tour-hud-fact" id="tour-hud-fact"></div>
        <div class="tour-hud-counter" id="tour-hud-counter"></div>
      </div>
      <div class="tour-hud-controls">
        <button id="tour-btn-prev" class="tour-ctrl-btn" aria-label="Previous stop">\u2039</button>
        <button id="tour-btn-pause" class="tour-ctrl-btn tour-ctrl-pause" aria-label="Pause tour">\u23F8</button>
        <button id="tour-btn-next" class="tour-ctrl-btn" aria-label="Next stop">\u203A</button>
        <button id="tour-btn-exit" class="tour-ctrl-btn tour-ctrl-exit" aria-label="Exit tour">\u2715</button>
      </div>
    `;

    document.body.appendChild(el);
    this._hudEl = el;

    // Wire button listeners
    el.querySelector('#tour-btn-prev').addEventListener('click', () => this.prev());
    el.querySelector('#tour-btn-pause').addEventListener('click', () => this.togglePause());
    el.querySelector('#tour-btn-next').addEventListener('click', () => this.next());
    el.querySelector('#tour-btn-exit').addEventListener('click', () => {
      this.stop();
      if (this.onTourEnd) this.onTourEnd();
    });
  }

  _removeHUD() {
    this._stopFactRotation();
    if (this._hudEl) {
      this._hudEl.remove();
      this._hudEl = null;
    }
  }

  _updateHUD(key) {
    if (!this._hudEl) return;

    const planetEl = this._hudEl.querySelector('#tour-hud-planet');
    const factEl = this._hudEl.querySelector('#tour-hud-fact');
    const counterEl = this._hudEl.querySelector('#tour-hud-counter');
    const progressEl = this._hudEl.querySelector('#tour-progress-bar');

    if (planetEl) planetEl.textContent = displayName(key);

    const facts = TOUR_FACTS[key] || [];
    if (factEl) factEl.textContent = facts[0] || '';

    if (counterEl) {
      counterEl.textContent = `${this.currentIndex + 1} / ${PLANET_ORDER.length}`;
    }

    if (progressEl) {
      const pct = ((this.currentIndex + 1) / PLANET_ORDER.length) * 100;
      progressEl.style.width = pct + '%';
    }
  }

  _updatePauseBtn() {
    if (!this._hudEl) return;
    const btn = this._hudEl.querySelector('#tour-btn-pause');
    if (btn) {
      btn.textContent = this.paused ? '\u25B6' : '\u23F8';
      btn.setAttribute('aria-label', this.paused ? 'Resume tour' : 'Pause tour');
    }
  }

  /* ── Fact rotation ───────────────────────────────── */

  _startFactRotation(key) {
    this._stopFactRotation();
    const facts = TOUR_FACTS[key] || [];
    if (facts.length <= 1) return;

    this._factIndex = 0;
    this._factInterval = setInterval(() => {
      this._factIndex = (this._factIndex + 1) % facts.length;
      const factEl = this._hudEl?.querySelector('#tour-hud-fact');
      if (!factEl) return;

      // Fade out, swap text, fade in
      factEl.classList.add('fade');
      setTimeout(() => {
        factEl.textContent = facts[this._factIndex];
        factEl.classList.remove('fade');
      }, 300);
    }, 4000);
  }

  _stopFactRotation() {
    if (this._factInterval) {
      clearInterval(this._factInterval);
      this._factInterval = null;
    }
  }
}
