/**
 * Asteroid belt and Kuiper belt particle systems.
 * Uses THREE.Points with procedural rocky asteroid sprites.
 */
import * as THREE from 'three';

export class AsteroidBelt {
  constructor(scene) {
    this.scene = scene;
    this.mainBelt = null;
    this.kuiperBelt = null;
    this._elapsed = 0;
  }

  createMainBelt(innerRadius = 50, outerRadius = 58, count = 15000) {
    this.mainBelt = this._createBelt(innerRadius, outerRadius, count, 1.5, 'main');
    this.scene.add(this.mainBelt);
  }

  createKuiperBelt(innerRadius = 128, outerRadius = 165, count = 8000) {
    this.kuiperBelt = this._createBelt(innerRadius, outerRadius, count, 5.0, 'kuiper');
    this.scene.add(this.kuiperBelt);
  }

  _createBelt(innerR, outerR, count, verticalSpread, type) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Asteroid spectral types with approximate colors
    const cTypeColor = [0.35, 0.33, 0.30]; // C-type (carbonaceous, dark grey): 60%
    const sTypeColor = [0.55, 0.38, 0.28]; // S-type (silicaceous, reddish-brown): 30%
    const mTypeColor = [0.70, 0.68, 0.65]; // M-type (metallic, bright): 10%

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = innerR + (outerR - innerR) * (0.5 + 0.5 * this._gaussianRandom());
      const y = this._gaussianRandom() * verticalSpread;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const typeRoll = Math.random();
      let color;
      if (typeRoll < 0.6) color = cTypeColor;
      else if (typeRoll < 0.9) color = sTypeColor;
      else color = mTypeColor;

      const variation = 0.85 + Math.random() * 0.3;
      colors[i * 3] = color[0] * variation;
      colors[i * 3 + 1] = color[1] * variation;
      colors[i * 3 + 2] = color[2] * variation;

      // Enhanced power-law size distribution
      sizes[i] = 0.15 + Math.pow(Math.random(), 4) * 0.6;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Procedural rocky asteroid sprite
    const pointTexture = new THREE.CanvasTexture(
      type === 'kuiper' ? this._createIcySprite() : this._createRockySprite()
    );

    const isKuiper = type === 'kuiper';
    const mat = new THREE.PointsMaterial({
      size: isKuiper ? 0.4 : 0.35,
      sizeAttenuation: true,
      map: pointTexture,
      transparent: true,
      depthWrite: false,
      blending: isKuiper ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexColors: true,
      opacity: isKuiper ? 0.4 : 0.85,
      alphaTest: 0.01,
    });

    return new THREE.Points(geo, mat);
  }

  /** Generate a 64x64 procedural rocky asteroid sprite */
  _createRockySprite() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;

    // Draw irregular rocky polygon
    const vertices = 10;
    const baseRadius = size * 0.35;
    const points = [];
    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * Math.PI * 2;
      const noise = 0.6 + Math.random() * 0.4;
      const r = baseRadius * noise;
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    // Fill with rocky gradient
    const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, baseRadius);
    grad.addColorStop(0, 'rgba(180,170,155,1)');
    grad.addColorStop(0.4, 'rgba(140,130,115,1)');
    grad.addColorStop(0.7, 'rgba(100,95,85,1)');
    grad.addColorStop(1, 'rgba(60,55,50,0.8)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Add surface noise/craters
    for (let i = 0; i < 8; i++) {
      const nx = cx + (Math.random() - 0.5) * baseRadius * 1.2;
      const ny = cy + (Math.random() - 0.5) * baseRadius * 1.2;
      const nr = 1 + Math.random() * 4;
      const brightness = Math.random() > 0.5 ? 'rgba(200,190,180,0.15)' : 'rgba(40,35,30,0.2)';
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fillStyle = brightness;
      ctx.fill();
    }

    // Soft edge fade
    const edgeGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.6, cx, cy, baseRadius * 1.1);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = edgeGrad;
    // Only fade outside the shape
    ctx.globalCompositeOperation = 'source-over';

    return canvas;
  }

  /** Generate a 64x64 icy/dusty sprite for Kuiper belt */
  _createIcySprite() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.4);
    grad.addColorStop(0, 'rgba(200,210,230,0.9)');
    grad.addColorStop(0.3, 'rgba(150,165,190,0.6)');
    grad.addColorStop(0.6, 'rgba(120,130,155,0.3)');
    grad.addColorStop(1, 'rgba(80,90,120,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return canvas;
  }

  _gaussianRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.3;
  }

  update(delta) {
    this._elapsed += delta;
    if (this.mainBelt) {
      this.mainBelt.rotation.y += 0.00008 * delta;
    }
    if (this.kuiperBelt) {
      this.kuiperBelt.rotation.y += 0.00003 * delta;
    }
  }

  setVisible(visible) {
    if (this.mainBelt) this.mainBelt.visible = visible;
    if (this.kuiperBelt) this.kuiperBelt.visible = visible;
  }

  dispose() {
    if (this.mainBelt) {
      this.mainBelt.geometry.dispose();
      this.mainBelt.material.dispose();
      this.scene.remove(this.mainBelt);
    }
    if (this.kuiperBelt) {
      this.kuiperBelt.geometry.dispose();
      this.kuiperBelt.material.dispose();
      this.scene.remove(this.kuiperBelt);
    }
  }
}
