/**
 * FlybyMode — cinematic low-altitude spacecraft pass over a selected planetary body.
 *
 * Trajectory: Catmull-Rom spline through 6 control points (approach → periapsis → exit).
 * Camera: tracks 3 units behind/above spacecraft during periapsis.
 * Duration: ~25 seconds, divided into 5 phases.
 */
import * as THREE from 'three';
import { SOLAR_SYSTEM } from '../data/solarSystem.js';
import { DWARF_PLANETS } from '../data/dwarfPlanets.js';
import { t } from '../i18n/i18n.js';
import { escapeHTML } from '../utils/sanitize.js';

const PHASE_TIMES = [0, 8, 12, 18, 22, 25]; // seconds for each phase boundary
const TOTAL_DURATION = 25;

export class FlybyMode {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {object} controls  — OrbitControls instance
   * @param {object} audioManager
   * @param {function(string):void} announceFn
   */
  constructor(scene, camera, controls, audioManager, announceFn) {
    this._scene        = scene;
    this._camera       = camera;
    this._controls     = controls;
    this._audio        = audioManager;
    this._announce     = announceFn || (() => {});

    this._active       = false;
    this._paused       = false;
    this._elapsed      = 0;
    this._bodyKey      = null;
    this._bodyPos      = new THREE.Vector3();
    this._radius       = 5;

    // Spacecraft
    this._craftGroup   = null;
    this._spline       = null;

    // Camera state saved before flyby
    this._savedCamPos  = new THREE.Vector3();
    this._savedTarget  = new THREE.Vector3();
    this._savedFOV     = 60;
    this._savedControls = false;

    // HUD
    this._hudEl        = null;
    this._pauseBtn     = null;
    this._repeatBtn    = null;
    this._exitBtn      = null;
    this._elapsedEl    = null;

    // Reusable scratch vectors
    this._scratchPos   = new THREE.Vector3();
    this._scratchDir   = new THREE.Vector3();

    this._boundKeydown = (e) => this._onKeydown(e);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  get isActive() { return this._active; }

  /**
   * Start a flyby of the given body.
   * @param {string} bodyKey  — same key used in SOLAR_SYSTEM / DWARF_PLANETS
   * @param {THREE.Vector3} bodyWorldPos  — current world position of body
   * @param {number} radius   — visual radius of body in scene units
   */
  startFlyby(bodyKey, bodyWorldPos, radius) {
    if (this._active) this._cleanup();

    this._bodyKey  = bodyKey;
    this._bodyPos.copy(bodyWorldPos);
    this._radius   = radius || 5;
    this._elapsed  = 0;
    this._paused   = false;
    this._active   = true;

    // Save camera state
    this._savedCamPos.copy(this._camera.position);
    this._savedTarget.copy(this._controls.target);
    this._savedFOV = this._camera.fov;
    this._savedControls = this._controls.enabled;
    this._controls.enabled = false;

    // Build spacecraft
    this._craftGroup = this._buildSpacecraft();
    this._scene.add(this._craftGroup);

    // Build trajectory spline
    this._spline = this._buildSpline();

    // Position craft at start
    const startPt = this._spline.getPoint(0);
    this._craftGroup.position.copy(startPt);

    // Show HUD and letterbox
    this._showHUD();
    this._showLetterbox(true);

    // Audio
    if (this._audio) this._audio.setContext('flyby');

    // Keyboard
    document.addEventListener('keydown', this._boundKeydown);

    this._announce(t('flyby.started') || 'Flyby started');

    document.dispatchEvent(new CustomEvent('flyby-started', { detail: { bodyKey } }));
  }

  /** Call each animation frame with delta seconds. */
  update(delta) {
    if (!this._active || !this._spline) return;
    if (this._paused) return;

    this._elapsed += delta;
    const t0 = Math.min(this._elapsed / TOTAL_DURATION, 1);

    // Move spacecraft
    const craftPt = this._spline.getPoint(t0);
    this._craftGroup.position.copy(craftPt);
    const tangent = this._spline.getTangent(t0);
    if (tangent.length() > 0.001) {
      this._craftGroup.lookAt(craftPt.clone().add(tangent));
    }

    // Camera tracking
    this._updateCamera(t0, craftPt, tangent);

    // Update HUD countdown
    if (this._elapsedEl) {
      const remaining = Math.max(0, TOTAL_DURATION - this._elapsed);
      this._elapsedEl.textContent = remaining.toFixed(1) + 's';
    }

    // Auto-end
    if (this._elapsed >= TOTAL_DURATION) {
      this._onEnd();
    }
  }

  pause() {
    this._paused = true;
    if (this._pauseBtn) this._pauseBtn.textContent = t('flyby.resume') || 'Resume';
  }

  resume() {
    this._paused = false;
    if (this._pauseBtn) this._pauseBtn.textContent = t('flyby.pause') || 'Pause';
  }

  togglePause() {
    if (this._paused) this.resume(); else this.pause();
  }

  repeat() {
    this._elapsed = 0;
    this._paused  = false;
    if (this._pauseBtn) this._pauseBtn.textContent = t('flyby.pause') || 'Pause';
  }

  exit() {
    if (!this._active) return;
    this._cleanup();
    document.dispatchEvent(new CustomEvent('flyby-ended'));
    this._announce(t('flyby.ended') || 'Flyby ended');
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  _buildSpline() {
    const p = this._bodyPos;
    const r = this._radius;

    const pts = [
      new THREE.Vector3(p.x - 300, p.y + 80, p.z - 300),             // P0 far approach
      new THREE.Vector3(p.x - 50,  p.y + 20, p.z - 50),              // P1 mid approach
      new THREE.Vector3(p.x + r * 1.4, p.y + r * 0.3, p.z),          // P2 periapsis entry
      new THREE.Vector3(p.x,       p.y + r * 0.2, p.z + r * 1.4),    // P3 low pass
      new THREE.Vector3(p.x + 80,  p.y + 30,  p.z + 80),             // P4 exit
      new THREE.Vector3(p.x + 300, p.y + 100, p.z + 300),            // P5 far exit
    ];

    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  }

  _updateCamera(t0, craftPt, tangent) {
    const phase = this._getPhase(t0 * TOTAL_DURATION);

    // FOV: 60° at start/end, compresses to 35° during close pass
    let targetFOV;
    const elapsed = t0 * TOTAL_DURATION;
    if (elapsed < 8) {
      targetFOV = 60;
    } else if (elapsed < 12) {
      targetFOV = 60 - (elapsed - 8) / 4 * 25; // 60→35
    } else if (elapsed < 18) {
      targetFOV = 35;
    } else if (elapsed < 22) {
      targetFOV = 35 + (elapsed - 18) / 4 * 25; // 35→60
    } else {
      targetFOV = 60;
    }
    this._camera.fov += (targetFOV - this._camera.fov) * 0.08;
    this._camera.updateProjectionMatrix();

    // Camera position: behind and slightly above spacecraft
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const camUp = new THREE.Vector3().crossVectors(right, tangent).normalize();

    const camOffset = tangent.clone().multiplyScalar(-4).add(camUp.multiplyScalar(1.5));
    const targetCamPos = craftPt.clone().add(camOffset);

    this._camera.position.lerp(targetCamPos, 0.07);

    // Look ahead toward planet during periapsis, otherwise follow craft
    if (phase === 2 || phase === 3) {
      // Look at planet body during close pass
      this._scratchPos.lerpVectors(craftPt, this._bodyPos, 0.6);
      this._camera.lookAt(this._scratchPos);
    } else {
      // Look ahead along path
      const lookAhead = craftPt.clone().add(tangent.clone().multiplyScalar(6));
      this._camera.lookAt(lookAhead);
    }
  }

  _getPhase(elapsed) {
    for (let i = PHASE_TIMES.length - 1; i >= 0; i--) {
      if (elapsed >= PHASE_TIMES[i]) return i;
    }
    return 0;
  }

  _onEnd() {
    // Show repeat prompt briefly then auto-exit after 3s
    if (this._repeatBtn) this._repeatBtn.style.opacity = '1';
    this._paused = true;
    setTimeout(() => {
      if (this._active) this.exit();
    }, 4000);
  }

  _cleanup() {
    this._active = false;
    this._paused = false;

    // Remove spacecraft
    if (this._craftGroup) {
      this._scene.remove(this._craftGroup);
      this._craftGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
      this._craftGroup = null;
    }

    // Restore camera
    this._camera.position.copy(this._savedCamPos);
    this._controls.target.copy(this._savedTarget);
    this._camera.fov = this._savedFOV;
    this._camera.updateProjectionMatrix();
    this._controls.enabled = this._savedControls;

    // Remove HUD and letterbox
    this._hideHUD();
    this._showLetterbox(false);

    // Remove keyboard handler
    document.removeEventListener('keydown', this._boundKeydown);

    this._bodyKey = null;
    this._spline  = null;
  }

  // ─── Spacecraft geometry ─────────────────────────────────────────────────

  _buildSpacecraft() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd0d8e8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a3060,
      metalness: 0.4,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    // Cylindrical body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 12), mat);
    group.add(body);

    // 2 solar panels
    for (let s = -1; s <= 1; s += 2) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), panelMat);
      panel.position.set(s * 0.42, 0, 0);
      panel.rotation.y = Math.PI / 2;
      group.add(panel);
    }

    // HGA dish (hemisphere)
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat
    );
    dish.position.set(0, 0.22, 0);
    group.add(dish);

    // Thruster nozzle
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), mat);
    nozzle.rotation.x = Math.PI;
    nozzle.position.set(0, -0.26, 0);
    group.add(nozzle);

    // Engine glow sprite
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64; glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d');
    const grad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(100,160,255,0.9)');
    grad.addColorStop(0.5, 'rgba(60,100,200,0.5)');
    grad.addColorStop(1, 'rgba(0,0,255,0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 64, 64);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glow.scale.set(0.8, 0.8, 1);
    glow.position.set(0, -0.38, 0);
    group.add(glow);

    // Scale down to be visible but not overwhelming
    group.scale.setScalar(0.5);

    return group;
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────

  _showHUD() {
    this._hudEl = document.getElementById('flyby-hud');
    if (!this._hudEl) return;
    this._hudEl.classList.remove('hidden');
    this._hudEl.setAttribute('aria-hidden', 'false');

    this._pauseBtn   = this._hudEl.querySelector('#flyby-pause');
    this._repeatBtn  = this._hudEl.querySelector('#flyby-repeat');
    this._exitBtn    = this._hudEl.querySelector('#flyby-exit');
    this._elapsedEl  = this._hudEl.querySelector('#flyby-elapsed');

    if (this._pauseBtn) {
      this._pauseBtn.textContent = t('flyby.pause') || 'Pause';
      this._pauseBtn.onclick = () => this.togglePause();
    }
    if (this._repeatBtn) {
      this._repeatBtn.textContent = t('flyby.repeat') || 'Repeat';
      this._repeatBtn.style.opacity = '0.5';
      this._repeatBtn.onclick = () => this.repeat();
    }
    if (this._exitBtn) {
      this._exitBtn.textContent = t('flyby.exit') || 'Exit Flyby';
      this._exitBtn.onclick = () => this.exit();
    }
  }

  _hideHUD() {
    if (!this._hudEl) return;
    this._hudEl.classList.add('hidden');
    this._hudEl.setAttribute('aria-hidden', 'true');
    this._hudEl = null;
  }

  _showLetterbox(visible) {
    const lb = document.getElementById('flyby-letterbox');
    if (!lb) return;
    lb.classList.toggle('active', visible);
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  _onKeydown(e) {
    if (!this._active) return;
    if (e.key === 'Escape') { e.preventDefault(); this.exit(); }
    if (e.key === ' ')      { e.preventDefault(); this.togglePause(); }
  }
}
