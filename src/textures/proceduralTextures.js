/**
 * Procedural texture generation for photorealistic planet surfaces.
 * Uses canvas-based noise and layered patterns.
 */

/** Seeded pseudo-random number generator */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 2D Perlin-style noise */
export function createNoiseGenerator(seed) {
  const rand = seededRandom(seed);
  const perm = new Array(512);
  const p = new Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  return function noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf), u),
      lerp(grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1), u),
      v
    );
  };
}

/** Multi-octave fractal noise */
export function fbm(noise, x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
  let value = 0;
  let amplitude = 1.0;
  let frequency = 1.0;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

/** Create a canvas texture of given size */
function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

/** Helper: map value from one range to another */
function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

/** Helper: clamp value */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Helper: blend two RGB colors */
function blendColors(r1, g1, b1, r2, g2, b2, t) {
  return [
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  ];
}

// ==================== PLANET TEXTURES ====================

export function generateMercuryTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(42);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;

      // Base terrain
      const terrain = fbm(noise, nx, ny, 8, 0.55, 2.0) * 0.5 + 0.5;

      // Crater-like features
      const craterNoise = fbm(noise, nx * 3 + 100, ny * 3 + 100, 4, 0.6, 2.2);
      const craters = Math.max(0, -craterNoise * 0.8);

      // Scarps and ridges
      const ridges = Math.abs(fbm(noise, nx * 5 + 200, ny * 5 + 200, 3, 0.4, 2.0)) * 0.3;

      let value = terrain - craters + ridges;
      value = clamp(value, 0, 1);

      // Mercury color palette: grey-brown
      const [r, g, b] = blendColors(
        90, 80, 70,    // dark
        180, 170, 155, // light
        value
      );

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateVenusTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(99);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / (size / 2) * 3;

      // Thick cloud layers
      const clouds1 = fbm(noise, nx + 50, ny + 50, 6, 0.5, 2.0) * 0.5 + 0.5;
      const clouds2 = fbm(noise, nx * 2 + 150, ny * 2 + 150, 4, 0.45, 2.2) * 0.5 + 0.5;
      const clouds3 = fbm(noise, nx * 0.5, ny * 0.5, 3, 0.6, 1.8) * 0.5 + 0.5;

      const value = clouds1 * 0.5 + clouds2 * 0.3 + clouds3 * 0.2;

      // Venus: yellowish-orange cloud palette
      const [r, g, b] = blendColors(
        160, 120, 60,  // darker cloud
        220, 190, 110, // lighter cloud
        value
      );

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateEarthTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(7);
  const noise2 = createNoiseGenerator(777);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;

      // Latitude for polar ice
      const lat = Math.abs(y / (size / 2) - 0.5) * 2;

      // Continental shapes
      const continent = fbm(noise, nx, ny, 7, 0.55, 2.0);
      const detail = fbm(noise2, nx * 4, ny * 4, 4, 0.4, 2.2) * 0.15;

      const landLevel = continent + detail;
      const isLand = landLevel > 0.05;
      const isPolar = lat > 0.75;

      let r, g, b;

      if (isPolar) {
        // Polar ice
        [r, g, b] = [235, 240, 245];
      } else if (isLand) {
        // Land - varies from green to brown to desert
        const elevation = clamp(mapRange(landLevel, 0.05, 0.6, 0, 1), 0, 1);
        if (elevation < 0.3) {
          [r, g, b] = blendColors(34, 85, 34, 85, 120, 55, elevation / 0.3);
        } else if (elevation < 0.6) {
          [r, g, b] = blendColors(85, 120, 55, 140, 130, 80, (elevation - 0.3) / 0.3);
        } else {
          [r, g, b] = blendColors(140, 130, 80, 180, 170, 150, (elevation - 0.6) / 0.4);
        }
      } else {
        // Ocean - depth varies
        const depth = clamp(mapRange(landLevel, -0.5, 0.05, 0, 1), 0, 1);
        [r, g, b] = blendColors(15, 30, 80, 30, 80, 160, depth);
      }

      // Transition zones
      if (lat > 0.65 && lat <= 0.75) {
        const snowBlend = (lat - 0.65) / 0.1;
        [r, g, b] = blendColors(r, g, b, 235, 240, 245, snowBlend);
      }

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateEarthClouds(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(333);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;

      const cloud = fbm(noise, nx, ny, 6, 0.5, 2.0) * 0.5 + 0.5;
      const alpha = clamp(mapRange(cloud, 0.4, 0.8, 0, 255), 0, 255);

      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateMarsTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(444);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;
      const lat = Math.abs(y / (size / 2) - 0.5) * 2;

      // Surface terrain
      const terrain = fbm(noise, nx, ny, 7, 0.55, 2.0) * 0.5 + 0.5;
      const detail = fbm(noise, nx * 6 + 300, ny * 6 + 300, 4, 0.4, 2.2) * 0.15;
      const value = terrain + detail;

      // Mars color: red/orange/brown tones
      let [r, g, b] = blendColors(
        140, 60, 25,   // dark rust
        210, 140, 80,  // light sand
        clamp(value, 0, 1)
      );

      // Volcanic dark regions
      const darkRegions = fbm(noise, nx * 0.8 + 500, ny * 0.8 + 500, 3, 0.5, 2.0);
      if (darkRegions < -0.2) {
        const darkBlend = clamp(mapRange(darkRegions, -0.5, -0.2, 1, 0), 0, 1);
        [r, g, b] = blendColors(r, g, b, 80, 40, 20, darkBlend);
      }

      // Polar ice caps
      if (lat > 0.82) {
        const iceBlend = (lat - 0.82) / 0.18;
        [r, g, b] = blendColors(r, g, b, 230, 225, 220, iceBlend);
      }

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateJupiterTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(555);

  const bands = [
    { y: 0.0, color: [180, 150, 100] },
    { y: 0.1, color: [200, 160, 110] },
    { y: 0.2, color: [160, 120, 80] },
    { y: 0.25, color: [210, 180, 130] },
    { y: 0.35, color: [190, 140, 90] },
    { y: 0.42, color: [220, 190, 140] },
    { y: 0.48, color: [170, 120, 70] },
    { y: 0.52, color: [200, 170, 120] },
    { y: 0.58, color: [180, 130, 80] },
    { y: 0.65, color: [210, 175, 125] },
    { y: 0.75, color: [170, 135, 95] },
    { y: 0.8, color: [200, 165, 115] },
    { y: 0.9, color: [185, 150, 105] },
    { y: 1.0, color: [175, 145, 100] },
  ];

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 12;
      const ny = y / (size / 2);

      // Band turbulence
      const turbulence = fbm(noise, nx * 2, ny * 20, 4, 0.4, 2.0) * 0.02;
      const bandY = clamp(ny + turbulence, 0, 1);

      // Find band color
      let bandColor = bands[0].color;
      for (let i = 0; i < bands.length - 1; i++) {
        if (bandY >= bands[i].y && bandY < bands[i + 1].y) {
          const t = (bandY - bands[i].y) / (bands[i + 1].y - bands[i].y);
          const smoothT = t * t * (3 - 2 * t); // smoothstep
          bandColor = blendColors(
            bands[i].color[0], bands[i].color[1], bands[i].color[2],
            bands[i + 1].color[0], bands[i + 1].color[1], bands[i + 1].color[2],
            smoothT
          );
          break;
        }
      }

      // Swirl detail
      const swirl = fbm(noise, nx * 3 + 600, ny * 30 + 600, 5, 0.5, 2.0) * 15;
      const detail = fbm(noise, nx + swirl * 0.01, ny * 8, 4, 0.45, 2.0) * 0.5 + 0.5;

      let [r, g, b] = bandColor;
      r = clamp(r * (0.8 + detail * 0.4), 0, 255);
      g = clamp(g * (0.8 + detail * 0.4), 0, 255);
      b = clamp(b * (0.8 + detail * 0.4), 0, 255);

      // Great Red Spot (approximate position)
      const spotX = 0.6;
      const spotY = 0.58;
      const dx = (nx / 12 - spotX) * 2.5;
      const dy = (ny - spotY) * 8;
      const spotDist = Math.sqrt(dx * dx + dy * dy);
      if (spotDist < 1.0) {
        const spotBlend = 1.0 - spotDist;
        const spotSwirl = fbm(noise, nx * 4 + Math.atan2(dy, dx) * 2, ny * 4 + spotDist * 3, 4, 0.5, 2.0) * 0.5 + 0.5;
        const spotR = 180 + spotSwirl * 50;
        const spotG = 70 + spotSwirl * 40;
        const spotB = 40 + spotSwirl * 20;
        [r, g, b] = blendColors(r, g, b, spotR, spotG, spotB, spotBlend * spotBlend);
      }

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateSaturnTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(666);

  const bands = [
    { y: 0.0, color: [195, 180, 140] },
    { y: 0.15, color: [210, 195, 155] },
    { y: 0.25, color: [190, 175, 130] },
    { y: 0.35, color: [215, 200, 165] },
    { y: 0.45, color: [200, 185, 145] },
    { y: 0.55, color: [220, 205, 170] },
    { y: 0.65, color: [195, 178, 138] },
    { y: 0.75, color: [210, 195, 158] },
    { y: 0.85, color: [200, 180, 142] },
    { y: 1.0, color: [190, 175, 135] },
  ];

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 10;
      const ny = y / (size / 2);

      const turbulence = fbm(noise, nx * 2, ny * 15, 3, 0.35, 2.0) * 0.015;
      const bandY = clamp(ny + turbulence, 0, 0.999);

      let bandColor = bands[0].color;
      for (let i = 0; i < bands.length - 1; i++) {
        if (bandY >= bands[i].y && bandY < bands[i + 1].y) {
          const t = (bandY - bands[i].y) / (bands[i + 1].y - bands[i].y);
          const smoothT = t * t * (3 - 2 * t);
          bandColor = blendColors(
            bands[i].color[0], bands[i].color[1], bands[i].color[2],
            bands[i + 1].color[0], bands[i + 1].color[1], bands[i + 1].color[2],
            smoothT
          );
          break;
        }
      }

      const detail = fbm(noise, nx * 4, ny * 12, 4, 0.4, 2.0) * 0.5 + 0.5;
      let [r, g, b] = bandColor;
      r = clamp(r * (0.85 + detail * 0.3), 0, 255);
      g = clamp(g * (0.85 + detail * 0.3), 0, 255);
      b = clamp(b * (0.85 + detail * 0.3), 0, 255);

      // North polar hexagon hint
      if (ny < 0.08) {
        const polarBlend = 1.0 - ny / 0.08;
        [r, g, b] = blendColors(r, g, b, 160, 180, 200, polarBlend * 0.4);
      }

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateUranusTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(777);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 6;
      const ny = y / (size / 2);

      // Subtle banding
      const band = Math.sin(ny * Math.PI * 8) * 0.05;
      const cloud = fbm(noise, nx, ny * 4, 5, 0.4, 2.0) * 0.1;

      const value = 0.5 + band + cloud;

      // Uranus pale cyan/blue-green palette
      const [r, g, b] = blendColors(
        85, 155, 170,  // darker cyan
        140, 210, 220, // lighter cyan
        clamp(value, 0, 1)
      );

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateNeptuneTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(888);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2);

      // Banding with storms
      const band = Math.sin(ny * Math.PI * 10) * 0.08;
      const storm = fbm(noise, nx * 2, ny * 6, 5, 0.5, 2.0) * 0.15;
      const detail = fbm(noise, nx * 4 + 100, ny * 8 + 100, 4, 0.4, 2.0) * 0.08;

      const value = 0.5 + band + storm + detail;

      // Neptune deep blue palette
      const [r, g, b] = blendColors(
        30, 50, 120,   // deep blue
        80, 110, 190,  // bright blue
        clamp(value, 0, 1)
      );

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateMoonTexture(size = 512, seed = 1234) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(seed);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;

      const terrain = fbm(noise, nx, ny, 6, 0.5, 2.0) * 0.5 + 0.5;
      const craters = Math.max(0, -fbm(noise, nx * 4 + 50, ny * 4 + 50, 3, 0.6, 2.2) * 0.5);
      const value = clamp(terrain - craters, 0, 1);

      const base = 120 + value * 80;
      const i = (y * size + x) * 4;
      data[i] = base;
      data[i + 1] = base - 5;
      data[i + 2] = base - 10;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate a starfield background */
export function generateStarfield(size = 4096) {
  const { canvas, ctx } = createCanvas(size, size);
  const rand = seededRandom(12345);

  // Dark background
  ctx.fillStyle = '#000005';
  ctx.fillRect(0, 0, size, size);

  // Dense star field — 15K stars for 4K
  const starCount = Math.round(15000 * (size / 4096));
  for (let i = 0; i < starCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const brightness = rand();
    const radius = brightness < 0.95 ? rand() * 1.2 : rand() * 2.5;

    // Star color varies with temperature
    let r, g, b;
    const colorRand = rand();
    if (colorRand < 0.6) {
      r = g = b = 200 + rand() * 55;
    } else if (colorRand < 0.75) {
      r = 180 + rand() * 40;
      g = 190 + rand() * 50;
      b = 230 + rand() * 25;
    } else if (colorRand < 0.85) {
      r = 230 + rand() * 25;
      g = 210 + rand() * 30;
      b = 160 + rand() * 40;
    } else if (colorRand < 0.92) {
      r = 230 + rand() * 25;
      g = 170 + rand() * 40;
      b = 120 + rand() * 40;
    } else {
      r = 220 + rand() * 35;
      g = 140 + rand() * 40;
      b = 120 + rand() * 30;
    }

    const alpha = 0.4 + brightness * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${alpha})`;
    ctx.fill();

    // Add glow to brighter stars
    if (brightness > 0.9) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
      gradient.addColorStop(0, `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},0.3)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  // Multi-color nebula / Milky Way band with dark dust lanes
  const noise = createNoiseGenerator(9999);
  const noise2 = createNoiseGenerator(8888);
  const nebulaData = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 3;
      const ny = y / size * 3;
      const n = fbm(noise, nx, ny, 6, 0.5, 2.0) * 0.5 + 0.5;
      const band = Math.exp(-Math.pow((y / size - 0.5) * 4, 2));

      // Dark dust lanes using second noise
      const dust = fbm(noise2, nx * 2, ny * 2, 4, 0.55, 2.0) * 0.5 + 0.5;
      const dustMask = dust > 0.55 ? 1.0 - (dust - 0.55) * 3 : 1.0;

      if (n > 0.45 && band > 0.2) {
        const intensity = (n - 0.45) * 2 * band * 14 * Math.max(0.1, dustMask);
        const i = (y * size + x) * 4;
        // Multi-color: blue core, purple/pink edges, hints of gold
        const bandPos = (y / size - 0.5) * 4;
        const colorShift = Math.abs(bandPos);
        nebulaData.data[i] += intensity * (0.25 + colorShift * 0.4);     // red: more at edges
        nebulaData.data[i + 1] += intensity * (0.15 + colorShift * 0.1); // green: subtle
        nebulaData.data[i + 2] += intensity * (0.8 - colorShift * 0.2);  // blue: strongest at center
      }
    }
  }
  ctx.putImageData(nebulaData, 0, 0);

  return canvas;
}

