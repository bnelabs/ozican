/**
 * CutawayRenderer — renders cross-section directly on the 3D planet in the main scene.
 * Uses dual perpendicular clipping planes with clipIntersection=true to remove one
 * quadrant (quarter-section) of the sphere, exposing curved 3D interior layers —
 * like a National Geographic / geology textbook illustration.
 *
 * IMPORTANT: Three.js material.clippingPlanes are in WORLD space. Since planets orbit
 * at various world positions, all clip planes must be offset to the planet's current
 * world position and updated every frame to track it.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANET_LAYERS } from '../data/planetLayers.js';
import { t } from '../i18n/i18n.js';

/* ---- GLSL for cinematic cross-section face ---- */
const FACE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FACE_FRAGMENT = /* glsl */ `
uniform vec3  layerColors[8];
uniform vec3  layerDeepColors[8];
uniform float layerRadii[8];
uniform int   layerTypes[8];  // 0=rock, 1=mantle, 2=liquid, 3=crystal, 4=gas, 5=ice
uniform int   layerCount;
uniform float time;

varying vec2 vUv;

/* ---- Noise functions ---- */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion — 6 octaves for rich geological detail
float fbm(vec2 p) {
  float f = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    f += a * noise2D(p);
    p *= 2.07;
    a *= 0.48;
  }
  return f;
}

// Domain-warped FBM for organic geological patterns
float warpedFbm(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0)),
                fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.05),
                fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.03));
  return fbm(p + 4.0 * r);
}

// Voronoi / cellular noise for crystalline patterns
float voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = vec2(hash(i + neighbor), hash(i + neighbor + vec2(37.0, 17.0)));
      vec2 diff = neighbor + point - f;
      minDist = min(minDist, length(diff));
    }
  }
  return minDist;
}

/* ---- Per-layer texture generators ---- */

// Rock/crust: stratified layers with fractures
vec3 rockTexture(vec2 p, vec3 baseCol, vec3 deepCol, float t) {
  // Horizontal strata with FBM warping
  vec2 warp = vec2(fbm(p * 3.0), fbm(p * 3.0 + 7.3));
  float strata = fbm(vec2(p.x * 2.0, p.y * 12.0) + warp * 1.5);
  // Fracture lines
  float fractures = smoothstep(0.48, 0.50, fbm(p * 20.0));
  vec3 col = mix(baseCol, deepCol, strata * 0.7);
  col *= 1.0 - fractures * 0.3;
  // Subtle grain
  col *= 0.92 + noise2D(p * 40.0) * 0.16;
  return col;
}

// Mantle: slow convection cells with thermal gradients
vec3 mantleTexture(vec2 p, vec3 baseCol, vec3 deepCol, float t) {
  // Animated convection using domain warping
  vec2 flow = vec2(0.0, t * 0.015);
  float convection = warpedFbm(p * 2.5 + flow, t);
  // Convection cell boundaries (brighter)
  float cellEdge = smoothstep(0.3, 0.5, convection) - smoothstep(0.5, 0.7, convection);
  vec3 col = mix(deepCol, baseCol, convection);
  // Hot upwelling streaks
  float upwelling = smoothstep(0.65, 0.85, fbm(p * 4.0 + flow * 2.0));
  col = mix(col, baseCol * 1.4, upwelling * 0.5);
  // Cell boundary glow
  col += vec3(0.15, 0.06, 0.02) * cellEdge * 2.0;
  col *= 0.9 + noise2D(p * 15.0 + t * 0.1) * 0.2;
  return col;
}

// Liquid metal: turbulent flow with metallic shimmer
vec3 liquidTexture(vec2 p, vec3 baseCol, vec3 deepCol, float t) {
  // Fast turbulent flow
  vec2 flow = vec2(t * 0.04, t * 0.025);
  float turb = warpedFbm(p * 3.0 + flow, t * 2.0);
  // Metallic shimmer bands
  float shimmer = sin(turb * 12.0 + t * 1.5) * 0.5 + 0.5;
  vec3 col = mix(deepCol, baseCol, turb);
  // Bright metallic highlights
  col += baseCol * shimmer * 0.3;
  // Flowing ripples
  float ripple = sin(p.x * 8.0 + p.y * 5.0 + turb * 6.0 + t * 0.8) * 0.5 + 0.5;
  col = mix(col, baseCol * 1.3, ripple * 0.2);
  return col;
}

// Crystal: Voronoi facets with internal glow
vec3 crystalTexture(vec2 p, vec3 baseCol, vec3 deepCol, float t) {
  float cells = voronoi(p * 8.0);
  float cellEdge = smoothstep(0.0, 0.12, cells);
  // Pulsing internal glow
  float pulse = sin(t * 1.2) * 0.15 + 0.85;
  vec3 col = mix(baseCol * 1.5, deepCol, cellEdge);
  col *= pulse;
  // Bright crystal faces
  float facets = voronoi(p * 16.0 + t * 0.1);
  col += baseCol * 0.4 * smoothstep(0.3, 0.0, facets);
  return col;
}

// Gas: swirling cloud bands
vec3 gasTexture(vec2 p, vec3 baseCol, vec3 deepCol, float t) {
  vec2 flow = vec2(t * 0.02, 0.0);
  float bands = sin(p.y * 20.0 + fbm(p * 3.0 + flow) * 4.0) * 0.5 + 0.5;
  float swirl = warpedFbm(p * 2.0 + flow, t);
  vec3 col = mix(deepCol, baseCol, bands * 0.6 + swirl * 0.4);
  col *= 0.9 + noise2D(p * 10.0 + t * 0.05) * 0.2;
  return col;
}

// Ice: translucent fracture patterns
vec3 iceTexture(vec2 p, vec3 baseCol, vec3 deepCol, float t) {
  float cracks = voronoi(p * 6.0);
  float subCracks = voronoi(p * 18.0);
  vec3 col = mix(baseCol, deepCol, smoothstep(0.0, 0.3, cracks));
  // Fine internal fractures
  col = mix(col, baseCol * 1.3, smoothstep(0.02, 0.0, subCracks) * 0.4);
  // Subtle translucent shimmer
  col += vec3(0.05, 0.08, 0.12) * sin(t * 0.8 + cracks * 8.0) * 0.3;
  return col;
}

void main() {
  vec2 centered = vUv * 2.0 - 1.0;
  float dist = length(centered);
  if (dist > 1.0) discard;

  // Angle for texture coordinate variety
  float angle = atan(centered.y, centered.x);

  // Find which layer this fragment belongs to + blend at boundaries
  vec3 color = layerColors[0];
  int currentLayer = 0;
  for (int i = 0; i < 8; i++) {
    if (i >= layerCount) break;
    if (dist <= layerRadii[i]) {
      currentLayer = i;
    }
  }

  // Get layer colors and type
  vec3 baseCol = layerColors[currentLayer];
  vec3 deepCol = layerDeepColors[currentLayer];
  int lType = layerTypes[currentLayer];

  // Texture coordinate based on position within the disc
  vec2 texCoord = centered * 3.0;

  // Apply per-layer texture
  if (lType == 0) {
    color = rockTexture(texCoord, baseCol, deepCol, time);
  } else if (lType == 1) {
    color = mantleTexture(texCoord, baseCol, deepCol, time);
  } else if (lType == 2) {
    color = liquidTexture(texCoord, baseCol, deepCol, time);
  } else if (lType == 3) {
    color = crystalTexture(texCoord, baseCol, deepCol, time);
  } else if (lType == 4) {
    color = gasTexture(texCoord, baseCol, deepCol, time);
  } else if (lType == 5) {
    color = iceTexture(texCoord, baseCol, deepCol, time);
  }

  // Smooth boundary transitions with thermal gradient glow
  for (int i = 0; i < 8; i++) {
    if (i >= layerCount - 1) break;
    float boundary = layerRadii[i];
    float boundaryDist = abs(dist - boundary);
    if (boundaryDist < 0.03) {
      // Thermal gradient glow at boundaries (warm orange-red)
      float glow = exp(-pow(boundaryDist / 0.012, 2.0));
      float depth = 1.0 - boundary; // deeper = warmer
      vec3 glowColor = mix(vec3(0.2, 0.15, 0.1), vec3(0.5, 0.25, 0.05), depth);
      color += glowColor * glow * 1.5;
    }
  }

  // Depth-based color temperature shift (cool surface → hot core)
  float depthFactor = 1.0 - dist;
  color = mix(color, color * vec3(1.1, 0.95, 0.85), depthFactor * 0.3);

  // Core emissive bloom with physically-based falloff
  float coreRadius = layerRadii[layerCount - 1];
  if (dist < coreRadius * 2.0) {
    float coreDist = dist / coreRadius;
    float coreGlow = exp(-coreDist * coreDist * 1.5);
    vec3 coreCol = layerColors[layerCount - 1];
    // Intense white-hot center fading to layer color
    vec3 hotCenter = mix(coreCol * 2.0, vec3(1.0, 0.95, 0.8), coreGlow * 0.6);
    color += hotCenter * coreGlow * 0.8;
  }

  // Radial depth darkening (stronger at edges for 3D volume feel)
  color *= 1.0 - 0.35 * pow(dist, 1.5);

  // Subtle time-based shimmer
  color *= 1.0 + sin(time * 1.2 + dist * 5.0 + angle * 2.0) * 0.015;

  gl_FragColor = vec4(color, 1.0);
}
`;

