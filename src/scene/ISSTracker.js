/**
 * ISS (International Space Station) tracker module.
 * Renders a simplified ISS model orbiting Earth in the Three.js scene.
 * The ISS orbits at 408 km altitude with a 51.6-degree inclination.
 * Uses LOD to only render when the camera is near Earth.
 */
import * as THREE from 'three';

export class ISSTracker {
  /**
   * @param {THREE.Mesh} earthMesh - The Earth planet mesh to attach to
   * @param {number} earthDisplayRadius - Earth's display radius in scene units (2.0)
   */
  constructor(earthMesh, earthDisplayRadius) {
    this.earthMesh = earthMesh;
    this.earthRadius = earthDisplayRadius;
    this.issMesh = null;
    this.orbitLine = null;
    this.orbitGroup = null;
    this._elapsed = 0;
    this._visible = true;
    this._init();
  }

  /**
   * Initialise the orbit group, ISS model, and orbit line.
   * The orbit group is tilted to match the real ISS inclination (51.6 deg)
   * and attached as a child of the Earth mesh so it moves with the planet.
   */
  _init() {
    // Create orbit group tilted at 51.6 degrees (ISS orbital inclination)
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.rotation.x = THREE.MathUtils.degToRad(51.6);
    this.earthMesh.add(this.orbitGroup);

    // ISS orbit altitude: 408 km above Earth's surface (radius 6371 km)
    // Scene ratio: (6371 + 408) / 6371 ≈ 1.064
    const orbitRadius = this.earthRadius * 1.064;

    // Build the simplified ISS geometry
    this._createISSModel(orbitRadius);

    // Draw a dashed orbit ring
    this._createOrbitLine(orbitRadius);
  }

  /**
   * Build a simplified ISS model: a small rectangular body with two flat
   * solar-array panels extending from either side.
   * @param {number} orbitRadius - Distance from Earth centre in scene units
   */
  _createISSModel(orbitRadius) {
    const group = new THREE.Group();

    // --- Main body (pressurised modules) ---
    const bodySize = this.earthRadius * 0.04;
    const bodyGeo = new THREE.BoxGeometry(bodySize, bodySize * 0.3, bodySize * 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC,
      metalness: 0.8,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // --- Solar array panels ---
    const panelGeo = new THREE.BoxGeometry(bodySize * 2.5, bodySize * 0.02, bodySize * 0.8);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a237e,
      metalness: 0.4,
      roughness: 0.6,
    });

    // Left panel
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.x = -bodySize * 1.5;
    group.add(leftPanel);

    // Right panel
    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.x = bodySize * 1.5;
    group.add(rightPanel);

    // Position the ISS at the orbit radius along the x-axis;
    // the parent orbitGroup's rotation animates the orbital motion.
    group.position.x = orbitRadius;
    group.userData = { key: 'iss', type: 'iss' };

    this.issMesh = group;
    this.orbitGroup.add(group);
  }

  /**
   * Create a dashed circle representing the ISS orbit path.
   * @param {number} orbitRadius - Radius of the orbit ring in scene units
   */
  _createOrbitLine(orbitRadius) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        Math.cos(angle) * orbitRadius,
        0,
        Math.sin(angle) * orbitRadius
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    this.orbitLine = new THREE.Line(geo, mat);
    this.orbitLine.computeLineDistances();
    this.orbitGroup.add(this.orbitLine);
  }

  /**
   * Update ISS position. Called each frame.
   * Performs a LOD check so the ISS is only rendered when the camera is
   * within 20 scene units of Earth, and advances the orbital rotation.
   * @param {number} delta - Frame delta time in seconds
   * @param {number} elapsed - Total elapsed time in seconds
   * @param {THREE.Camera} camera - Active camera, used for LOD distance check
   */
  update(delta, elapsed, camera) {
    this._elapsed += delta;

    // --- LOD check: hide ISS when camera is far from Earth ---
    if (camera) {
      const earthWorldPos = new THREE.Vector3();
      this.earthMesh.getWorldPosition(earthWorldPos);
      const dist = camera.position.distanceTo(earthWorldPos);
      const shouldShow = dist < 20;
      if (this.issMesh) this.issMesh.visible = shouldShow && this._visible;
      if (this.orbitLine) this.orbitLine.visible = shouldShow && this._visible;
    }

    // --- Orbital motion (physics-accurate) ---
    // Earth rotationSpeed = 0.01 rad/sim-unit → 1 Earth day = 2π/0.01 ≈ 628 sim-units.
    // ISS period = 92.65 min = 0.06434 days → 40.4 sim-units → ω = 2π/40.4 ≈ 0.1555 rad/unit.
    // This means the ISS completes ~15.5 orbits per simulated Earth day — matching reality.
    if (this.orbitGroup) {
      this.orbitGroup.rotation.y += delta * 0.1555;
    }
  }

  /**
   * Show or hide the ISS and its orbit line.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._visible = visible;
    if (this.issMesh) this.issMesh.visible = visible;
    if (this.orbitLine) this.orbitLine.visible = visible;
  }

  /**
   * Remove the ISS orbit group from the Earth mesh and clean up.
   */
  dispose() {
    if (this.orbitGroup) {
      this.earthMesh.remove(this.orbitGroup);
    }
  }
}