/** Generate a procedural bump map for rocky planets */
export function generateBumpMap(size = 1024, seed = 42, options = {}) {
  const { octaves = 6, frequency = 8, craterStrength = 0.4 } = options;
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(seed);
  const craterNoise = createNoiseGenerator(seed + 100);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * frequency;
      const ny = y / (size / 2) * (frequency / 2);

      // Base terrain height
      let h = fbm(noise, nx, ny, octaves, 0.55, 2.0) * 0.5 + 0.5;

      // Crater layer
      const crater = fbm(craterNoise, nx * 3, ny * 3, 4, 0.6, 2.2);
      h -= Math.max(0, -crater) * craterStrength;

      h = clamp(h, 0, 1);
      const v = Math.floor(h * 255);
      const i = (y * size + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate per-pixel roughness map for Earth */
export function generateEarthRoughnessMap(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(7); // same seed as Earth texture for continent alignment

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;
      const lat = Math.abs(y / (size / 2) - 0.5) * 2;

      const continent = fbm(noise, nx, ny, 7, 0.55, 2.0);
      const isLand = continent > 0.05;
      const isPolar = lat > 0.75;

      let roughness;
      if (isPolar) {
        roughness = 0.5; // ice: medium roughness
      } else if (isLand) {
        roughness = 0.8; // land: rough
      } else {
        roughness = 0.15; // ocean: smooth/specular
      }

      // Smooth transitions
      if (lat > 0.65 && lat <= 0.75) {
        const blend = (lat - 0.65) / 0.1;
        roughness = roughness * (1 - blend) + 0.5 * blend;
      }

      const v = Math.floor(roughness * 255);
      const i = (y * size + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate per-pixel roughness map for Mars */
export function generateMarsRoughnessMap(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(444); // same seed as Mars texture

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;
      const lat = Math.abs(y / (size / 2) - 0.5) * 2;

      const darkRegions = fbm(noise, nx * 0.8 + 500, ny * 0.8 + 500, 3, 0.5, 2.0);
      const isVolcanic = darkRegions < -0.2;
      const isPolar = lat > 0.82;

      let roughness;
      if (isPolar) {
        roughness = 0.4; // ice caps
      } else if (isVolcanic) {
        roughness = 0.6; // volcanic dark regions
      } else {
        roughness = 0.85; // general terrain
      }

      const v = Math.floor(roughness * 255);
      const i = (y * size + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate Earth city lights texture (population-density clusters) */
export function generateEarthCityLights(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const continentNoise = createNoiseGenerator(7); // matches Earth texture
  const cityNoise = createNoiseGenerator(2222);
  const clusterNoise = createNoiseGenerator(3333);

  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / (size / 2) * 4;
      const lat = Math.abs(y / (size / 2) - 0.5) * 2;

      // Only on land
      const continent = fbm(continentNoise, nx, ny, 7, 0.55, 2.0);
      const isLand = continent > 0.05;

      if (!isLand || lat > 0.75) {
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
        data[i + 3] = 255;
        continue;
      }

      // Mid-latitude concentration (most cities 20-60 degrees)
      const latWeight = Math.exp(-Math.pow((lat - 0.4) * 3, 2));

      // Coastal bias: land near ocean boundaries is brighter
      const coastDist = Math.max(0, 1.0 - (continent - 0.05) * 5);
      const coastBias = 1.0 + coastDist * 1.5;

      // City clusters
      const cluster = fbm(clusterNoise, nx * 4, ny * 4, 4, 0.5, 2.0) * 0.5 + 0.5;
      const detail = fbm(cityNoise, nx * 12, ny * 12, 3, 0.4, 2.0) * 0.5 + 0.5;

      let brightness = cluster * detail * latWeight * coastBias;
      // Threshold: only show above certain density
      brightness = brightness > 0.35 ? Math.pow((brightness - 0.35) / 0.65, 1.5) : 0;
      brightness = clamp(brightness, 0, 1);

      // Warm yellow-orange city light color
      const i = (y * size + x) * 4;
      data[i] = Math.floor(brightness * 255);       // R
      data[i + 1] = Math.floor(brightness * 200);   // G (warm)
      data[i + 2] = Math.floor(brightness * 100);   // B (warm)
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate roughness map from a loaded NASA Earth texture.
 *  Analyzes color to detect ocean (smooth/specular) vs land (matte) vs ice (medium). */
export function generateRoughnessFromTexture(texture, size = 1024) {
  const height = size / 2;
  // Draw the Three.js texture image to a canvas to sample pixels
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = size;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(texture.image, 0, 0, size, height);
  const srcData = srcCtx.getImageData(0, 0, size, height).data;

  const { canvas, ctx } = createCanvas(size, height);
  const imageData = ctx.createImageData(size, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    const lat = Math.abs(y / height - 0.5) * 2; // 0 at equator, 1 at poles
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];

      let roughness;

      // Polar regions: ice
      if (lat > 0.83) {
        roughness = 0.5;
      } else {
        // Ocean detection: blue-dominant pixels
        const isOcean = b > r * 1.1 && b > g * 1.05 && b > 40;
        // Also detect very dark ocean (deep water)
        const isDarkOcean = r < 50 && g < 60 && b < 90 && b >= r;

        if (isOcean || isDarkOcean) {
          roughness = 0.15; // smooth/specular water
        } else {
          roughness = 0.8; // matte land
        }
      }

      // Smooth transition into polar ice
      if (lat > 0.75 && lat <= 0.83) {
        const blend = (lat - 0.75) / 0.08;
        roughness = roughness * (1 - blend) + 0.5 * blend;
      }

      const v = Math.floor(roughness * 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate city lights from a loaded NASA Earth texture.
 *  Uses the actual texture to detect land areas, placing lights only on real continents. */
export function generateCityLightsFromTexture(texture, size = 1024) {
  const height = size / 2;
  // Draw the Three.js texture image to a canvas to sample pixels
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = size;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(texture.image, 0, 0, size, height);
  const srcData = srcCtx.getImageData(0, 0, size, height).data;

  const { canvas, ctx } = createCanvas(size, height);
  const imageData = ctx.createImageData(size, height);
  const data = imageData.data;

  // Build a land mask from the NASA texture
  const landMask = new Uint8Array(size * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];
      const lat = Math.abs(y / height - 0.5) * 2;

      // Ocean detection (same as roughness map)
      const isOcean = (b > r * 1.1 && b > g * 1.05 && b > 40) ||
                      (r < 50 && g < 60 && b < 90 && b >= r);
      const isPolar = lat > 0.78;

      landMask[y * size + x] = (!isOcean && !isPolar) ? 1 : 0;
    }
  }

  // Compute distance-to-coast for each land pixel (approximate via sampling neighbors)
  const cityNoise = createNoiseGenerator(2222);
  const clusterNoise = createNoiseGenerator(3333);

  for (let y = 0; y < height; y++) {
    const lat = Math.abs(y / height - 0.5) * 2;
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const i = idx * 4;

      if (!landMask[idx]) {
        data[i] = data[i + 1] = data[i + 2] = 0;
        data[i + 3] = 255;
        continue;
      }

      const nx = x / size * 8;
      const ny = y / height * 4;

      // Mid-latitude concentration (most cities 20-60 degrees)
      const latWeight = Math.exp(-Math.pow((lat - 0.4) * 3, 2));

      // Coastal bias: check nearby pixels for ocean
      let coastDist = 1.0;
      const checkR = 8;
      for (let dy = -checkR; dy <= checkR; dy += 2) {
        for (let dx = -checkR; dx <= checkR; dx += 2) {
          const cx = (x + dx + size) % size;
          const cy = clamp(y + dy, 0, height - 1);
          if (!landMask[cy * size + cx]) {
            const d = Math.sqrt(dx * dx + dy * dy) / checkR;
            coastDist = Math.min(coastDist, d);
          }
        }
      }
      const coastBias = 1.0 + (1.0 - coastDist) * 1.5;

      // City clusters using noise
      const cluster = fbm(clusterNoise, nx * 4, ny * 4, 4, 0.5, 2.0) * 0.5 + 0.5;
      const detail = fbm(cityNoise, nx * 12, ny * 12, 3, 0.4, 2.0) * 0.5 + 0.5;

      let brightness = cluster * detail * latWeight * coastBias;
      brightness = brightness > 0.35 ? Math.pow((brightness - 0.35) / 0.65, 1.5) : 0;
      brightness = clamp(brightness, 0, 1);

      // Warm yellow-orange city light color
      data[i] = Math.floor(brightness * 255);       // R
      data[i + 1] = Math.floor(brightness * 200);   // G (warm)
      data[i + 2] = Math.floor(brightness * 100);   // B (warm)
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Generate Saturn's ring texture */
export function generateRingTexture(size = 1024) {
  const { canvas, ctx } = createCanvas(size, 64);
  const imageData = ctx.createImageData(size, 64);
  const data = imageData.data;
  const noise = createNoiseGenerator(321);

  for (let x = 0; x < size; x++) {
    const r = x / size;

    // Ring band structure
    let opacity = 0;
    let brightness = 0.7;

    // Inner C ring (faint)
    if (r > 0.15 && r < 0.25) {
      opacity = 0.2 + Math.sin(r * 200) * 0.05;
      brightness = 0.5;
    }
    // B ring (brightest)
    if (r > 0.28 && r < 0.52) {
      opacity = 0.6 + Math.sin(r * 300) * 0.15 + Math.sin(r * 800) * 0.05;
      brightness = 0.85;
    }
    // Cassini Division (gap)
    if (r > 0.52 && r < 0.57) {
      opacity = 0.05;
      brightness = 0.3;
    }
    // A ring
    if (r > 0.57 && r < 0.78) {
      opacity = 0.45 + Math.sin(r * 400) * 0.1;
      brightness = 0.75;
      // Encke Gap
      if (r > 0.70 && r < 0.72) {
        opacity = 0.05;
      }
    }
    // F ring (thin, faint)
    if (r > 0.82 && r < 0.84) {
      opacity = 0.2;
      brightness = 0.6;
    }

    // Fine noise detail
    const n = noise(r * 50, 0) * 0.1;
    opacity = clamp(opacity + n, 0, 1);

    const base = brightness * 220;
    for (let y = 0; y < 64; y++) {
      const i = (y * size + x) * 4;
      data[i] = base + 10;
      data[i + 1] = base;
      data[i + 2] = base - 15;
      data[i + 3] = opacity * 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ==================== DWARF PLANET TEXTURES ====================

/** Ceres: grey/brown with bright spots (Occator), craters */
export function generateCeresTexture(size = 512) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise = createNoiseGenerator(801);
  const noise2 = createNoiseGenerator(802);
  const noise3 = createNoiseGenerator(803);
  const h = size / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 10;
      const ny = y / h * 5;

      // Multi-scale terrain: broad regions + fine surface detail
      const broad = fbm(noise, nx, ny, 4, 0.6, 2.0) * 0.5 + 0.5;
      const fine  = fbm(noise2, nx * 4 + 10, ny * 4 + 10, 5, 0.55, 2.2) * 0.5 + 0.5;
      // Deep craters: negative features
      const craterRaw = fbm(noise3, nx * 2.5 + 50, ny * 2.5 + 50, 4, 0.65, 2.2);
      const craters = Math.max(0, -craterRaw) * 0.55;
      let value = broad * 0.55 + fine * 0.45 - craters;

      // Crater floors: dark grey-brown
      let [r, g, b] = craters > 0.12
        ? blendColors(38, 36, 32, 95, 92, 85, clamp(value + craters, 0, 1))
        : blendColors(68, 65, 58, 158, 153, 143, clamp(value, 0, 1));

      // Occator Crater — large, prominent bright carbonate deposits
      // Primary spot (sodium carbonate)
      const ox = x / size - 0.34, oy = y / h - 0.44;
      const od = Math.sqrt(ox * ox + oy * oy);
      if (od < 0.055) {
        const spotT = 1 - od / 0.055;
        const brightness = spotT * spotT * 0.85;
        r = Math.round(r + (248 - r) * brightness);
        g = Math.round(g + (244 - g) * brightness);
        b = Math.round(b + (238 - b) * brightness);
      }
      // Secondary spot (ammonium chloride, slightly bluish-white)
      const ox2 = x / size - 0.37, oy2 = y / h - 0.43;
      const od2 = Math.sqrt(ox2 * ox2 + oy2 * oy2);
      if (od2 < 0.022) {
        const spotT2 = 1 - od2 / 0.022;
        const b2 = spotT2 * spotT2 * 0.7;
        r = Math.round(r + (240 - r) * b2);
        g = Math.round(g + (242 - g) * b2);
        b = Math.round(b + (252 - b) * b2);
      }

      const i = (y * size + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Pluto: New Horizons-accurate — dark Cthulhu Macula, bright Sputnik Planitia heart,
 *  reddish-brown tholins, nitrogen/methane ice terrain, polar frost */
export function generatePlutoTexture(size = 512) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise  = createNoiseGenerator(930);
  const noise2 = createNoiseGenerator(931);
  const noise3 = createNoiseGenerator(932);
  const h = size / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8;
      const ny = y / h * 4;

      const terrain  = fbm(noise,  nx,       ny,       6, 0.52, 2.0) * 0.5 + 0.5;
      const detail   = fbm(noise2, nx * 3.5, ny * 3.5, 5, 0.42, 2.2) * 0.5 + 0.5;
      const tholins  = fbm(noise3, nx * 1.5, ny * 1.5, 4, 0.48, 2.0) * 0.5 + 0.5;
      const fx = x / size, fy = y / h;

      // ── Cthulhu Macula: large dark reddish-brown equatorial region ──
      // Spans ~x 0.52–0.98, y 0.30–0.72 (anti-heart hemisphere)
      const cthX = Math.max(0, Math.min(1, (fx - 0.52) / 0.46));
      const cthY = 1 - Math.abs(fy - 0.50) / 0.22;
      const cthulhu = clamp(cthX * cthY + fbm(noise3, nx * 0.6 + 5, ny * 0.6 + 5, 3, 0.5, 2.0) * 0.35, 0, 1);

      // ── Sputnik Planitia: bright nitrogen ice heart ──
      // True New Horizons heart: elongated lobe centred ~x 0.36, y 0.48
      const hx = fx - 0.36, hy = fy - 0.48;
      // Heart curve: approximation of the iconic teardrop shape
      const heartCore = Math.sqrt(hx * hx * 0.9 + hy * hy * 1.1);
      const heartWing = Math.sqrt((hx - 0.06) * (hx - 0.06) * 1.8 + (hy + 0.05) * (hy + 0.05));
      const heartDist = Math.min(heartCore, heartWing);
      const inHeart = heartDist < 0.145;
      const heartEdge = clamp(1 - heartDist / 0.145, 0, 1);

      let r, g, b;

      if (inHeart) {
        // Bright creamy nitrogen/methane ice with subtle variation
        const iceVar = fbm(noise2, nx * 2, ny * 2, 3, 0.35, 2.0) * 0.12;
        const iceVal = clamp(0.82 + iceVar, 0, 1);
        [r, g, b] = blendColors(195, 185, 168, 238, 228, 212, iceVal);
        // Slightly darker mountain ridge at heart edge
        if (heartEdge < 0.12) {
          const ridge = (1 - heartEdge / 0.12) * 0.3;
          [r, g, b] = blendColors(r, g, b, 145, 118, 92, ridge);
        }
      } else if (cthulhu > 0.38) {
        // Dark Cthulhu: deep reddish-brown, almost black in places
        const dark = clamp((cthulhu - 0.38) / 0.62, 0, 1);
        const val  = terrain * 0.4 + detail * 0.35 + tholins * 0.25;
        [r, g, b] = blendColors(88, 52, 35, 155, 98, 68, val);
        // Extra darkening in deepest Cthulhu
        if (dark > 0.6) {
          const extra = (dark - 0.6) / 0.4;
          [r, g, b] = blendColors(r, g, b, 42, 24, 16, extra * 0.55);
        }
      } else {
        // General terrain: tan-orange with tholin variation
        const val = terrain * 0.45 + detail * 0.35 + tholins * 0.20;
        const thRed = tholins > 0.58 ? (tholins - 0.58) / 0.42 : 0;
        [r, g, b] = blendColors(112, 80, 58, 202, 168, 128, clamp(val, 0, 1));
        // Tholin patches add reddish tint
        r = clamp(r + Math.round(thRed * 30), 0, 255);
        g = clamp(g - Math.round(thRed * 8),  0, 255);
      }

      // Polar frost caps: bright methane/nitrogen ice
      const lat = Math.abs(fy - 0.5) * 2;
      if (lat > 0.72) {
        const frost = clamp((lat - 0.72) / 0.28, 0, 1);
        const frostNoise = fbm(noise, nx * 3, ny * 3 + 20, 3, 0.4, 2.0) * 0.5 + 0.5;
        const frostBlend = frost * (0.6 + frostNoise * 0.4);
        [r, g, b] = blendColors(r, g, b, 222, 215, 200, clamp(frostBlend, 0, 1));
      }

      const i = (y * size + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Haumea: bright water-ice body with red tholin polar regions (confirmed spectroscopy)
 *  and a deep fracture/chaotic terrain network */
export function generateHaumeaTexture(size = 512) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise  = createNoiseGenerator(126);
  const noise2 = createNoiseGenerator(127);
  const noise3 = createNoiseGenerator(128);
  const h = size / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 10;
      const ny = y / h * 5;

      // Base crystalline water-ice: high albedo but not uniform
      const ice     = fbm(noise,  nx,        ny,        5, 0.50, 2.0) * 0.5 + 0.5;
      const detail  = fbm(noise2, nx * 2.5,  ny * 2.5,  4, 0.45, 2.0) * 0.5 + 0.5;
      // Chaotic fracture network: sharp ridges and troughs
      const frac    = Math.abs(fbm(noise3, nx * 7 + 100, ny * 7 + 100, 4, 0.55, 2.2));
      const fracDeep = Math.abs(fbm(noise3, nx * 12 + 50, ny * 12 + 50, 3, 0.6, 2.0));

      const iceVal = ice * 0.6 + detail * 0.4;
      let [r, g, b] = blendColors(152, 150, 145, 232, 228, 220, clamp(iceVal, 0, 1));

      // Dark fractures cut across the surface
      if (frac < 0.18) {
        const fracT = 1 - frac / 0.18;
        [r, g, b] = blendColors(r, g, b, 68, 65, 70, fracT * 0.65);
      }
      if (fracDeep < 0.10) {
        const t = 1 - fracDeep / 0.10;
        [r, g, b] = blendColors(r, g, b, 48, 44, 52, t * 0.55);
      }

      // Red-brown tholin polar regions (spectroscopically confirmed, mid-lat bands)
      const fy  = y / h;
      const lat = Math.abs(fy - 0.5) * 2; // 0 = equator, 1 = pole
      // Tholins appear at mid-latitudes ~0.45–0.75 and poles
      const thNoise = fbm(noise2, nx * 1.5 + 30, ny * 1.5 + 30, 3, 0.5, 2.0) * 0.5 + 0.5;
      const tholin = lat > 0.40 ? clamp((lat - 0.40) / 0.35, 0, 1) * (0.5 + thNoise * 0.5) : 0;
      if (tholin > 0.05) {
        [r, g, b] = blendColors(r, g, b, 185, 105, 72, tholin * 0.70);
      }
      // Bright frost returns at poles
      if (lat > 0.80) {
        const frost = clamp((lat - 0.80) / 0.20, 0, 1);
        [r, g, b] = blendColors(r, g, b, 238, 235, 228, frost * 0.55);
      }

      const i = (y * size + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Makemake: dominated by reddish-orange tholins (most prominent of all KBOs),
 *  scattered bright methane/ethane ice patches, no atmosphere */
export function generateMakemakeTexture(size = 512) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise  = createNoiseGenerator(2005);
  const noise2 = createNoiseGenerator(2006);
  const noise3 = createNoiseGenerator(2007);
  const h = size / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 9;
      const ny = y / h * 4.5;

      const terrain = fbm(noise,  nx,       ny,       6, 0.52, 2.0) * 0.5 + 0.5;
      const tholins = fbm(noise2, nx * 1.8 + 30, ny * 1.8 + 30, 5, 0.50, 2.0) * 0.5 + 0.5;
      const ice     = fbm(noise3, nx * 4  + 80, ny * 4  + 80,  4, 0.58, 2.2) * 0.5 + 0.5;

      // Base: reddish-orange tholin-dominated surface (much redder than Pluto)
      const val = terrain * 0.40 + tholins * 0.60;
      let [r, g, b] = blendColors(142, 85, 52, 228, 148, 88, clamp(val, 0, 1));

      // Bright methane ice patches (scattered, ~15–20% coverage)
      // Ice appears as isolated bright spots where frost condenses
      const iceThresh = 0.68;
      if (ice > iceThresh) {
        const iceBlend = clamp((ice - iceThresh) / (1 - iceThresh), 0, 1);
        // Methane ice: bright white with slight yellowish tint
        [r, g, b] = blendColors(r, g, b, 238, 232, 210, iceBlend * iceBlend * 0.88);
      }

      // Subtle dark bands (topographic variation in the tholin layer)
      const darkBand = fbm(noise, nx * 0.5 + 5, ny * 0.5 + 5, 3, 0.45, 2.0) * 0.5 + 0.5;
      if (darkBand < 0.30) {
        const dT = 1 - darkBand / 0.30;
        [r, g, b] = blendColors(r, g, b, 85, 45, 28, dT * 0.40);
      }

      // Polar brightening: ethane/methane frosts at poles
      const lat = Math.abs(y / h - 0.5) * 2;
      if (lat > 0.78) {
        const frost = clamp((lat - 0.78) / 0.22, 0, 1);
        [r, g, b] = blendColors(r, g, b, 230, 220, 195, frost * 0.50);
      }

      const i = (y * size + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Eris: highest albedo of any solar system body (0.96) — methane frost blanket,
 *  very bright but with visible pressure ridges, old dark terrain peeking through */
export function generateErisTexture(size = 512) {
  const { canvas, ctx } = createCanvas(size, size / 2);
  const imageData = ctx.createImageData(size, size / 2);
  const data = imageData.data;
  const noise  = createNoiseGenerator(2003);
  const noise2 = createNoiseGenerator(2004);
  const noise3 = createNoiseGenerator(2008);
  const h = size / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 9;
      const ny = y / h * 4.5;

      // Ultra-high albedo methane frost — mostly white
      const frost  = fbm(noise,  nx,        ny,        5, 0.42, 2.0) * 0.5 + 0.5;
      const underfrost = fbm(noise2, nx * 2.2, ny * 2.2, 4, 0.55, 2.2) * 0.5 + 0.5;

      // Pressure ridges: sharp, narrow dark lineations (methane compresses and cracks)
      const ridge1 = Math.abs(fbm(noise3, nx * 9  + 200, ny * 9  + 200, 4, 0.58, 2.2));
      const ridge2 = Math.abs(fbm(noise3, nx * 14 + 100, ny * 14 + 100, 3, 0.62, 2.0));

      // Dominant: near-pure white frost surface
      const frostVal = frost * 0.55 + underfrost * 0.45;
      let [r, g, b] = blendColors(200, 200, 208, 245, 244, 248, clamp(frostVal, 0, 1));

      // Subtle blue tint in deepest frost (methane ice has slight blue absorption)
      if (frostVal > 0.78) {
        const blueT = (frostVal - 0.78) / 0.22;
        b = clamp(b + Math.round(blueT * 8), 0, 255);
        r = clamp(r - Math.round(blueT * 4), 0, 255);
      }

      // Pressure ridges — dark grey-blue crevasses
      if (ridge1 < 0.14) {
        const rt = 1 - ridge1 / 0.14;
        [r, g, b] = blendColors(r, g, b, 82, 88, 105, rt * 0.72);
      }
      if (ridge2 < 0.09) {
        const rt2 = 1 - ridge2 / 0.09;
        [r, g, b] = blendColors(r, g, b, 65, 70, 88, rt2 * 0.60);
      }

      // Darker ancient terrain poking through frost at equatorial low points
      const lat = Math.abs(y / h - 0.5) * 2;
      if (lat < 0.35) {
        const darkTerrain = fbm(noise2, nx * 0.8 + 40, ny * 0.8 + 40, 3, 0.5, 2.0) * 0.5 + 0.5;
        if (darkTerrain < 0.32) {
          const dT = (1 - darkTerrain / 0.32) * (1 - lat / 0.35) * 0.45;
          [r, g, b] = blendColors(r, g, b, 110, 108, 118, dT);
        }
      }

      const i = (y * size + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
