/**
 * CrossSectionViewer — full-screen cinematic interior cross-section overlay.
 *
 * Owns a dedicated, isolated Three.js renderer on a full-screen overlay canvas.
 * No connection to the main scene's clip planes or renderer.
 *
 * Usage:
 *   const viewer = new CrossSectionViewer(announceFn);
 *   viewer.open('earth');
 *   viewer.close();
 */
import * as THREE from 'three';
import { PLANET_LAYERS } from '../data/planetLayers.js';
import { t } from '../i18n/i18n.js';
import { trapFocus } from '../utils/focusTrap.js';
import { makeSwipeDismissible } from '../utils/swipe.js';
import { escapeHTML } from '../utils/sanitize.js';

// Layer type classification (0=rock, 1=mantle, 2=liquid/core, 3=crystal/inner, 4=gas/atm, 5=ice/ocean)
function classifyLayer(key) {
  const k = key.toLowerCase();
  if (k.includes('core') && (k.includes('inner') || k.includes('solid'))) return 3;
  if (k.includes('core') || k.includes('metallic')) return 2;
  if (k.includes('mantle') && !k.includes('ice')) return 1;
  if (k.includes('cloud') || k.includes('atmosphere') || k.includes('molecular') ||
      k.includes('corona') || k.includes('chromosphere') || k.includes('photosphere') ||
      k.includes('convective') || k.includes('radiative')) return 4;
  if (k.includes('ice') || k.includes('ocean') || k.includes('nitrogen') ||
      k.includes('methane') || k.includes('water')) return 5;
  return 0;
}