export class CutawayRenderer {
  /**
   * @param {HTMLElement} containerElement - DOM container for labels overlay
   * @param {string} planetKey - Key of the planet to show cross-section for
   * @param {THREE.Mesh} [planetMesh] - Optional: the actual planet mesh in the main scene
   * @param {THREE.WebGLRenderer} [renderer] - Optional: the main scene renderer
   */
  constructor(containerElement, planetKey, planetMesh, renderer) {
    this.container = containerElement;
    this.planetKey = planetKey;
    this.planetMesh = planetMesh;
    this.mainRenderer = renderer;
    this.layerMeshes = [];
    this.clipPlane1 = null;
    this.clipPlane2 = null;
    this._animationId = null;
    this._disposed = false;
    this._labelElements = [];
    this._animationComplete = false;
    this._startTime = null;
    this._originalMaterials = [];
    this._coreLight = null;
    this._faceMaterial1 = null;
    this._faceMaterial2 = null;

    // Semi-circle clip planes for faces/rims (updated each frame)
    this._semiClipZ = null;
    this._semiClipX = null;

    // World position tracker
    this._worldPos = new THREE.Vector3();

    // Fallback: if no planet mesh provided, use legacy mini-renderer mode
    this._useLegacyMode = !planetMesh;

    // Legacy mode objects
    this._legacyRenderer = null;
    this._legacyScene = null;
    this._legacyCamera = null;
    this._legacyControls = null;
  }

