/**
 * Asteroid belt (InstancedMesh 3D rocks) + Kuiper belt (Points) + notable asteroid meshes.
 */
import * as THREE from 'three';
import { ASTEROIDS, ASTEROID_ORDER } from '../data/asteroids.js';

export class AsteroidBelt {
  constructor(scene) {
    this.scene = scene;
    this.mainBeltMeshes = []; // InstancedMesh array
    this.kuiperBelt = null;
    this._elapsed = 0;
    this._mainBeltGroup = null;
    this._notableAsteroids = {}; // key → { mesh, orbitGroup, tiltGroup, data }

    // Quality level
    const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
    this._quality = isMobile ? 'low' : 'high';
  }

  createMainBelt(innerRadius = 50, outerRadius = 58, count = 3000) {
    if (this._quality === 'low') count = 1000;

    this._mainBeltGroup = new THREE.Group();

    // Two geometry variants: rounded and angular (detail 2 = 162 verts for realistic shapes)
    const geoRounded = this._createDeformedIcosahedron(1, 2, 42, 0.55, 1.45);
    const geoAngular = this._createDeformedIcosahedron(1, 2, 99, 0.45, 1.55);

    // Shared material: smooth-shaded PBR for realistic rock appearance
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0.08,
    });

    // 65/35 split
    const countRounded = Math.floor(count * 0.65);
    const countAngular = count - countRounded;

    const meshRounded = new THREE.InstancedMesh(geoRounded, mat, countRounded);
    const meshAngular = new THREE.InstancedMesh(geoAngular, mat, countAngular);
    meshRounded.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(countRounded * 3), 3);
    meshAngular.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(countAngular * 3), 3);

    // Fill rounded instances
    this._fillInstances(meshRounded, countRounded, innerRadius, outerRadius, 1.5, 0);
    // Fill angular instances
    this._fillInstances(meshAngular, countAngular, innerRadius, outerRadius, 1.5, countRounded);

    meshRounded.instanceMatrix.needsUpdate = true;
    meshAngular.instanceMatrix.needsUpdate = true;
    meshRounded.instanceColor.needsUpdate = true;
    meshAngular.instanceColor.needsUpdate = true;

    // Frustum culling off for instanced meshes (they span large area)
    meshRounded.frustumCulled = false;
    meshAngular.frustumCulled = false;

    this._mainBeltGroup.add(meshRounded);
    this._mainBeltGroup.add(meshAngular);
    this.mainBeltMeshes = [meshRounded, meshAngular];
    this.scene.add(this._mainBeltGroup);
  }

  _createDeformedIcosahedron(radius, detail, seed, noiseMin = 0.55, noiseMax = 1.45) {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    // Apply noise deformation to each vertex for realistic rocky shapes
    let s = seed;
    const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
    const range = noiseMax - noiseMin;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      // Multi-octave noise for realistic surface variation
      const n1 = rand(); // large-scale shape
      const n2 = rand() * 0.3; // medium bumps
      const noise = noiseMin + n1 * range + n2 * (range * 0.3);
      const clamped = Math.max(noiseMin, Math.min(noiseMax, noise));
      const newLen = len * clamped;
      const scale = newLen / (len || 1);
      pos.setXYZ(i, x * scale, y * scale, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }

  _fillInstances(mesh, count, innerR, outerR, verticalSpread, seedOffset) {
    // Asteroid spectral type colors (RGB linear)
    const cType = [0.35, 0.33, 0.30]; // C-type: dark grey-brown
    const sType = [0.55, 0.38, 0.28]; // S-type: tan-grey
    const mType = [0.70, 0.68, 0.65]; // M-type: silver-metallic

    const midR = (innerR + outerR) / 2; // spectral gradient boundary

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = innerR + (outerR - innerR) * (0.5 + 0.5 * this._gaussianRandom());
      const y = this._gaussianRandom() * verticalSpread;

      dummy.position.set(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      );

      // Random rotation
      dummy.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      // Power-law scale with aspect ratio variation
      const baseScale = 0.08 + Math.pow(Math.random(), 4) * 0.35;
      const aspectX = 0.7 + Math.random() * 0.6;
      const aspectY = 0.7 + Math.random() * 0.6;
      const aspectZ = 0.7 + Math.random() * 0.6;
      dummy.scale.set(baseScale * aspectX, baseScale * aspectY, baseScale * aspectZ);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Spectral gradient: inner belt = more S-type, outer = more C-type
      const typeRoll = Math.random();
      let c;
      if (r < midR) {
        // Inner belt: 50% S / 30% C / 20% M
        if (typeRoll < 0.50) c = sType;
        else if (typeRoll < 0.80) c = cType;
        else c = mType;
      } else {
        // Outer belt: 70% C / 20% S / 10% M
        if (typeRoll < 0.70) c = cType;
        else if (typeRoll < 0.90) c = sType;
        else c = mType;
      }

      const variation = 0.85 + Math.random() * 0.3;
      color.setRGB(c[0] * variation, c[1] * variation, c[2] * variation);
      mesh.instanceColor.setXYZ(i, color.r, color.g, color.b);
    }
  }

  createKuiperBelt(innerRadius = 140, outerRadius = 180, count = 2000) {
    this.kuiperBelt = this._createPointsBelt(innerRadius, outerRadius, count, 5.0, 'kuiper');
    this.scene.add(this.kuiperBelt);
  }

  _createPointsBelt(innerR, outerR, count, verticalSpread, type) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = innerR + (outerR - innerR) * (0.5 + 0.5 * this._gaussianRandom());
      const y = this._gaussianRandom() * verticalSpread;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const variation = 0.85 + Math.random() * 0.3;
      colors[i * 3] = 0.5 * variation;
      colors[i * 3 + 1] = 0.52 * variation;
      colors[i * 3 + 2] = 0.58 * variation;

      sizes[i] = 0.15 + Math.pow(Math.random(), 4) * 0.6;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const pointTexture = new THREE.CanvasTexture(this._createIcySprite());

    const mat = new THREE.PointsMaterial({
      size: 0.4,
      sizeAttenuation: true,
      map: pointTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      opacity: 0.4,
      alphaTest: 0.01,
    });

    return new THREE.Points(geo, mat);
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

  // ==================== Notable Asteroids ====================

  createNotableAsteroids() {
    for (const key of ASTEROID_ORDER) {
      const data = ASTEROIDS[key];
      if (!data) continue;

      // Follow dwarf planet pattern: orbitGroup → tiltGroup → mesh
      const orbitGroup = new THREE.Group();
      this.scene.add(orbitGroup);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.x = THREE.MathUtils.degToRad(data.orbitInclination || 0);
      orbitGroup.add(tiltGroup);

      // Create unique procedural geometry per asteroid
      const geo = this._createAsteroidGeometry(key);
      const mat = this._generateAsteroidMaterial(key, data);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = data.orbitRadius;
      mesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt || 0);
      mesh.userData = { key, type: 'planet' };

      // Scale mesh to displayRadius
      const currentSize = this._getGeoBoundingRadius(geo);
      const targetSize = data.displayRadius;
      const s = targetSize / currentSize;
      mesh.scale.set(s, s, s);

      tiltGroup.add(mesh);

      this._notableAsteroids[key] = {
        mesh,
        orbitGroup,
        tiltGroup,
        data,
      };
    }
  }

  _getGeoBoundingRadius(geo) {
    geo.computeBoundingSphere();
    return geo.boundingSphere.radius;
  }

  _createAsteroidGeometry(key) {
    switch (key) {
      case 'vesta': return this._createVestaGeometry();
      case 'pallas': return this._createPallasGeometry();
      case 'hygiea': return this._createHygieaGeometry();
      case 'juno': return this._createJunoGeometry();
      case 'eros': return this._createErosGeometry();
      default: return new THREE.IcosahedronGeometry(1, 4);
    }
  }

  /** Vesta: sphere with south pole basin (Rheasilvia) + central peak + noise */
  _createVestaGeometry() {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    let seed = 4242;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;

      // South pole angle (y < 0)
      const southAngle = Math.acos(Math.max(-1, Math.min(1, -ny)));
      let r = len;

      // Rheasilvia basin: depression in the south
      if (southAngle < 0.6) {
        const basinDepth = 0.15 * (1 - southAngle / 0.6);
        r -= basinDepth;
        // Central peak
        if (southAngle < 0.12) {
          r += 0.08 * (1 - southAngle / 0.12);
        }
      }

      // Surface noise
      r *= (0.92 + rand() * 0.16);

      const s = r / len;
      pos.setXYZ(i, x * s, y * s, z * s);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /** Pallas: oblate sphere with crater depressions + heavy noise */
  _createPallasGeometry() {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    let seed = 1802;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    // Pre-generate crater positions
    const craters = [];
    for (let c = 0; c < 6; c++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      craters.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        radius: 0.2 + rand() * 0.3,
        depth: 0.05 + rand() * 0.08,
      });
    }

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;

      // Oblate (squash y by 10%)
      let r = len * (1 - 0.1 * ny * ny);

      // Crater depressions
      for (const cr of craters) {
        const dot = nx * cr.x + ny * cr.y + nz * cr.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle < cr.radius) {
          r -= cr.depth * (1 - angle / cr.radius);
        }
      }

      // Heavy noise
      r *= (0.88 + rand() * 0.24);

      const s = r / len;
      pos.setXYZ(i, x * s, y * s, z * s);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /** Hygiea: nearly spherical with very mild noise */
  _createHygieaGeometry() {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    let seed = 2019;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);

      // Very mild deformation — nearly spherical
      const r = len * (0.97 + rand() * 0.06);
      const s = r / len;
      pos.setXYZ(i, x * s, y * s, z * s);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /** Juno: slightly elongated with crater depressions */
  _createJunoGeometry() {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    let seed = 1804;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    // Craters
    const craters = [];
    for (let c = 0; c < 4; c++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      craters.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        radius: 0.25 + rand() * 0.2,
        depth: 0.06 + rand() * 0.06,
      });
    }

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;

      // Elongate along X axis
      let r = len;

      // Crater depressions
      for (const cr of craters) {
        const dot = nx * cr.x + ny * cr.y + nz * cr.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle < cr.radius) {
          r -= cr.depth * (1 - angle / cr.radius);
        }
      }

      // Moderate noise — angular feel preserved by low-detail icosahedron
      r *= (0.90 + rand() * 0.20);

      const s = r / len;
      // Elongation: stretch x by 1.2
      pos.setXYZ(i, x * s * 1.2, y * s, z * s);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /** Eros: peanut/bi-lobed shape via waist pinch + X-axis elongation */
  _createErosGeometry() {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    let seed = 2000;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;

      let r = len;

      // Waist pinch: suppress radius near the equatorial center (nx ~ 0)
      const pinch = 1 - 0.3 * Math.exp(-nx * nx / 0.08);
      r *= pinch;

      // Surface noise
      r *= (0.90 + rand() * 0.20);

      const s = r / len;
      // Elongate along X by 1.5 for peanut shape
      pos.setXYZ(i, x * s * 1.5, y * s * 0.85, z * s * 0.85);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // ==================== Procedural Asteroid Materials ====================

  /**
   * Per-asteroid crater definitions (UV space, 0-1 range).
   * Each crater: { u, v, r, depth, ejecta }
   *   u, v: centre position in UV equirectangular (0-1)
   *   r: radius (fraction of texture width)
   *   depth: darkening factor for floor (0-1)
   *   ejecta: rim brightness factor
   */
  _getCraterConfig(key) {
    switch (key) {
      case 'vesta':
        return {
          spectralType: 'V',
          baseRgb: [160, 152, 136],
          craters: [
            // Rheasilvia — huge south-pole basin
            { u: 0.50, v: 0.82, r: 0.30, depth: 0.55, ejecta: 0.35 },
            // Veneneia — overlapping old basin
            { u: 0.30, v: 0.72, r: 0.20, depth: 0.45, ejecta: 0.25 },
            // Olbers (bright rays)
            { u: 0.70, v: 0.28, r: 0.07, depth: 0.30, ejecta: 0.55 },
            // Smaller craters
            { u: 0.20, v: 0.45, r: 0.05, depth: 0.35, ejecta: 0.30 },
            { u: 0.80, v: 0.55, r: 0.04, depth: 0.30, ejecta: 0.28 },
            { u: 0.45, v: 0.38, r: 0.06, depth: 0.32, ejecta: 0.25 },
          ],
        };
      case 'pallas':
        return {
          spectralType: 'B',
          baseRgb: [100, 102, 110],
          craters: [
            { u: 0.40, v: 0.35, r: 0.18, depth: 0.50, ejecta: 0.18 },
            { u: 0.60, v: 0.60, r: 0.15, depth: 0.45, ejecta: 0.15 },
            { u: 0.25, v: 0.65, r: 0.12, depth: 0.40, ejecta: 0.12 },
            { u: 0.70, v: 0.30, r: 0.10, depth: 0.38, ejecta: 0.14 },
            { u: 0.50, v: 0.50, r: 0.08, depth: 0.35, ejecta: 0.10 },
            { u: 0.15, v: 0.40, r: 0.07, depth: 0.38, ejecta: 0.10 },
            { u: 0.85, v: 0.70, r: 0.06, depth: 0.32, ejecta: 0.08 },
          ],
        };
      case 'hygiea':
        return {
          spectralType: 'C',
          baseRgb: [75, 74, 70],
          craters: [
            // Very subtle — primitive undifferentiated body
            { u: 0.50, v: 0.50, r: 0.08, depth: 0.22, ejecta: 0.08 },
            { u: 0.30, v: 0.30, r: 0.05, depth: 0.18, ejecta: 0.06 },
            { u: 0.70, v: 0.65, r: 0.04, depth: 0.15, ejecta: 0.05 },
          ],
        };
      case 'juno':
        return {
          spectralType: 'S',
          baseRgb: [176, 160, 144],
          craters: [
            { u: 0.50, v: 0.45, r: 0.12, depth: 0.40, ejecta: 0.30 },
            { u: 0.25, v: 0.55, r: 0.09, depth: 0.35, ejecta: 0.26 },
            { u: 0.75, v: 0.38, r: 0.08, depth: 0.33, ejecta: 0.24 },
            { u: 0.60, v: 0.72, r: 0.06, depth: 0.30, ejecta: 0.20 },
          ],
        };
      case 'eros':
        return {
          spectralType: 'S',
          baseRgb: [200, 168, 120],
          craters: [
            // Psyche — large crater with dark floor
            { u: 0.55, v: 0.40, r: 0.14, depth: 0.52, ejecta: 0.25 },
            // Himeros saddle — treated as shallow depression
            { u: 0.50, v: 0.52, r: 0.18, depth: 0.20, ejecta: 0.05 },
            // Smaller craters
            { u: 0.30, v: 0.35, r: 0.07, depth: 0.38, ejecta: 0.22 },
            { u: 0.75, v: 0.60, r: 0.06, depth: 0.35, ejecta: 0.20 },
            { u: 0.20, v: 0.65, r: 0.05, depth: 0.30, ejecta: 0.18 },
          ],
        };
      default:
        return {
          spectralType: 'C',
          baseRgb: [100, 98, 95],
          craters: [],
        };
    }
  }

  /** Generate a 512×512 albedo CanvasTexture */
  _generateAlbedoTexture(key, config) {
    const W = 512, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const [br, bg, bb] = config.baseRgb;

    // Base fill with subtle noise
    const imgData = ctx.createImageData(W, H);
    const d = imgData.data;
    let seed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < W * H; i++) {
      const noise = 0.88 + rand() * 0.24;
      d[i * 4 + 0] = Math.min(255, br * noise);
      d[i * 4 + 1] = Math.min(255, bg * noise);
      d[i * 4 + 2] = Math.min(255, bb * noise);
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // Paint craters
    for (const cr of config.craters) {
      const cx = cr.u * W;
      const cy = cr.v * H;
      const r = cr.r * W;

      // Dark floor
      const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
      const floorA = Math.min(0.85, cr.depth * 0.9);
      floorGrad.addColorStop(0, `rgba(0,0,0,${floorA})`);
      floorGrad.addColorStop(0.6, `rgba(0,0,0,${floorA * 0.6})`);
      floorGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Bright ejecta rim
      const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.3);
      const rimA = cr.ejecta * 0.7;
      rimGrad.addColorStop(0, `rgba(255,255,240,${rimA})`);
      rimGrad.addColorStop(0.5, `rgba(255,255,240,${rimA * 0.4})`);
      rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Ray system for large craters
      if (cr.r > 0.12) {
        ctx.save();
        ctx.translate(cx, cy);
        const rayCount = 6 + Math.floor(rand() * 4);
        for (let i = 0; i < rayCount; i++) {
          const rayAngle = (i / rayCount) * Math.PI * 2 + rand() * 0.3;
          const rayLen = r * (1.8 + rand() * 2.0);
          const rayW = r * (0.06 + rand() * 0.08);
          const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(rayAngle) * rayLen, Math.sin(rayAngle) * rayLen);
          rayGrad.addColorStop(0, `rgba(255,255,240,${rimA * 0.5})`);
          rayGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(Math.cos(rayAngle - 0.05) * r, Math.sin(rayAngle - 0.05) * r);
          ctx.lineTo(Math.cos(rayAngle + 0.05) * r, Math.sin(rayAngle + 0.05) * r);
          ctx.lineTo(Math.cos(rayAngle + 0.01) * rayLen, Math.sin(rayAngle + 0.01) * rayLen);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Juno: equatorial bright band
    if (key === 'juno') {
      const bandGrad = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.65);
      bandGrad.addColorStop(0, 'rgba(255,255,200,0)');
      bandGrad.addColorStop(0.5, 'rgba(255,255,200,0.12)');
      bandGrad.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // Pallas: dark hemisphere (left half is darker)
    if (key === 'pallas') {
      const hemiGrad = ctx.createLinearGradient(0, 0, W, 0);
      hemiGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
      hemiGrad.addColorStop(0.45, 'rgba(0,0,0,0.08)');
      hemiGrad.addColorStop(0.55, 'rgba(255,255,255,0.04)');
      hemiGrad.addColorStop(1, 'rgba(255,255,255,0.10)');
      ctx.fillStyle = hemiGrad;
      ctx.fillRect(0, 0, W, H);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /** Generate a 256×256 normal map CanvasTexture using Sobel kernel on height field */
  _generateNormalMap(key, config) {
    const W = 256, H = 256;

    // Build height field
    const hf = new Float32Array(W * H);

    // Background roughness noise
    let seed = key.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 1);
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < W * H; i++) {
      hf[i] = (rand() - 0.5) * 0.1;
    }

    // Add crater height profiles
    for (const cr of config.craters) {
      const cx = cr.u * W;
      const cy = cr.v * H;
      const r = cr.r * W;

      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          const dx = px - cx;
          const dy = py - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < r * 1.4) {
            const t = dist / r;
            let h = 0;
            if (t < 0.7) {
              // Floor: depressed
              h = -0.6 * (1 - t / 0.7);
            } else if (t < 1.0) {
              // Rim: raised
              const rimT = (t - 0.7) / 0.3;
              h = 0.4 * Math.sin(rimT * Math.PI);
            } else {
              // Ejecta: gentle falloff
              h = 0.1 * Math.exp(-(t - 1.0) * 5);
            }
            hf[py * W + px] += h * cr.depth;
          }
        }
      }
    }

    // Sobel 3×3 → surface normals → RGB
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(W, H);
    const d = imgData.data;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        // Sample 3×3 neighbours (clamp to edges)
        const tl = hf[Math.max(0, y - 1) * W + Math.max(0, x - 1)];
        const tc = hf[Math.max(0, y - 1) * W + x];
        const tr = hf[Math.max(0, y - 1) * W + Math.min(W - 1, x + 1)];
        const ml = hf[y * W + Math.max(0, x - 1)];
        const mr = hf[y * W + Math.min(W - 1, x + 1)];
        const bl = hf[Math.min(H - 1, y + 1) * W + Math.max(0, x - 1)];
        const bc = hf[Math.min(H - 1, y + 1) * W + x];
        const br2 = hf[Math.min(H - 1, y + 1) * W + Math.min(W - 1, x + 1)];

        const dX = (tr + 2 * mr + br2) - (tl + 2 * ml + bl);
        const dY = (bl + 2 * bc + br2) - (tl + 2 * tc + tr);

        // Normal = normalize(-dX, -dY, 1/strength)
        const strength = 2.5;
        const nx = -dX * strength;
        const ny = -dY * strength;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        d[idx * 4 + 0] = Math.round((nx / len) * 0.5 * 255 + 127.5);
        d[idx * 4 + 1] = Math.round((ny / len) * 0.5 * 255 + 127.5);
        d[idx * 4 + 2] = Math.round((nz / len) * 0.5 * 255 + 127.5);
        d[idx * 4 + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  /** Generate a 128×128 roughness map CanvasTexture */
  _generateRoughnessMap(key, config) {
    const W = 128, H = 128;

    // Base roughness per spectral type
    const baseRoughness = { C: 0.92, B: 0.90, S: 0.82, V: 0.85, M: 0.62 }[config.spectralType] || 0.88;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const imgData = ctx.createImageData(W, H);
    const d = imgData.data;

    let seed = key.length * 7 + 13;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < W * H; i++) {
      const noise = (rand() - 0.5) * 0.1;
      let r = baseRoughness + noise;

      // Craters slightly smoother floors
      const px = (i % W) / W;
      const py = Math.floor(i / W) / H;
      for (const cr of config.craters) {
        const dx = px - cr.u;
        const dy = py - cr.v;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cr.r * 0.6) {
          r -= 0.08 * (1 - dist / (cr.r * 0.6));
        }
      }

      r = Math.max(0.1, Math.min(1.0, r));
      const v = Math.round(r * 255);
      d[i * 4 + 0] = v;
      d[i * 4 + 1] = v;
      d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  /** Generate full PBR material for a notable asteroid */
  _generateAsteroidMaterial(key, data) {
    const config = this._getCraterConfig(key);
    const albedoTex = this._generateAlbedoTexture(key, config);
    const normalTex = this._generateNormalMap(key, config);
    const roughnessTex = this._generateRoughnessMap(key, config);

    const metalnessMap = { C: 0.05, B: 0.05, S: 0.10, V: 0.08, M: 0.35 };
    const roughnessMap = { C: 0.92, B: 0.90, S: 0.82, V: 0.85, M: 0.62 };

    return new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughnessMap: roughnessTex,
      roughness: roughnessMap[config.spectralType] || 0.88,
      metalness: metalnessMap[config.spectralType] || 0.08,
    });
  }

  /** Get a notable asteroid entry */
  getNotableAsteroid(key) {
    return this._notableAsteroids[key] || null;
  }

  /** Get all notable asteroid keys */
  getNotableAsteroidKeys() {
    return ASTEROID_ORDER;
  }

  _gaussianRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.3;
  }

  update(delta) {
    this._elapsed += delta;
    // Rotate main belt group (no per-instance updates)
    if (this._mainBeltGroup) {
      this._mainBeltGroup.rotation.y += 0.00008 * delta;
    }
    if (this.kuiperBelt) {
      this.kuiperBelt.rotation.y += 0.00003 * delta;
    }
    // Rotate notable asteroids on their axes
    for (const key of ASTEROID_ORDER) {
      const entry = this._notableAsteroids[key];
      if (entry) {
        const rotSpeed = entry.data.rotationSpeed || 0.005;
        entry.mesh.rotation.y += rotSpeed * delta * 3;
      }
    }
  }

  setVisible(visible) {
    if (this._mainBeltGroup) this._mainBeltGroup.visible = visible;
    if (this.kuiperBelt) this.kuiperBelt.visible = visible;
  }

  dispose() {
    if (this._mainBeltGroup) {
      for (const m of this.mainBeltMeshes) {
        m.geometry.dispose();
        m.material.dispose();
      }
      this.scene.remove(this._mainBeltGroup);
    }
    if (this.kuiperBelt) {
      this.kuiperBelt.geometry.dispose();
      this.kuiperBelt.material.dispose();
      this.scene.remove(this.kuiperBelt);
    }
    for (const key of ASTEROID_ORDER) {
      const entry = this._notableAsteroids[key];
      if (entry) {
        entry.mesh.geometry.dispose();
        if (entry.mesh.material) {
          const mat = entry.mesh.material;
          if (mat.map) mat.map.dispose();
          if (mat.normalMap) mat.normalMap.dispose();
          if (mat.roughnessMap) mat.roughnessMap.dispose();
          mat.dispose();
        }
        this.scene.remove(entry.orbitGroup);
      }
    }
  }
}
