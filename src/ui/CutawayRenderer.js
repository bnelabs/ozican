/**
 * CutawayRenderer — renders cross-section directly on the 3D planet in the main scene.
 * Uses dual perpendicular clipping planes with clipIntersection=true to remove one
 * quadrant (quarter-section) of the sphere, exposing curved 3D interior layers —
 * like a National Geographic / geology textbook illustration.
 *
 * Enhanced with custom GLSL shader for cross-section faces, core glow lighting,
 * rim highlights, and procedural geological texturing.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANET_LAYERS } from '../data/planetLayers.js';
import { t } from '../i18n/i18n.js';

/* ---- GLSL for cross-section face ---- */
const FACE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FACE_FRAGMENT = /* glsl */ `
uniform vec3  layerColors[8];
uniform float layerRadii[8]; // normalized 0..1, outermost first
uniform int   layerCount;
uniform float time;

varying vec2 vUv;

// Simple 2D hash noise for geological grain
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Distance from center of disc (uv is 0..1 across the CircleGeometry)
  vec2 centered = vUv * 2.0 - 1.0;
  float dist = length(centered);

  // Discard outside the circle
  if (dist > 1.0) discard;

  // Find which layer this fragment belongs to
  vec3 color = layerColors[0]; // outermost fallback
  for (int i = 0; i < 8; i++) {
    if (i >= layerCount) break;
    if (dist <= layerRadii[i]) {
      color = layerColors[i];
    }
  }

  // Smooth gradient transitions at layer boundaries
  for (int i = 0; i < 8; i++) {
    if (i >= layerCount - 1) break;
    float boundary = layerRadii[i];
    float blend = smoothstep(boundary - 0.025, boundary + 0.025, dist);
    // Blend between this layer and the one outside it
    // layerRadii are sorted outermost-first, so next outer is i-1
    // We handle this by blending at each boundary
    if (abs(dist - boundary) < 0.04) {
      // Strata boundary highlight — thin bright line
      float highlight = exp(-pow((dist - boundary) / 0.008, 2.0));
      color += vec3(0.3) * highlight;
    }
  }

  // Procedural noise for geological grain
  float grain = noise(centered * 28.0 + time * 0.3);
  color *= 1.0 + (grain - 0.5) * 0.24;

  // Depth shading — darker at edges, brighter at center
  color *= 1.0 - 0.25 * dist;

  // Core emissive boost — innermost region glows
  float coreRadius = layerRadii[layerCount - 1];
  if (dist < coreRadius) {
    float coreGlow = 1.0 - (dist / coreRadius);
    color += layerColors[layerCount - 1] * coreGlow * 0.4;
  }

  // Subtle shimmer over time
  color *= 1.0 + sin(time * 1.5 + dist * 6.0) * 0.02;

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

  /** Build the cross-section face ShaderMaterial from layer data */
  _buildFaceMaterial(layers, maxR) {
    const colors = [];
    const radii = [];
    for (let i = 0; i < 8; i++) {
      if (i < layers.length) {
        colors.push(new THREE.Color(layers[i].color));
        radii.push(layers[i].r / maxR);
      } else {
        colors.push(new THREE.Color(0x000000));
        radii.push(0.0);
      }
    }

    return new THREE.ShaderMaterial({
      vertexShader: FACE_VERTEX,
      fragmentShader: FACE_FRAGMENT,
      uniforms: {
        layerColors: { value: colors },
        layerRadii: { value: radii },
        layerCount: { value: layers.length },
        time: { value: 0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });
  }

  /** Main mode: render cross-section on the actual 3D planet mesh */
  _initOnPlanet(layers) {
    // Enable clipping on the main renderer
    if (this.mainRenderer) {
      this.mainRenderer.localClippingEnabled = true;
    }

    const planetRadius = this.planetMesh.geometry.parameters
      ? this.planetMesh.geometry.parameters.radius
      : 1;

    const maxR = layers[0].r;

    // Two perpendicular clipping planes (start fully closed — constant = maxR*1.1)
    // Plane 1: normal (-1,0,0) — clips +X side
    // Plane 2: normal (0,0,-1) — clips +Z side
    // With clipIntersection=true, only the quadrant where BOTH planes clip is removed
    this.clipPlane1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), planetRadius * 1.1);
    this.clipPlane2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), planetRadius * 1.1);
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

    // Also clip child meshes (atmosphere, clouds, city lights, rings)
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

    // Create concentric layer spheres as children of the planet mesh
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      // Skip outermost layer (that's the planet surface itself)
      if (i === 0) continue;

      const radius = (layer.r / maxR) * planetRadius;
      const segments = Math.max(24, Math.floor(48 * (radius / planetRadius)));
      const geo = new THREE.SphereGeometry(radius, segments, segments);

      // Vary material properties by layer depth
      const isCore = i === layers.length - 1;
      const isInner = i === layers.length - 2;
      const emissiveScale = isCore ? 0.5 : isInner ? 0.25 : 0.1;
      const mat = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: isCore ? 0.3 : 0.6,
        metalness: isCore ? 0.3 : 0.15,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
        clipShadows: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(layer.color).multiplyScalar(emissiveScale),
        emissiveIntensity: isCore ? 2.5 : isInner ? 1.5 : 1.0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      this.planetMesh.add(mesh);
      this.layerMeshes.push({ mesh, data: layer, radius });
    }

    // Create two cross-section face discs (one per cut plane)
    this._createWedgeFaces(layers, maxR, planetRadius);

    // Core glow PointLight
    const coreColor = new THREE.Color(layers[layers.length - 1].color);
    this._coreLight = new THREE.PointLight(coreColor, 2.0, planetRadius * 2, 2);
    this.planetMesh.add(this._coreLight);

    // Two rim rings (one per cut edge)
    this._createWedgeRims(planetRadius);

    // Start animation
    this._startTime = performance.now();
    this._animate();
  }

  /** Create two semi-circular face discs for the wedge cutaway */
  _createWedgeFaces(layers, maxR, planetRadius) {
    // Face 1: X-cut face at x=0, visible in the -Z hemisphere
    // Clipped by inversePlane2 (0,0,1,0) so only z < 0 half shows → semi-circle
    this._faceMaterial1 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial1.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)];
    this._faceMaterial1.clipIntersection = false;

    const faceGeo1 = new THREE.CircleGeometry(planetRadius, 64);
    const faceMesh1 = new THREE.Mesh(faceGeo1, this._faceMaterial1);
    faceMesh1.rotation.y = Math.PI / 2; // face along X axis
    faceMesh1.position.x = 0.001;
    this.planetMesh.add(faceMesh1);
    this.layerMeshes.push({ mesh: faceMesh1, data: null, radius: planetRadius, isFace: true });

    // Face 2: Z-cut face at z=0, visible in the -X hemisphere
    // Clipped by inversePlane1 (1,0,0,0) so only x < 0 half shows → semi-circle
    this._faceMaterial2 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial2.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
    this._faceMaterial2.clipIntersection = false;

    const faceGeo2 = new THREE.CircleGeometry(planetRadius, 64);
    const faceMesh2 = new THREE.Mesh(faceGeo2, this._faceMaterial2);
    faceMesh2.rotation.x = -Math.PI / 2; // face along Z axis
    faceMesh2.position.z = 0.001;
    this.planetMesh.add(faceMesh2);
    this.layerMeshes.push({ mesh: faceMesh2, data: null, radius: planetRadius, isFace: true });
  }

  /** Create two semi-circular rim rings for the wedge cutaway */
  _createWedgeRims(planetRadius) {
    const rimGeo = new THREE.RingGeometry(planetRadius * 0.99, planetRadius, 64, 1);

    // Rim 1: at x=0 cut face, clipped to z < 0 half
    const rimMat1 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)],
    });
    const rimMesh1 = new THREE.Mesh(rimGeo.clone(), rimMat1);
    rimMesh1.rotation.y = Math.PI / 2;
    rimMesh1.position.x = 0.002;
    this.planetMesh.add(rimMesh1);
    this.layerMeshes.push({ mesh: rimMesh1, data: null, radius: planetRadius, isRim: true });

    // Rim 2: at z=0 cut face, clipped to x < 0 half
    const rimMat2 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
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

    // Two perpendicular clipping planes for wedge cutaway
    this.clipPlane1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), legacyRadius * 1.1);
    this.clipPlane2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), legacyRadius * 1.1);
    const clipPlanes = [this.clipPlane1, this.clipPlane2];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const radius = (layer.r / maxR) * legacyRadius;
      const geo = new THREE.SphereGeometry(radius, 48, 48);

      const isCore = i === layers.length - 1;
      const isInner = i === layers.length - 2;
      const emissiveScale = isCore ? 0.5 : isInner ? 0.25 : 0.1;
      const mat = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: isCore ? 0.3 : 0.7,
        metalness: isCore ? 0.3 : 0.1,
        clippingPlanes: clipPlanes,
        clipIntersection: true,
        clipShadows: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(layer.color).multiplyScalar(emissiveScale),
        emissiveIntensity: isCore ? 2.5 : isInner ? 1.5 : 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      this._legacyScene.add(mesh);
      this.layerMeshes.push({ mesh, data: layer, radius });
    }

    // Two shader cross-section face discs for legacy mode
    // Face 1: X-cut face, clipped to z < 0 half
    this._faceMaterial1 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial1.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)];
    this._faceMaterial1.clipIntersection = false;

    const faceGeo1 = new THREE.CircleGeometry(legacyRadius, 64);
    const faceMesh1 = new THREE.Mesh(faceGeo1, this._faceMaterial1);
    faceMesh1.rotation.y = Math.PI / 2;
    faceMesh1.position.x = 0.001;
    this._legacyScene.add(faceMesh1);
    this.layerMeshes.push({ mesh: faceMesh1, data: null, radius: legacyRadius, isFace: true });

    // Face 2: Z-cut face, clipped to x < 0 half
    this._faceMaterial2 = this._buildFaceMaterial(layers, maxR);
    this._faceMaterial2.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
    this._faceMaterial2.clipIntersection = false;

    const faceGeo2 = new THREE.CircleGeometry(legacyRadius, 64);
    const faceMesh2 = new THREE.Mesh(faceGeo2, this._faceMaterial2);
    faceMesh2.rotation.x = -Math.PI / 2;
    faceMesh2.position.z = 0.001;
    this._legacyScene.add(faceMesh2);
    this.layerMeshes.push({ mesh: faceMesh2, data: null, radius: legacyRadius, isFace: true });

    // Core glow PointLight for legacy mode
    const coreColor = new THREE.Color(layers[layers.length - 1].color);
    this._coreLight = new THREE.PointLight(coreColor, 2.0, legacyRadius * 2, 2);
    this._legacyScene.add(this._coreLight);

    // Two rim rings for legacy mode
    const rimGeo = new THREE.RingGeometry(legacyRadius * 0.99, legacyRadius, 64, 1);

    const rimMat1 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)],
    });
    const rimMesh1 = new THREE.Mesh(rimGeo.clone(), rimMat1);
    rimMesh1.rotation.y = Math.PI / 2;
    rimMesh1.position.x = 0.002;
    this._legacyScene.add(rimMesh1);
    this.layerMeshes.push({ mesh: rimMesh1, data: null, radius: legacyRadius, isRim: true });

    const rimMat2 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
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

    // Cubic ease-in-out
    const p = progress;
    const eased = p < 0.5
      ? 4 * p * p * p
      : 1 - Math.pow(-2 * p + 2, 3) / 2;

    // Animate both clipping planes to reveal wedge
    const maxRadius = this._getMaxRadius();
    const fullOpen = maxRadius * 1.1;
    if (this.clipPlane1 && this.clipPlane2) {
      this.clipPlane1.constant = fullOpen - eased * fullOpen;
      this.clipPlane2.constant = fullOpen - eased * fullOpen;
    }

    // Subtle planet rotation during reveal
    if (this.planetMesh && progress < 1) {
      this.planetMesh.rotation.y += 0.002 * (1 - progress);
    }

    // Update shader time uniform for shimmer on both face materials
    const t = elapsed * 0.001;
    if (this._faceMaterial1 && this._faceMaterial1.uniforms) {
      this._faceMaterial1.uniforms.time.value = t;
    }
    if (this._faceMaterial2 && this._faceMaterial2.uniforms) {
      this._faceMaterial2.uniforms.time.value = t;
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

    // Animate both clipping planes
    const fullOpen = 1.1; // legacyRadius * 1.1
    if (this.clipPlane1 && this.clipPlane2) {
      this.clipPlane1.constant = fullOpen - eased * fullOpen;
      this.clipPlane2.constant = fullOpen - eased * fullOpen;
    }

    // Stagger label reveal
    for (let i = 0; i < this._labelElements.length; i++) {
      const threshold = (i + 0.5) / this._labelElements.length;
      if (eased >= threshold) {
        this._labelElements[i].style.opacity = '1';
      }
    }

    // Slow rotation
    if (!this._animationComplete) {
      this._legacyScene.rotation.y += 0.001;
    } else {
      this._legacyScene.rotation.y += 0.004;
    }

    // Update shader time uniform for shimmer on both face materials
    const t = elapsed * 0.001;
    if (this._faceMaterial1 && this._faceMaterial1.uniforms) {
      this._faceMaterial1.uniforms.time.value = t;
    }
    if (this._faceMaterial2 && this._faceMaterial2.uniforms) {
      this._faceMaterial2.uniforms.time.value = t;
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

    // Restore original materials
    for (const entry of this._originalMaterials) {
      if (entry.mesh && entry.material) {
        // Dispose the clipped clone
        if (entry.mesh.material !== entry.material) {
          entry.mesh.material.dispose();
        }
        entry.mesh.material = entry.material;
      }
    }
    this._originalMaterials = [];

    // Dispose core light
    if (this._coreLight) {
      if (this._coreLight.parent) this._coreLight.parent.remove(this._coreLight);
      this._coreLight.dispose();
      this._coreLight = null;
    }

    // Dispose face shader materials
    if (this._faceMaterial1) {
      this._faceMaterial1.dispose();
      this._faceMaterial1 = null;
    }
    if (this._faceMaterial2) {
      this._faceMaterial2.dispose();
      this._faceMaterial2 = null;
    }

    // Remove layer meshes from planet
    for (const l of this.layerMeshes) {
      if (l.mesh.parent) l.mesh.parent.remove(l.mesh);
      l.mesh.geometry.dispose();
      l.mesh.material.dispose();
    }
    this.layerMeshes = [];

    // Disable clipping on main renderer
    if (this.mainRenderer) {
      this.mainRenderer.localClippingEnabled = false;
    }

    // Legacy mode cleanup
    if (this._legacyControls) this._legacyControls.dispose();
    if (this._legacyRenderer) {
      this._legacyRenderer.dispose();
      if (this._legacyRenderer.domElement && this._legacyRenderer.domElement.parentElement) {
        this._legacyRenderer.domElement.parentElement.removeChild(this._legacyRenderer.domElement);
      }
    }

    // Remove label overlay
    if (this.container) {
      const labels = this.container.querySelector('.cutaway-labels');
      if (labels) labels.remove();
    }

    this._labelElements = [];
    this.clipPlane1 = null;
    this.clipPlane2 = null;
  }
}