  init() {
    const layers = PLANET_LAYERS[this.planetKey];
    if (!layers) return;

    if (this._useLegacyMode) {
      this._initLegacy(layers);
      return;
    }

    this._initOnPlanet(layers);
  }

  /** Classify layer type from its key name */
  _classifyLayer(key) {
    const k = key.toLowerCase();
    if (k.includes('core') && (k.includes('inner') || k.includes('solid'))) return 3; // crystal
    if (k.includes('core') || k.includes('metallic')) return 2; // liquid metal
    if (k.includes('mantle') && !k.includes('ice')) return 1; // mantle convection
    if (k.includes('cloud') || k.includes('atmosphere') || k.includes('molecular') ||
        k.includes('corona') || k.includes('chromosphere') || k.includes('photosphere') ||
        k.includes('convective') || k.includes('radiative')) return 4; // gas
    if (k.includes('ice') || k.includes('ocean') || k.includes('nitrogen')) return 5; // ice
    return 0; // rock/crust
  }

  /** Build cinematic cross-section face ShaderMaterial from layer data */
  _buildFaceMaterial(layers, maxR) {
    const colors = [];
    const deepColors = [];
    const radii = [];
    const types = [];
    for (let i = 0; i < 8; i++) {
      if (i < layers.length) {
        const baseCol = new THREE.Color(layers[i].color);
        colors.push(baseCol);
        // Deep color: darker, warmer variant for texture mixing
        const deep = layers[i].deepColor
          ? new THREE.Color(layers[i].deepColor)
          : baseCol.clone().multiplyScalar(0.6);
        deepColors.push(deep);
        radii.push(layers[i].r / maxR);
        types.push(this._classifyLayer(layers[i].key));
      } else {
        colors.push(new THREE.Color(0x000000));
        deepColors.push(new THREE.Color(0x000000));
        radii.push(0.0);
        types.push(0);
      }
    }

    return new THREE.ShaderMaterial({
      vertexShader: FACE_VERTEX,
      fragmentShader: FACE_FRAGMENT,
      uniforms: {
        layerColors: { value: colors },
        layerDeepColors: { value: deepColors },
        layerRadii: { value: radii },
        layerTypes: { value: types },
        layerCount: { value: layers.length },
        time: { value: 0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });
  }

  /** Create per-layer material with geological differentiation */
  _createLayerMaterial(layer, isCore, isInner, layers) {
    const layerType = this._classifyLayer(layer.key);
    const baseColor = new THREE.Color(layer.color);

    // Material properties vary by geological type
    let roughness, metalness, emissiveScale, emissiveIntensity;

    switch (layerType) {
      case 3: // crystal inner core
        roughness = 0.2;
        metalness = 0.4;
        emissiveScale = 0.7;
        emissiveIntensity = 3.0;
        break;
      case 2: // liquid metal outer core
        roughness = 0.15;
        metalness = 0.6;
        emissiveScale = 0.5;
        emissiveIntensity = 2.0;
        break;
      case 1: // mantle convection
        roughness = 0.55;
        metalness = 0.1;
        emissiveScale = 0.3;
        emissiveIntensity = 1.2;
        break;
      case 4: // gas
        roughness = 0.8;
        metalness = 0.0;
        emissiveScale = 0.15;
        emissiveIntensity = 0.8;
        break;
      case 5: // ice
        roughness = 0.25;
        metalness = 0.05;
        emissiveScale = 0.1;
        emissiveIntensity = 0.5;
        break;
      default: // rock/crust
        roughness = 0.75;
        metalness = 0.08;
        emissiveScale = 0.05;
        emissiveIntensity = 0.3;
        break;
    }

    return new THREE.MeshStandardMaterial({
      color: layer.color,
      roughness,
      metalness,
      clipShadows: true,
      side: THREE.DoubleSide,
      emissive: baseColor.clone().multiplyScalar(emissiveScale),
      emissiveIntensity,
    });
  }

  /** Main mode: render cross-section on the actual 3D planet mesh */
  _initOnPlanet(layers) {
    if (this.mainRenderer) {
      this.mainRenderer.localClippingEnabled = true;
    }

    const planetRadius = this.planetMesh.geometry.parameters
      ? this.planetMesh.geometry.parameters.radius
      : 1;

    const maxR = layers[0].r;

    // Get planet world position
    this.planetMesh.getWorldPosition(this._worldPos);
    const wx = this._worldPos.x;
    const wz = this._worldPos.z;
    const offset = planetRadius * 1.1;

    this.clipPlane1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), wx + offset);
    this.clipPlane2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), wz + offset);
    const clipPlanes = [this.clipPlane1, this.clipPlane2];

    // Save original material and modify to support clipping
    const origMat = this.planetMesh.material;
    this._originalMaterials.push({ mesh: this.planetMesh, material: origMat });

    const clippedMat = origMat.clone();
    clippedMat.clippingPlanes = clipPlanes;
    clippedMat.clipIntersection = true;
    clippedMat.clipShadows = true;
    clippedMat.side = THREE.DoubleSide;
    this.planetMesh.material = clippedMat;

    // Also clip child meshes
    this.planetMesh.children.forEach(child => {
      if (child.material) {
        this._originalMaterials.push({ mesh: child, material: child.material });
        const cMat = child.material.clone();
        cMat.clippingPlanes = clipPlanes;
        cMat.clipIntersection = true;
        cMat.clipShadows = true;
        cMat.side = THREE.DoubleSide;
        child.material = cMat;
      }
    });

    // Create concentric layer spheres with per-layer geological materials
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (i === 0) continue;

      const radius = (layer.r / maxR) * planetRadius;
      const segments = Math.max(24, Math.floor(48 * (radius / planetRadius)));
      const geo = new THREE.SphereGeometry(radius, segments, segments);

      const isCore = i === layers.length - 1;
      const isInner = i === layers.length - 2;
      const mat = this._createLayerMaterial(layer, isCore, isInner, layers);
      mat.clippingPlanes = clipPlanes;
      mat.clipIntersection = true;

      const mesh = new THREE.Mesh(geo, mat);
      this.planetMesh.add(mesh);
      this.layerMeshes.push({ mesh, data: layer, radius });
    }

    // Create two cross-section face discs
    this._createWedgeFaces(layers, maxR, planetRadius, wx, wz);

    // Core glow — multiple lights for cinematic depth
    const coreColor = new THREE.Color(layers[layers.length - 1].color);
    this._coreLight = new THREE.PointLight(coreColor, 3.0, planetRadius * 2.5, 1.5);
    this.planetMesh.add(this._coreLight);

    // Secondary warm fill light for interior illumination
    const fillLight = new THREE.PointLight(0xff6633, 1.0, planetRadius * 1.5, 2);
    fillLight.position.set(0, 0, 0);
    this.planetMesh.add(fillLight);
    this.layerMeshes.push({ mesh: fillLight, data: null, radius: 0, isLight: true });

    // Two rim rings
    this._createWedgeRims(planetRadius);

    this._startTime = performance.now();
    this._animate();
  }

  /** Create two semi-circular face discs for the wedge cutaway */
  _createWedgeFaces(layers, maxR, planetRadius, wx, wz) {
    this._semiClipZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), wz);
    this._semiClipX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), wx);

    // Face 1: X-cut face at x=0 (local), showing -Z hemisphere
    this._faceMaterial1 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial1.clippingPlanes = [this._semiClipZ];
    this._faceMaterial1.clipIntersection = false;

    const faceGeo1 = new THREE.CircleGeometry(planetRadius, 64);
    const faceMesh1 = new THREE.Mesh(faceGeo1, this._faceMaterial1);
    faceMesh1.rotation.y = Math.PI / 2;
    faceMesh1.position.x = 0.001;
    this.planetMesh.add(faceMesh1);
    this.layerMeshes.push({ mesh: faceMesh1, data: null, radius: planetRadius, isFace: true });

    // Face 2: Z-cut face at z=0 (local), showing -X hemisphere
    this._faceMaterial2 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial2.clippingPlanes = [this._semiClipX];
    this._faceMaterial2.clipIntersection = false;

    const faceGeo2 = new THREE.CircleGeometry(planetRadius, 64);
    const faceMesh2 = new THREE.Mesh(faceGeo2, this._faceMaterial2);
    faceMesh2.rotation.x = -Math.PI / 2;
    faceMesh2.position.z = 0.001;
    this.planetMesh.add(faceMesh2);
    this.layerMeshes.push({ mesh: faceMesh2, data: null, radius: planetRadius, isFace: true });
  }

  /** Create two semi-circular rim rings for the wedge cutaway */
  _createWedgeRims(planetRadius) {
    const rimGeo = new THREE.RingGeometry(planetRadius * 0.995, planetRadius, 64, 1);

    const rimMat1 = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      clippingPlanes: [this._semiClipZ],
    });
    const rimMesh1 = new THREE.Mesh(rimGeo.clone(), rimMat1);
    rimMesh1.rotation.y = Math.PI / 2;
    rimMesh1.position.x = 0.002;
    this.planetMesh.add(rimMesh1);
    this.layerMeshes.push({ mesh: rimMesh1, data: null, radius: planetRadius, isRim: true });

    const rimMat2 = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      clippingPlanes: [this._semiClipX],
    });
    const rimMesh2 = new THREE.Mesh(rimGeo.clone(), rimMat2);
    rimMesh2.rotation.x = -Math.PI / 2;
    rimMesh2.position.z = 0.002;
    this.planetMesh.add(rimMesh2);
    this.layerMeshes.push({ mesh: rimMesh2, data: null, radius: planetRadius, isRim: true });
  }

  /** Legacy mode: self-contained mini-renderer (fallback for panel-based display) */
  _initLegacy(layers) {
    const width = this.container.clientWidth || 300;
    const height = 250;

    this._legacyRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._legacyRenderer.setSize(width, height);
    this._legacyRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._legacyRenderer.localClippingEnabled = true;
    this.container.appendChild(this._legacyRenderer.domElement);

    this._legacyScene = new THREE.Scene();

    this._legacyCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this._legacyCamera.position.set(2.5, 1.5, 2.5);
    this._legacyCamera.lookAt(0, 0, 0);

    this._legacyControls = new OrbitControls(this._legacyCamera, this._legacyRenderer.domElement);
    this._legacyControls.enableDamping = true;
    this._legacyControls.dampingFactor = 0.08;
    this._legacyControls.enableZoom = false;
    this._legacyControls.enablePan = false;
    this._legacyControls.enabled = false;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this._legacyScene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 5, 3);
    this._legacyScene.add(dirLight);

    const maxR = layers[0].r;
    const legacyRadius = 1.0;
    const offset = legacyRadius * 1.1;

    this.clipPlane1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), offset);
    this.clipPlane2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), offset);
    const clipPlanes = [this.clipPlane1, this.clipPlane2];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const radius = (layer.r / maxR) * legacyRadius;
      const geo = new THREE.SphereGeometry(radius, 48, 48);

      const isCore = i === layers.length - 1;
      const isInner = i === layers.length - 2;
      const mat = this._createLayerMaterial(layer, isCore, isInner, layers);
      mat.clippingPlanes = clipPlanes;
      mat.clipIntersection = true;

      const mesh = new THREE.Mesh(geo, mat);
      this._legacyScene.add(mesh);
      this.layerMeshes.push({ mesh, data: layer, radius });
    }

    // Semi-circle clip planes (legacy at origin)
    this._semiClipZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    this._semiClipX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

    // Face 1
    this._faceMaterial1 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial1.clippingPlanes = [this._semiClipZ];
    this._faceMaterial1.clipIntersection = false;

    const faceGeo1 = new THREE.CircleGeometry(legacyRadius, 64);
    const faceMesh1 = new THREE.Mesh(faceGeo1, this._faceMaterial1);
    faceMesh1.rotation.y = Math.PI / 2;
    faceMesh1.position.x = 0.001;
    this._legacyScene.add(faceMesh1);
    this.layerMeshes.push({ mesh: faceMesh1, data: null, radius: legacyRadius, isFace: true });

    // Face 2
    this._faceMaterial2 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial2.clippingPlanes = [this._semiClipX];
    this._faceMaterial2.clipIntersection = false;

    const faceGeo2 = new THREE.CircleGeometry(legacyRadius, 64);
    const faceMesh2 = new THREE.Mesh(faceGeo2, this._faceMaterial2);
    faceMesh2.rotation.x = -Math.PI / 2;
    faceMesh2.position.z = 0.001;
    this._legacyScene.add(faceMesh2);
    this.layerMeshes.push({ mesh: faceMesh2, data: null, radius: legacyRadius, isFace: true });

    // Core glow
    const coreColor = new THREE.Color(layers[layers.length - 1].color);
    this._coreLight = new THREE.PointLight(coreColor, 3.0, legacyRadius * 2.5, 1.5);
    this._legacyScene.add(this._coreLight);

    // Two rim rings
    const rimGeo = new THREE.RingGeometry(legacyRadius * 0.995, legacyRadius, 64, 1);

    const rimMat1 = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      clippingPlanes: [this._semiClipZ],
    });
    const rimMesh1 = new THREE.Mesh(rimGeo.clone(), rimMat1);
    rimMesh1.rotation.y = Math.PI / 2;
    rimMesh1.position.x = 0.002;
    this._legacyScene.add(rimMesh1);
    this.layerMeshes.push({ mesh: rimMesh1, data: null, radius: legacyRadius, isRim: true });

    const rimMat2 = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      clippingPlanes: [this._semiClipX],
    });
    const rimMesh2 = new THREE.Mesh(rimGeo.clone(), rimMat2);
    rimMesh2.rotation.x = -Math.PI / 2;
    rimMesh2.position.z = 0.002;
    this._legacyScene.add(rimMesh2);
    this.layerMeshes.push({ mesh: rimMesh2, data: null, radius: legacyRadius, isRim: true });

    this._createLabels(layers, maxR, height);
    this._startTime = performance.now();
    this._animateLegacy();
  }

  _createLabels(layers, maxR, containerHeight) {
    const labelContainer = document.createElement('div');
    labelContainer.className = 'cutaway-labels';
    labelContainer.style.cssText = 'position:relative;margin-top:-' + containerHeight + 'px;height:' + containerHeight + 'px;pointer-events:none;';

    this._labelElements = [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const label = document.createElement('div');
      label.className = 'cutaway-label';
      label.textContent = t(layer.key);
      const yPercent = 15 + (i / layers.length) * 70;
      label.style.cssText = `position:absolute;right:8px;top:${yPercent}%;font-size:11px;color:#ccc;text-shadow:0 1px 3px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.8s ease;`;
      labelContainer.appendChild(label);
      this._labelElements.push(label);
    }

    this.container.appendChild(labelContainer);
  }

  _animate() {
    if (this._disposed) return;

    const now = performance.now();
    const elapsed = now - this._startTime;
    const duration = 4000;
    const progress = Math.min(elapsed / duration, 1);

    const p = progress;
    const eased = p < 0.5
      ? 4 * p * p * p
      : 1 - Math.pow(-2 * p + 2, 3) / 2;

    // Track planet's current world position
    this.planetMesh.getWorldPosition(this._worldPos);
    const wx = this._worldPos.x;
    const wz = this._worldPos.z;

    const maxRadius = this._getMaxRadius();
    const offset = maxRadius * 1.1;
    if (this.clipPlane1 && this.clipPlane2) {
      this.clipPlane1.constant = wx + offset * (1 - eased);
      this.clipPlane2.constant = wz + offset * (1 - eased);
    }

    // Update semi-circle clip planes
    if (this._semiClipZ) this._semiClipZ.constant = wz;
    if (this._semiClipX) this._semiClipX.constant = wx;

    // Subtle planet rotation during reveal
    if (this.planetMesh && progress < 1) {
      this.planetMesh.rotation.y += 0.002 * (1 - progress);
    }

    // Animate core light intensity for cinematic pulsing
    if (this._coreLight && this._animationComplete) {
      this._coreLight.intensity = 3.0 + Math.sin(elapsed * 0.001) * 0.5;
    }

    // Update shader time
    const time = elapsed * 0.001;
    if (this._faceMaterial1 && this._faceMaterial1.uniforms) {
      this._faceMaterial1.uniforms.time.value = time;
    }
    if (this._faceMaterial2 && this._faceMaterial2.uniforms) {
      this._faceMaterial2.uniforms.time.value = time;
    }

    if (progress >= 1 && !this._animationComplete) {
      this._animationComplete = true;
    }

    this._animationId = requestAnimationFrame(() => this._animate());
  }

  _animateLegacy() {
    if (this._disposed) return;

    const now = performance.now();
    const elapsed = now - this._startTime;
    const duration = 4000;
    const progress = Math.min(elapsed / duration, 1);

    const p = progress;
    const eased = p < 0.5
      ? 4 * p * p * p
      : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const offset = 1.1;
    if (this.clipPlane1 && this.clipPlane2) {
      this.clipPlane1.constant = offset * (1 - eased);
      this.clipPlane2.constant = offset * (1 - eased);
    }

    // Stagger label reveal
    for (let i = 0; i < this._labelElements.length; i++) {
      const threshold = (i + 0.5) / this._labelElements.length;
      if (eased >= threshold) {
        this._labelElements[i].style.opacity = '1';
      }
    }

    if (!this._animationComplete) {
      this._legacyScene.rotation.y += 0.001;
    } else {
      this._legacyScene.rotation.y += 0.004;
    }

    // Core light pulsing
    if (this._coreLight && this._animationComplete) {
      this._coreLight.intensity = 3.0 + Math.sin(elapsed * 0.001) * 0.5;
    }

    const time = elapsed * 0.001;
    if (this._faceMaterial1 && this._faceMaterial1.uniforms) {
      this._faceMaterial1.uniforms.time.value = time;
    }
    if (this._faceMaterial2 && this._faceMaterial2.uniforms) {
      this._faceMaterial2.uniforms.time.value = time;
    }

    if (this._legacyControls) this._legacyControls.update();
    this._legacyRenderer.render(this._legacyScene, this._legacyCamera);

    if (progress >= 1 && !this._animationComplete) {
      this._animationComplete = true;
      if (this._legacyControls) this._legacyControls.enabled = true;
    }

    this._animationId = requestAnimationFrame(() => this._animateLegacy());
  }

  _getMaxRadius() {
    if (this.planetMesh && this.planetMesh.geometry.parameters) {
      return this.planetMesh.geometry.parameters.radius;
    }
    return 1;
  }

  dispose() {
    this._disposed = true;
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }

    for (const entry of this._originalMaterials) {
      if (entry.mesh && entry.material) {
        if (entry.mesh.material !== entry.material) {
          entry.mesh.material.dispose();
        }
        entry.mesh.material = entry.material;
      }
    }
    this._originalMaterials = [];

    if (this._coreLight) {
      if (this._coreLight.parent) this._coreLight.parent.remove(this._coreLight);
      this._coreLight.dispose();
      this._coreLight = null;
    }

    if (this._faceMaterial1) {
      this._faceMaterial1.dispose();
      this._faceMaterial1 = null;
    }
    if (this._faceMaterial2) {
      this._faceMaterial2.dispose();
      this._faceMaterial2 = null;
    }

    for (const l of this.layerMeshes) {
      if (l.isLight) {
        if (l.mesh.parent) l.mesh.parent.remove(l.mesh);
        l.mesh.dispose();
      } else {
        if (l.mesh.parent) l.mesh.parent.remove(l.mesh);
        if (l.mesh.geometry) l.mesh.geometry.dispose();
        if (l.mesh.material) l.mesh.material.dispose();
      }
    }
    this.layerMeshes = [];

    if (this.mainRenderer) {
      this.mainRenderer.localClippingEnabled = false;
    }

    if (this._legacyControls) this._legacyControls.dispose();
    if (this._legacyRenderer) {
      this._legacyRenderer.dispose();
      if (this._legacyRenderer.domElement && this._legacyRenderer.domElement.parentElement) {
        this._legacyRenderer.domElement.parentElement.removeChild(this._legacyRenderer.domElement);
      }
    }

    if (this.container) {
      const labels = this.container.querySelector('.cutaway-labels');
      if (labels) labels.remove();
    }

    this._labelElements = [];
    this.clipPlane1 = null;
    this.clipPlane2 = null;
    this._semiClipZ = null;
    this._semiClipX = null;
  }
}