/** Generate a 256×256 canvas texture for a layer type */
function generateLayerTexture(layer) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const lType = classifyLayer(layer.key);
  const baseColor = layer.color;
  const deepColor = layer.deepColor || layer.color;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  switch (lType) {
    case 0: // rock — strata-like horizontal variation
    case 1: { // mantle — similar with subtle convection cells
      for (let y = 0; y < size; y += 8 + Math.floor(Math.random() * 8)) {
        const alpha = 0.04 + Math.random() * 0.08;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, y, size, 2 + Math.floor(Math.random() * 4));
      }
      // Subtle brightness patches
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 10 + Math.random() * 40;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.03 + Math.random() * 0.05})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      break;
    }
    case 2: { // liquid core — shimmer
      const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size * 0.7);
      grad.addColorStop(0, 'rgba(255,230,100,0.2)');
      grad.addColorStop(0.5, 'rgba(255,150,50,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      // Ripple rings
      for (let i = 0; i < 4; i++) {
        const cx = size * 0.3 + Math.random() * size * 0.4;
        const cy = size * 0.3 + Math.random() * size * 0.4;
        const maxR = 20 + Math.random() * 40;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,200,80,${0.08 + Math.random() * 0.08})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      break;
    }
    case 3: { // crystal inner core — voronoi-like facets
      for (let i = 0; i < 30; i++) {
        const cx = Math.random() * size;
        const cy = Math.random() * size;
        const r = 8 + Math.random() * 25;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(255,255,220,0.18)');
        g.addColorStop(0.4, 'rgba(255,240,180,0.06)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 4: { // gas / atmosphere — horizontal bands
      for (let i = 0; i < 12; i++) {
        const y = Math.random() * size;
        const h = 4 + Math.random() * 20;
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, `rgba(255,255,255,${0.04 + Math.random() * 0.06})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y, size, h);
      }
      break;
    }
    case 5: { // ice / ocean — cracks / shimmer
      const ig = ctx.createLinearGradient(0, 0, size, size);
      ig.addColorStop(0, 'rgba(200,240,255,0.12)');
      ig.addColorStop(1, 'rgba(50,100,180,0.08)');
      ctx.fillStyle = ig;
      ctx.fillRect(0, 0, size, size);
      // Crack lines
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.strokeStyle = `rgba(150,210,255,${0.1 + Math.random() * 0.12})`;
        ctx.lineWidth = 0.5 + Math.random();
        ctx.stroke();
      }
      break;
    }
  }

  return new THREE.CanvasTexture(canvas);
}

/** Generate simple face-disc CanvasTexture with concentric rings */
function generateFaceTexture(layers) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const maxR = layers[0].r;

  // Draw from innermost layer outward so outer covers inner
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const r = (layer.r / maxR) * (size * 0.48);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = layer.color;
    ctx.fill();
    // Subtle texture variation
    const grad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fill();
    // Boundary ring
    if (i > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,200,100,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

export class CrossSectionViewer {
  /** @param {function(string):void} announceFn — screen reader announce function from main.js */
  constructor(announceFn) {
    this._announce = announceFn || (() => {});
    this._overlay = document.getElementById('cs-overlay');
    this._canvas = document.getElementById('cs-canvas');
    this._labelsEl = document.getElementById('cs-labels');
    this._bodyNameEl = document.getElementById('cs-body-name');
    this._closeBtn = document.getElementById('cs-close');
    this._detailCard = document.getElementById('cs-detail-card');
    this._detailDot = document.getElementById('cs-detail-dot');
    this._detailName = document.getElementById('cs-detail-name');
    this._detailBody = document.getElementById('cs-detail-body');
    this._detailClose = document.getElementById('cs-detail-close');
    this._srLayers = document.getElementById('cs-sr-layers');

    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._animId = null;
    this._disposed = true;
    this._startTime = 0;
    this._focusTrap = null;
    this._swipeHandle = null;
    this._clipPlane1 = null;
    this._clipPlane2 = null;
    this._layerMeshes = [];
    this._faceMeshes = [];
    this._coreLight = null;
    this._labelEls = [];
    this._activeLayerIndex = -1;
    this._currentKey = null;
    this._currentLayers = null;
    this._resizeObserver = null;

    this._boundClose = () => this.close();
    this._boundKeydown = (e) => this._onKeydown(e);

    if (this._closeBtn) this._closeBtn.addEventListener('click', this._boundClose);
    if (this._detailClose) {
      this._detailClose.addEventListener('click', () => this._hideDetailCard());
    }
  }

  /** Open the cross-section viewer for a body key */
  open(bodyKey) {
    if (!this._overlay) return;

    const layers = PLANET_LAYERS[bodyKey];
    this._currentKey = bodyKey;
    this._currentLayers = layers;

    // Set body name from i18n key of first layer's parent, or just format the key
    const bodyName = this._getBodyName(bodyKey);
    if (this._bodyNameEl) this._bodyNameEl.textContent = bodyName;

    // Build SR layer list
    this._buildSrLayerList(layers);

    // Show overlay
    this._overlay.classList.remove('hidden');
    this._overlay.setAttribute('aria-hidden', 'false');

    // Announce to screen readers
    this._announce(t('cs.opened') + ' ' + bodyName);

    if (!layers || layers.length === 0) {
      this._showNoData();
      return;
    }

    // Setup Three.js isolated scene
    this._disposed = false;
    this._buildScene(layers);
    this._startTime = performance.now();
    this._tick();

    // Build CSS labels (start hidden; fly-in is triggered in _tick)
    this._buildLabels(layers);

    // Focus trap
    this._focusTrap = trapFocus(this._overlay);

    // Swipe-to-dismiss on mobile
    this._swipeHandle = makeSwipeDismissible(this._overlay, () => this.close());

    // Keyboard
    document.addEventListener('keydown', this._boundKeydown);

    // Resize handling
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this._overlay);
  }

  /** Close and dispose */
  close() {
    if (!this._overlay || this._overlay.classList.contains('hidden')) return;

    document.removeEventListener('keydown', this._boundKeydown);

    // Hide detail card first
    this._hideDetailCard();

    // Fade labels out
    for (const el of this._labelEls) {
      el.classList.remove('visible', 'active', 'dimmed');
    }

    // Stop animation
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }

    this._disposed = true;

    // Dispose Three.js objects
    this._disposeThree();

    // Hide overlay
    this._overlay.classList.add('hidden');
    this._overlay.setAttribute('aria-hidden', 'true');

    // Clear labels
    if (this._labelsEl) this._labelsEl.innerHTML = '';
    this._labelEls = [];

    // Release focus trap
    if (this._focusTrap) {
      this._focusTrap.release();
      this._focusTrap = null;
    }

    // Release swipe
    if (this._swipeHandle) {
      this._swipeHandle.release();
      this._swipeHandle = null;
    }

    // Disconnect resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    this._activeLayerIndex = -1;
    this._currentKey = null;
    this._currentLayers = null;

    this._announce(t('cs.closed'));
  }

  // ==================== Scene Setup ====================

  _buildScene(layers) {
    const w = this._overlay.clientWidth || window.innerWidth;
    const h = this._overlay.clientHeight || window.innerHeight;

    // Isolated renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: true,
    });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.localClippingEnabled = true;
    this._renderer.setClearColor(0x000000, 0);

    // Scene
    this._scene = new THREE.Scene();

    // Camera — angled view for nice perspective
    this._camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this._camera.position.set(
      Math.sin(THREE.MathUtils.degToRad(35)) * Math.cos(THREE.MathUtils.degToRad(22)) * 3.2,
      Math.sin(THREE.MathUtils.degToRad(22)) * 3.2,
      Math.cos(THREE.MathUtils.degToRad(35)) * Math.cos(THREE.MathUtils.degToRad(22)) * 3.2
    );
    this._camera.lookAt(0, 0, 0);

    // Lights
    const keyLight = new THREE.PointLight(0xfff8e0, 2.5);
    keyLight.position.set(-2, 2, 1.5);
    this._scene.add(keyLight);
    this._scene.add(new THREE.AmbientLight(0x334466, 0.4));

    // Clip planes — two perpendicular planes at origin removing a 90° wedge
    // Start at large offset (nothing clipped), animate to 0
    this._clipPlane1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.0);
    this._clipPlane2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.0);
    const clipPlanes = [this._clipPlane1, this._clipPlane2];

    const maxR = layers[0].r;
    this._layerMeshes = [];
    this._faceMeshes = [];

    // Build concentric layer spheres (outermost → innermost)
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const rNorm = layer.r / maxR; // 0..1
      const radius = rNorm; // world-space radius 0..1

      const tex = generateLayerTexture(layer);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: layer.color,
        roughness: 0.75,
        metalness: classifyLayer(layer.key) >= 2 ? 0.3 : 0.05,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
        side: THREE.DoubleSide,
      });

      const geo = new THREE.SphereGeometry(radius, 64, 64);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { layerIndex: i };
      this._scene.add(mesh);
      this._layerMeshes.push(mesh);
    }

    // Face discs — two circles capping the cut
    // Semi-clip planes to restrict each disc to its half-plane
    const semiClipZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const semiClipX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    const outerR = layers[0].r / maxR;
    const faceTex = generateFaceTexture(layers);

    // Face 1: X-cut face (normal = +X, restricted to -Z hemisphere by semiClipZ)
    const faceMat1 = new THREE.MeshStandardMaterial({
      map: faceTex,
      color: '#ffffff',
      roughness: 0.5,
      metalness: 0.1,
      clippingPlanes: [semiClipZ],
      clipIntersection: false,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(layers[layers.length - 1].color).multiplyScalar(0.08),
    });
    const faceGeo1 = new THREE.CircleGeometry(outerR, 128);
    const faceMesh1 = new THREE.Mesh(faceGeo1, faceMat1);
    faceMesh1.rotation.y = Math.PI / 2;
    faceMesh1.position.x = 0.001;
    this._scene.add(faceMesh1);
    this._faceMeshes.push(faceMesh1);

    // Face 2: Z-cut face (normal = +Z, restricted to -X hemisphere by semiClipX)
    const faceMat2 = new THREE.MeshStandardMaterial({
      map: faceTex,
      color: '#ffffff',
      roughness: 0.5,
      metalness: 0.1,
      clippingPlanes: [semiClipX],
      clipIntersection: false,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(layers[layers.length - 1].color).multiplyScalar(0.08),
    });
    const faceGeo2 = new THREE.CircleGeometry(outerR, 128);
    const faceMesh2 = new THREE.Mesh(faceGeo2, faceMat2);
    faceMesh2.rotation.x = -Math.PI / 2;
    faceMesh2.position.z = 0.001;
    this._scene.add(faceMesh2);
    this._faceMeshes.push(faceMesh2);

    // Core pulsing light
    const coreColor = new THREE.Color(layers[layers.length - 1].color);
    this._coreLight = new THREE.PointLight(coreColor, 0, layers[layers.length - 1].r / maxR * 2.5, 1.5);
    this._scene.add(this._coreLight);

    // Group for Y-rotation
    this._sphereGroup = new THREE.Group();
    // Move layer meshes + face meshes into the group
    for (const m of [...this._layerMeshes, ...this._faceMeshes]) {
      this._scene.remove(m);
      this._sphereGroup.add(m);
    }
    this._scene.add(this._sphereGroup);
    this._sphereGroup.scale.set(0, 0, 0); // start invisible, scale up in animation

    // Core light stays at scene root (not in group, so it doesn't orbit)
    this._scene.add(this._coreLight);
  }

  // ==================== Animation ====================

  _tick() {
    if (this._disposed) return;
    const now = performance.now();
    const elapsed = (now - this._startTime) * 0.001; // seconds

    // --- Phase 1: Sphere appear (0.3 – 1.0 s) ---
    const sphereT = Math.min(Math.max((elapsed - 0.3) / 0.7, 0), 1);
    const sphereScale = this._easeOut(sphereT);
    if (this._sphereGroup) {
      this._sphereGroup.scale.setScalar(sphereScale);
    }

    // --- Phase 2: Cut opens (1.0 – 3.2 s) ---
    const cutT = Math.min(Math.max((elapsed - 1.0) / 2.2, 0), 1);
    const cutEased = this._easeOutCubic(cutT);
    // clipPlane constants animate from 2.0 → 0
    const clipConst = 2.0 * (1 - cutEased);
    if (this._clipPlane1) this._clipPlane1.constant = clipConst;
    if (this._clipPlane2) this._clipPlane2.constant = clipConst;

    // --- Phase 3: Labels fly in (1.4 s + staggered 0.3 s) ---
    if (this._labelEls.length > 0) {
      for (let i = 0; i < this._labelEls.length; i++) {
        const labelStart = 1.4 + i * 0.3;
        if (elapsed >= labelStart) {
          this._labelEls[i].classList.add('visible');
        }
      }
    }

    // --- Idle rotation (3.2 s+) ---
    const rotSpeed = elapsed < 3.2 ? 8 : 4; // deg/s
    if (this._sphereGroup) {
      this._sphereGroup.rotation.y += THREE.MathUtils.degToRad(rotSpeed) * (1 / 60); // approximate per-frame
    }

    // --- Core light pulse ---
    if (this._coreLight && elapsed > 3.2) {
      this._coreLight.intensity = 1.2 + Math.sin(elapsed * 1.2) * 0.4;
    } else if (this._coreLight) {
      this._coreLight.intensity = cutEased * 1.2;
    }

    // Render
    if (this._renderer && this._scene && this._camera) {
      this._renderer.render(this._scene, this._camera);
    }

    this._animId = requestAnimationFrame(() => this._tick());
  }

  _easeOut(t) {
    return 1 - Math.pow(1 - t, 2.5);
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ==================== CSS Labels ====================

  _buildLabels(layers) {
    if (!this._labelsEl) return;
    this._labelsEl.innerHTML = '';
    this._labelEls = [];

    const maxR = layers[0].r;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const rNorm = layer.r / maxR;

      const el = document.createElement('div');
      el.className = 'cs-label';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', t(layer.key));

      const leader = document.createElement('div');
      leader.className = 'cs-leader';

      const dot = document.createElement('div');
      dot.className = 'cs-label-dot';
      dot.style.color = layer.color;
      dot.style.background = layer.color;

      const content = document.createElement('div');
      content.className = 'cs-label-content';

      const name = document.createElement('div');
      name.className = 'cs-label-name';
      name.textContent = t(layer.key);

      const comp = document.createElement('div');
      comp.className = 'cs-label-comp';
      comp.textContent = layer.compositionShort || '';

      const stat = document.createElement('div');
      stat.className = 'cs-label-stat';
      stat.textContent = layer.thickness || layer.temperatureRange || '';

      content.append(name, comp, stat);
      el.append(leader, dot, content);

      // Position: project layer centroid to screen
      el.dataset.layerIndex = String(i);
      el.dataset.rNorm = String(rNorm);

      const idx = i;
      el.addEventListener('click', () => this._onLabelClick(idx));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._onLabelClick(idx); }
      });

      this._labelsEl.appendChild(el);
      this._labelEls.push(el);
    }

    // Position labels after build
    this._positionLabels();
  }

  _positionLabels() {
    if (!this._camera || !this._labelEls.length || !this._currentLayers) return;

    const layers = this._currentLayers;
    const maxR = layers[0].r;
    const overlayW = this._overlay.clientWidth;
    const overlayH = this._overlay.clientHeight;
    const halfW = overlayW / 2;
    const halfH = overlayH / 2;

    for (let i = 0; i < this._labelEls.length; i++) {
      const el = this._labelEls[i];
      const rNorm = layers[i].r / maxR;
      // Project a point on the sphere surface in the visible (right-front) quadrant
      // Use an angle between 30° and 60° from front, at equatorial height
      const angle = THREE.MathUtils.degToRad(30 + i * 5);
      const worldPos = new THREE.Vector3(
        Math.cos(angle) * rNorm * 0.9,
        (0.4 - i * 0.15) * rNorm,
        Math.sin(angle) * rNorm * 0.9
      );

      worldPos.project(this._camera);

      const sx = (worldPos.x * halfW) + halfW;
      const sy = -(worldPos.y * halfH) + halfH;

      // Clamp to overlay bounds
      const clampedX = Math.max(10, Math.min(overlayW - 200, sx));
      const clampedY = Math.max(60, Math.min(overlayH - 80, sy));

      el.style.left = `${clampedX}px`;
      el.style.top = `${clampedY}px`;
    }
  }

  _onResize() {
    if (!this._renderer || !this._camera) return;
    const w = this._overlay.clientWidth;
    const h = this._overlay.clientHeight;
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._positionLabels();
  }

  // ==================== Label Click + Detail Card ====================

  _onLabelClick(index) {
    this._activeLayerIndex = index;

    // Update label classes
    for (let i = 0; i < this._labelEls.length; i++) {
      this._labelEls[i].classList.remove('active', 'dimmed');
      if (i === index) {
        this._labelEls[i].classList.add('active');
      } else {
        this._labelEls[i].classList.add('dimmed');
      }
    }

    this._showDetailCard(this._currentLayers[index]);
  }

  _showDetailCard(layer) {
    if (!this._detailCard) return;

    if (this._detailDot) {
      this._detailDot.style.background = layer.color;
    }
    if (this._detailName) {
      this._detailName.textContent = t(layer.key);
    }
    if (this._detailBody) {
      const rows = [];

      if (layer.compositionShort) {
        rows.push({ label: t('cs.composition'), value: layer.compositionFull || layer.compositionShort });
      }
      if (layer.thickness) {
        rows.push({ label: t('cs.thickness'), value: layer.thickness });
      }
      if (layer.temperatureRange) {
        rows.push({ label: t('cs.temperature'), value: layer.temperatureRange });
      }
      if (layer.pressureRange) {
        rows.push({ label: t('cs.pressure'), value: layer.pressureRange });
      }
      if (layer.state) {
        rows.push({ label: t('cs.state'), value: layer.state });
      }

      let html = rows.map(r => `
        <div class="cs-detail-row">
          <div class="cs-detail-label">${escapeHTML(r.label)}</div>
          <div class="cs-detail-value">${escapeHTML(r.value)}</div>
        </div>
      `).join('');

      if (layer.funFact) {
        html += `
          <div class="cs-detail-funfact">
            <div class="cs-detail-label">${escapeHTML(t('cs.funFact'))}</div>
            <div class="cs-detail-value">${escapeHTML(layer.funFact)}</div>
          </div>
        `;
      }

      this._detailBody.innerHTML = html;
    }

    this._detailCard.classList.remove('hidden');
  }

  _hideDetailCard() {
    if (!this._detailCard) return;
    this._detailCard.classList.add('hidden');

    // Un-dim all labels
    for (const el of this._labelEls) {
      el.classList.remove('active', 'dimmed');
    }
    this._activeLayerIndex = -1;
  }

  // ==================== Keyboard ====================

  _onKeydown(e) {
    if (e.key === 'Escape') {
      if (this._activeLayerIndex >= 0) {
        // First ESC: close detail card
        this._hideDetailCard();
      } else {
        // Second ESC: close overlay
        this.close();
      }
    }
  }

  // ==================== No-data fallback ====================

  _showNoData() {
    if (!this._labelsEl) return;
    const msg = document.createElement('div');
    msg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(200,200,200,0.7);font-family:var(--font-display);font-size:1rem;text-align:center;';
    msg.textContent = t('cs.noData');
    this._labelsEl.appendChild(msg);
  }

  // ==================== Utilities ====================

  _getBodyName(key) {
    // Try to extract a nice body name from the key
    const map = {
      sun: 'Sun',
      mercury: 'Mercury', venus: 'Venus', earth: 'Earth', mars: 'Mars',
      jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
      pluto: 'Pluto', ceres: 'Ceres', eris: 'Eris', haumea: 'Haumea', makemake: 'Makemake',
      earth_moon_0: 'Moon',
      jupiter_moon_0: 'Io', jupiter_moon_1: 'Europa',
      jupiter_moon_2: 'Ganymede', jupiter_moon_3: 'Callisto',
      saturn_moon_0: 'Titan', saturn_moon_1: 'Enceladus',
    };
    return map[key] || key;
  }

  _buildSrLayerList(layers) {
    if (!this._srLayers) return;
    this._srLayers.innerHTML = '';
    this._srLayers.setAttribute('aria-label', t('cs.layersLabel') || 'Geological layers from surface to centre');
    if (!layers) return;
    for (let i = layers.length - 1; i >= 0; i--) {
      const li = document.createElement('li');
      li.textContent = t(layers[i].key);
      this._srLayers.appendChild(li);
    }
  }

  // ==================== Dispose ====================

  _disposeThree() {
    for (const mesh of [...(this._layerMeshes || []), ...(this._faceMeshes || [])]) {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
    }
    this._layerMeshes = [];
    this._faceMeshes = [];

    if (this._coreLight) {
      if (this._coreLight.parent) this._coreLight.parent.remove(this._coreLight);
      this._coreLight = null;
    }

    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = null;
    }

    this._scene = null;
    this._camera = null;
    this._sphereGroup = null;
    this._clipPlane1 = null;
    this._clipPlane2 = null;
  }
}
