/**
 * Main 3D scene — builds the solar system with Three.js.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SOLAR_SYSTEM, PLANET_ORDER } from '../data/solarSystem.js';
import {
  sunVertexShader, sunFragmentShader,
  coronaVertexShader, coronaFragmentShader,
} from '../shaders/sunShader.js';
import {
  atmosphereVertexShader, atmosphereFragmentShader,
  ringVertexShader, ringFragmentShader,
} from '../shaders/atmosphereShader.js';
import {
  generateMercuryTexture, generateVenusTexture, generateEarthTexture,
  generateEarthClouds, generateMarsTexture, generateJupiterTexture,
  generateSaturnTexture, generateUranusTexture, generateNeptuneTexture,
  generateMoonTexture, generateStarfield, generateRingTexture,
} from '../textures/proceduralTextures.js';

const TEXTURE_GENERATORS = {
  mercury: generateMercuryTexture,
  venus: generateVenusTexture,
  earth: generateEarthTexture,
  mars: generateMarsTexture,
  jupiter: generateJupiterTexture,
  saturn: generateSaturnTexture,
  uranus: generateUranusTexture,
  neptune: generateNeptuneTexture,
};

export class SolarSystemScene {
  constructor(container, onProgress) {
    this.container = container;
    this.onProgress = onProgress || (() => {});
    this.planets = {};
    this.moonMeshes = {};
    this.orbitLines = {};
    this.labels = {};
    this.clock = new THREE.Clock();
    this.animationSpeed = 1;
    this.showOrbits = true;
    this.showLabels = true;
    this.selectedPlanet = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredPlanet = null;
    this.targetCameraPos = null;
    this.targetLookAt = null;
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.startCameraPos = new THREE.Vector3();
    this.startLookAt = new THREE.Vector3();

    this._init();
  }

  async _init() {
    this.onProgress(5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50, window.innerWidth / window.innerHeight, 0.1, 2000
    );
    this.camera.position.set(40, 30, 80);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 500;
    this.controls.enablePan = true;
    this.controls.autoRotate = false;
    this.controls.zoomSpeed = 1.2;

    this.onProgress(10);

    // Build scene
    this._createStarfield();
    this.onProgress(20);
    this._createSun();
    this.onProgress(30);
    this._createLighting();
    this._createPlanets();
    this.onProgress(70);
    this._createOrbits();
    this.onProgress(80);

    // Events
    window.addEventListener('resize', () => this._onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this._onClick(e));

    this.onProgress(100);

    // Start render loop
    this._animate();
  }

  _createStarfield() {
    const starCanvas = generateStarfield(2048);
    const starTexture = new THREE.CanvasTexture(starCanvas);
    starTexture.mapping = THREE.EquirectangularReflectionMapping;

    const starGeo = new THREE.SphereGeometry(800, 64, 64);
    const starMat = new THREE.MeshBasicMaterial({
      map: starTexture,
      side: THREE.BackSide,
    });
    this.starfield = new THREE.Mesh(starGeo, starMat);
    this.scene.add(this.starfield);
  }

  _createSun() {
    const sunData = SOLAR_SYSTEM.sun;

    // Sun surface with custom shader
    const sunGeo = new THREE.SphereGeometry(sunData.displayRadius, 64, 64);
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
    });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.userData = { key: 'sun', type: 'planet' };
    this.scene.add(this.sun);

    // Corona glow
    const coronaGeo = new THREE.SphereGeometry(sunData.displayRadius * 1.25, 64, 64);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.corona = new THREE.Mesh(coronaGeo, coronaMat);
    this.scene.add(this.corona);

    // Outer glow (sprite)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const gCtx = glowCanvas.getContext('2d');
    const gradient = gCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(253, 184, 19, 0.3)');
    gradient.addColorStop(0.3, 'rgba(253, 150, 19, 0.15)');
    gradient.addColorStop(0.7, 'rgba(253, 100, 19, 0.05)');
    gradient.addColorStop(1, 'rgba(253, 100, 19, 0)');
    gCtx.fillStyle = gradient;
    gCtx.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunGlow = new THREE.Sprite(glowMat);
    this.sunGlow.scale.set(40, 40, 1);
    this.scene.add(this.sunGlow);

    // Sun point light
    this.sunLight = new THREE.PointLight(0xFFF5E0, 2.5, 0, 0.5);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    this.planets.sun = {
      mesh: this.sun,
      group: this.sun,
      data: sunData,
    };
  }

  _createLighting() {
    // Ambient light for visibility
    const ambient = new THREE.AmbientLight(0x111122, 0.15);
    this.scene.add(ambient);
  }

  _createPlanets() {
    const planetKeys = PLANET_ORDER.filter(k => k !== 'sun');
    let idx = 0;

    for (const key of planetKeys) {
      const planetData = SOLAR_SYSTEM[key];

      // Planet group (for orbit rotation)
      const orbitGroup = new THREE.Group();
      // Random starting angle
      const startAngle = (idx / planetKeys.length) * Math.PI * 2 + idx * 1.3;
      orbitGroup.rotation.y = startAngle;
      this.scene.add(orbitGroup);

      // Tilt group for orbital inclination
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.x = THREE.MathUtils.degToRad(planetData.orbitInclination || 0);
      orbitGroup.add(tiltGroup);

      // Planet mesh
      const planetGeo = new THREE.SphereGeometry(planetData.displayRadius, 48, 48);
      let planetMat;

      if (TEXTURE_GENERATORS[key]) {
        const canvas = TEXTURE_GENERATORS[key](1024);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        planetMat = new THREE.MeshPhongMaterial({
          map: texture,
          shininess: key === 'earth' ? 25 : 10,
          specular: key === 'earth' ? 0x333344 : 0x111111,
        });
      } else {
        planetMat = new THREE.MeshPhongMaterial({
          color: planetData.color,
          shininess: 10,
        });
      }

      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.position.x = planetData.orbitRadius;
      planetMesh.rotation.z = THREE.MathUtils.degToRad(planetData.axialTilt || 0);
      planetMesh.userData = { key, type: 'planet' };
      tiltGroup.add(planetMesh);

      // Atmosphere for Earth, Venus
      if (key === 'earth' || key === 'venus') {
        const atmColor = key === 'earth' ? new THREE.Color(0x4488ff) : new THREE.Color(0xddaa44);
        const atmGeo = new THREE.SphereGeometry(planetData.displayRadius * 1.05, 48, 48);
        const atmMat = new THREE.ShaderMaterial({
          vertexShader: atmosphereVertexShader,
          fragmentShader: atmosphereFragmentShader,
          uniforms: {
            uColor: { value: atmColor },
            uIntensity: { value: key === 'earth' ? 1.0 : 0.6 },
            uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
          },
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
        });
        const atmosphere = new THREE.Mesh(atmGeo, atmMat);
        planetMesh.add(atmosphere);
      }

      // Earth cloud layer
      if (key === 'earth') {
        const cloudCanvas = generateEarthClouds(1024);
        const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
        const cloudGeo = new THREE.SphereGeometry(planetData.displayRadius * 1.015, 48, 48);
        const cloudMat = new THREE.MeshPhongMaterial({
          map: cloudTexture,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        planetMesh.add(cloudMesh);
        this.earthClouds = cloudMesh;
      }

      // Rings for Saturn, Uranus, Neptune
      if (planetData.hasRings) {
        this._createRing(planetMesh, planetData, key);
      }

      // Moons
      const moonMeshes = [];
      if (planetData.moons && planetData.moons.length > 0) {
        for (let mi = 0; mi < planetData.moons.length; mi++) {
          const moonData = planetData.moons[mi];
          const moonGroup = new THREE.Group();
          moonGroup.rotation.y = mi * 2.1 + Math.random() * Math.PI;
          planetMesh.add(moonGroup);

          const moonRadius = Math.max(0.15, moonData.radius * planetData.displayRadius * 0.4);
          const moonCanvas = generateMoonTexture(512, 1000 + mi * 100 + idx * 10);
          const moonTexture = new THREE.CanvasTexture(moonCanvas);
          const moonGeo = new THREE.SphereGeometry(moonRadius, 24, 24);

          // Tint the moon texture with its color
          const moonColor = new THREE.Color(moonData.color);
          const moonMat = new THREE.MeshPhongMaterial({
            map: moonTexture,
            color: moonColor,
            shininess: 5,
          });

          const moonMesh = new THREE.Mesh(moonGeo, moonMat);
          const moonDist = moonData.distance * planetData.displayRadius * 0.6;
          moonMesh.position.x = moonDist;
          moonMesh.userData = { key: `${key}_moon_${mi}`, type: 'moon', parentKey: key, moonIndex: mi };
          moonGroup.add(moonMesh);

          // Moon orbit line
          const moonOrbitGeo = new THREE.BufferGeometry();
          const moonOrbitPoints = [];
          for (let a = 0; a <= 64; a++) {
            const angle = (a / 64) * Math.PI * 2;
            moonOrbitPoints.push(
              Math.cos(angle) * moonDist,
              0,
              Math.sin(angle) * moonDist
            );
          }
          moonOrbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(moonOrbitPoints, 3));
          const moonOrbitMat = new THREE.LineBasicMaterial({
            color: 0x444466,
            transparent: true,
            opacity: 0.2,
          });
          const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
          planetMesh.add(moonOrbitLine);

          moonMeshes.push({
            mesh: moonMesh,
            group: moonGroup,
            data: moonData,
            orbitLine: moonOrbitLine,
          });
        }
      }

      this.planets[key] = {
        mesh: planetMesh,
        orbitGroup,
        tiltGroup,
        data: planetData,
        startAngle,
      };
      this.moonMeshes[key] = moonMeshes;

      idx++;
    }
  }

  _createRing(planetMesh, planetData, key) {
    const innerR = planetData.ringInnerRadius || planetData.displayRadius * 1.3;
    const outerR = planetData.ringOuterRadius || planetData.displayRadius * 2.2;

    // Use a flat disc geometry
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 1);

    // Fix UV mapping for ring
    const pos = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      const dist = Math.sqrt(x * x + z * z);
      const u = (dist - innerR) / (outerR - innerR);
      uv.setXY(i, u, 0.5);
    }

    let ringMat;
    if (key === 'saturn') {
      const ringCanvas = generateRingTexture(1024);
      const ringTexture = new THREE.CanvasTexture(ringCanvas);
      ringMat = new THREE.MeshBasicMaterial({
        map: ringTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        opacity: 0.85,
      });
    } else {
      // Simpler rings for Uranus/Neptune
      ringMat = new THREE.MeshBasicMaterial({
        color: key === 'uranus' ? 0x667788 : 0x445566,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        opacity: 0.15,
      });
    }

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    planetMesh.add(ring);
  }

  _createOrbits() {
    const planetKeys = PLANET_ORDER.filter(k => k !== 'sun');
    for (const key of planetKeys) {
      const planetData = SOLAR_SYSTEM[key];
      const segments = 256;
      const points = [];

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        // Account for eccentricity (simplified ellipse)
        const e = planetData.eccentricity || 0;
        const r = planetData.orbitRadius * (1 - e * e) / (1 + e * Math.cos(angle));
        points.push(
          Math.cos(angle) * r,
          0,
          Math.sin(angle) * r
        );
      }

      const orbitGeo = new THREE.BufferGeometry();
      orbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x334466,
        transparent: true,
        opacity: 0.3,
      });

      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      // Apply inclination
      orbitLine.rotation.x = THREE.MathUtils.degToRad(planetData.orbitInclination || 0);
      this.scene.add(orbitLine);
      this.orbitLines[key] = orbitLine;
    }
  }

  /** Get world position of a planet */
  getPlanetWorldPosition(key) {
    if (key === 'sun') return new THREE.Vector3(0, 0, 0);
    const planet = this.planets[key];
    if (!planet) return new THREE.Vector3(0, 0, 0);
    const worldPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(worldPos);
    return worldPos;
  }

  /** Focus camera on a planet */
  focusOnPlanet(key) {
    const worldPos = this.getPlanetWorldPosition(key);
    const planetData = SOLAR_SYSTEM[key];
    const radius = planetData.displayRadius;
    const distance = radius * 5 + 3;

    this.startCameraPos.copy(this.camera.position);
    this.startLookAt.copy(this.controls.target);
    this.targetCameraPos = new THREE.Vector3(
      worldPos.x + distance * 0.7,
      worldPos.y + distance * 0.4,
      worldPos.z + distance * 0.7
    );
    this.targetLookAt = worldPos.clone();
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.selectedPlanet = key;
  }

  /** Go back to overview */
  goToOverview() {
    this.startCameraPos.copy(this.camera.position);
    this.startLookAt.copy(this.controls.target);
    this.targetCameraPos = new THREE.Vector3(40, 30, 80);
    this.targetLookAt = new THREE.Vector3(0, 0, 0);
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.selectedPlanet = null;
  }

  setAnimationSpeed(speed) {
    this.animationSpeed = speed;
  }

  toggleOrbits() {
    this.showOrbits = !this.showOrbits;
    Object.values(this.orbitLines).forEach(line => {
      line.visible = this.showOrbits;
    });
    return this.showOrbits;
  }

  toggleLabels() {
    this.showLabels = !this.showLabels;
    return this.showLabels;
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  _onClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Collect all clickable meshes
    const clickable = [];
    for (const key of PLANET_ORDER) {
      if (this.planets[key]) {
        clickable.push(this.planets[key].mesh);
      }
    }
    // Add moons
    for (const key of Object.keys(this.moonMeshes)) {
      for (const moon of this.moonMeshes[key]) {
        clickable.push(moon.mesh);
      }
    }

    const intersects = this.raycaster.intersectObjects(clickable, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData.type === 'planet') {
        this.focusOnPlanet(hit.userData.key);
        if (this.onPlanetClick) this.onPlanetClick(hit.userData.key);
      } else if (hit.userData.type === 'moon') {
        if (this.onMoonClick) this.onMoonClick(hit.userData.parentKey, hit.userData.moonIndex);
      }
    }
  }

  /** Raycast for hover */
  _checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickable = [];
    for (const key of PLANET_ORDER) {
      if (this.planets[key]) clickable.push(this.planets[key].mesh);
    }

    const intersects = this.raycaster.intersectObjects(clickable, false);
    const prevHovered = this.hoveredPlanet;

    if (intersects.length > 0) {
      this.hoveredPlanet = intersects[0].object.userData.key;
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.hoveredPlanet = null;
      this.renderer.domElement.style.cursor = 'default';
    }

    if (this.hoveredPlanet !== prevHovered && this.onHoverChange) {
      this.onHoverChange(this.hoveredPlanet);
    }
  }

  /** Get 2D screen position of a planet for labels */
  getScreenPosition(key) {
    const worldPos = this.getPlanetWorldPosition(key);
    const screenPos = worldPos.clone().project(this.camera);
    return {
      x: (screenPos.x * 0.5 + 0.5) * window.innerWidth,
      y: (-screenPos.y * 0.5 + 0.5) * window.innerHeight,
      visible: screenPos.z < 1,
    };
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    const speed = this.animationSpeed;

    // Update sun shader
    if (this.sun.material.uniforms) {
      this.sun.material.uniforms.uTime.value = elapsed;
    }
    if (this.corona.material.uniforms) {
      this.corona.material.uniforms.uTime.value = elapsed;
    }

    // Rotate and orbit planets
    const planetKeys = PLANET_ORDER.filter(k => k !== 'sun');
    for (const key of planetKeys) {
      const planet = this.planets[key];
      if (!planet) continue;

      // Orbital motion
      planet.orbitGroup.rotation.y += planet.data.orbitSpeed * delta * speed * 0.5;

      // Self rotation
      const rotSpeed = planet.data.rotationSpeed || 0.005;
      planet.mesh.rotation.y += rotSpeed * delta * speed * 3;

      // Rotate moons
      if (this.moonMeshes[key]) {
        for (const moon of this.moonMeshes[key]) {
          moon.group.rotation.y += (moon.data.speed || 0.03) * delta * speed * 3;
        }
      }
    }

    // Rotate Earth clouds slightly faster
    if (this.earthClouds) {
      this.earthClouds.rotation.y += 0.0005 * speed;
    }

    // Camera transition
    if (this.isTransitioning && this.targetCameraPos) {
      this.transitionProgress += delta * 1.2;
      const t = Math.min(this.transitionProgress, 1);
      // Smooth ease
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // If tracking a selected planet, update target
      if (this.selectedPlanet) {
        const currentPos = this.getPlanetWorldPosition(this.selectedPlanet);
        const radius = SOLAR_SYSTEM[this.selectedPlanet].displayRadius;
        const distance = radius * 5 + 3;
        this.targetCameraPos.set(
          currentPos.x + distance * 0.7,
          currentPos.y + distance * 0.4,
          currentPos.z + distance * 0.7
        );
        this.targetLookAt.copy(currentPos);
      }

      this.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, eased);
      this.controls.target.lerpVectors(this.startLookAt, this.targetLookAt, eased);

      if (t >= 1) {
        this.isTransitioning = false;
      }
    }

    // If following a planet, keep updating the look target
    if (this.selectedPlanet && !this.isTransitioning) {
      const currentPos = this.getPlanetWorldPosition(this.selectedPlanet);
      this.controls.target.lerp(currentPos, 0.05);
    }

    // Hover check
    this._checkHover();

    // Controls
    this.controls.update();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Callback for label updates
    if (this.onFrame) this.onFrame();
  }

  dispose() {
    this.renderer.dispose();
    window.removeEventListener('resize', this._onResize);
  }
}
