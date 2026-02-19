/**
 * Loads photo-realistic NASA textures for all planets.
 * Returns a map of texture keys to THREE.Texture objects.
 * Mobile devices load 2K textures; desktop loads higher resolution where available.
 */
import * as THREE from 'three';

const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));

// Desktop: try higher-res first, fall back to 2K
const TEXTURE_PATHS_DESKTOP = {
  mercury: '/textures/mercury_2k.jpg',
  venus: '/textures/venus_2k.jpg',
  earth: '/textures/earth_2k.jpg',
  earthClouds: '/textures/earth_clouds_2k.jpg',
  mars: '/textures/mars_2k.jpg',
  jupiter: '/textures/jupiter_2k.jpg',
  saturn: '/textures/saturn_2k.jpg',
  saturnRing: '/textures/saturn_ring.png',
  uranus: '/textures/uranus_2k.jpg',
  neptune: '/textures/neptune_2k.jpg',
  moon: '/textures/moon_2k.jpg',
  sun: '/textures/sun_8k.jpg',
  starmap: '/textures/starmap_2k.jpg',
};

// Mobile: always 2K (smaller textures)
const TEXTURE_PATHS_MOBILE = {
  mercury: '/textures/mercury_2k.jpg',
  venus: '/textures/venus_2k.jpg',
  earth: '/textures/earth_2k.jpg',
  earthClouds: '/textures/earth_clouds_2k.jpg',
  mars: '/textures/mars_2k.jpg',
  jupiter: '/textures/jupiter_2k.jpg',
  saturn: '/textures/saturn_2k.jpg',
  saturnRing: '/textures/saturn_ring.png',
  uranus: '/textures/uranus_2k.jpg',
  neptune: '/textures/neptune_2k.jpg',
  moon: '/textures/moon_2k.jpg',
  sun: '/textures/sun_8k.jpg',
  starmap: '/textures/starmap_2k.jpg',
};

const TEXTURE_PATHS = isMobile ? TEXTURE_PATHS_MOBILE : TEXTURE_PATHS_DESKTOP;

/** Solid-color fallback canvas texture (1×1 pixel, neutral grey). */
function makeFallbackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#444466';
  ctx.fillRect(0, 0, 1, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Attempt to load a texture, retrying up to maxAttempts times with
 * exponential backoff (2 s → 4 s → 8 s …).
 * On final failure returns a 1×1 solid-colour fallback texture.
 * @param {THREE.TextureLoader} loader
 * @param {string} url
 * @param {number} maxAttempts
 * @returns {Promise<THREE.Texture>}
 */
async function loadTextureWithRetry(loader, url, maxAttempts = 3) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const texture = await new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    } catch {
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  console.warn(`[TextureLoader] Failed to load "${url}" after ${maxAttempts} attempts — using fallback.`);
  return makeFallbackTexture();
}

/**
 * Loads all textures and returns a map.
 * Each texture is retried up to 3 times with exponential backoff before
 * falling back to a solid-colour placeholder.
 * @param {function} onProgress - Called with (percent) as textures load
 * @returns {Promise<Object>} Map of key -> THREE.Texture
 */
export async function loadAllTextures(onProgress) {
  const loader = new THREE.TextureLoader();
  const keys = Object.keys(TEXTURE_PATHS);
  const total = keys.length;
  let loaded = 0;
  const textures = {};

  const promises = keys.map(async (key) => {
    textures[key] = await loadTextureWithRetry(loader, TEXTURE_PATHS[key]);
    loaded++;
    if (onProgress) onProgress(Math.round((loaded / total) * 100));
  });

  await Promise.all(promises);
  return textures;
}
