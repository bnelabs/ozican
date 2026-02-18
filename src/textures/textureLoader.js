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

/**
 * Loads all textures and returns a map.
 * @param {function} onProgress - Called with (percent) as textures load
 * @returns {Promise<Object>} Map of key -> THREE.Texture
 */
export async function loadAllTextures(onProgress) {
  const loader = new THREE.TextureLoader();
  const keys = Object.keys(TEXTURE_PATHS);
  const total = keys.length;
  let loaded = 0;
  const textures = {};

  const promises = keys.map((key) => {
    return new Promise((resolve) => {
      loader.load(
        TEXTURE_PATHS[key],
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          textures[key] = texture;
          loaded++;
          if (onProgress) onProgress(Math.round((loaded / total) * 100));
          resolve();
        },
        undefined,
        () => {
          // On error, leave texture undefined (fallback to procedural)
          loaded++;
          if (onProgress) onProgress(Math.round((loaded / total) * 100));
          resolve();
        }
      );
    });
  });

  await Promise.all(promises);
  return textures;
}
