import * as THREE from 'three';

/**
 * CMEFluxRope -- Twisted magnetic field tube for solar storm visualization.
 *
 * Real CMEs have a flux rope structure: a helical magnetic field line
 * wound around a central axis, expanding away from the sun.
 */
export class CMEFluxRope {
  constructor(scene) {
    this._scene = scene;
    this._mesh = null;
    this._active = false;
    this._time = 0;
    this._expansionSpeed = 0.08; // scene units per second
  }

  /**
   * Create and show the flux rope, expanding from sunPos outward in direction.
   * @param {THREE.Vector3} sunPos - Sun center position
   * @param {THREE.Vector3} direction - Normalized direction of CME propagation
   */
  activate(sunPos = new THREE.Vector3(0, 0, 0), direction = new THREE.Vector3(1, 0, 0)) {
    if (this._mesh) this.deactivate();

    this._startPos = sunPos.clone();
    this._direction = direction.clone().normalize();
    this._time = 0;
    this._active = true;
    this._currentLength = 8;

    this._createRope();
  }

  _createRope() {
    const tubeLength = this._currentLength;
    const helixTurns = 3;
    const helixRadius = 1.5;

    const points = [];
    const segments = 120;

    // Build perpendicular basis vectors for helix offset
    const dir = this._direction;
    const perp1 = new THREE.Vector3(-dir.z, 0, dir.x);
    if (perp1.lengthSq() < 0.001) perp1.set(0, 1, 0);
    perp1.normalize();
    const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Main axis progress along direction
      const axisPos = this._startPos.clone()
        .addScaledVector(this._direction, t * tubeLength + 6); // start at sun surface

      // Helical twist
      const angle = t * helixTurns * Math.PI * 2;
      const helixOffset = perp1.clone().multiplyScalar(Math.cos(angle) * helixRadius * (1 + t * 0.5))
        .addScaledVector(perp2, Math.sin(angle) * helixRadius * (1 + t * 0.5));

      axisPos.add(helixOffset);
      points.push(axisPos);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 80, 0.4, 8, false);

    // Color: gradient from bright orange (sun end) to cool blue (outer end)
    const colors = new Float32Array(tubeGeo.attributes.position.count * 3);
    for (let i = 0; i < tubeGeo.attributes.position.count; i++) {
      const t = i / tubeGeo.attributes.position.count;
      colors[i * 3] = THREE.MathUtils.lerp(1.0, 0.1, t);     // R: orange to dark
      colors[i * 3 + 1] = THREE.MathUtils.lerp(0.4, 0.3, t); // G
      colors[i * 3 + 2] = THREE.MathUtils.lerp(0.0, 0.8, t); // B: dark to blue
    }
    tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    if (this._mesh) {
      this._scene.remove(this._mesh);
      this._mesh.geometry.dispose();
    }

    this._mesh = new THREE.Mesh(tubeGeo, mat);
    this._scene.add(this._mesh);
  }

  update(delta) {
    if (!this._active || !this._mesh) return;
    this._time += delta;

    // Expand the rope over time
    this._currentLength += this._expansionSpeed * delta * 60;

    // Fade out as it expands beyond a threshold
    const maxLength = 120;
    if (this._currentLength > maxLength * 0.7) {
      const fadeT = (this._currentLength - maxLength * 0.7) / (maxLength * 0.3);
      this._mesh.material.opacity = Math.max(0, 0.55 * (1 - fadeT));
    }

    if (this._currentLength > maxLength) {
      this.deactivate();
      return;
    }

    // Rebuild geometry as rope expands (throttled for performance)
    if (Math.floor(this._time * 6) !== Math.floor((this._time - delta) * 6)) {
      this._createRope();
    }
  }

  deactivate() {
    if (this._mesh) {
      this._scene.remove(this._mesh);
      this._mesh.geometry.dispose();
      this._mesh.material.dispose();
      this._mesh = null;
    }
    this._active = false;
    this._time = 0;
  }

  isActive() { return this._active; }
}
