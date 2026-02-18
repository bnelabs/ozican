/**
 * Renders SVG cutaway diagrams for planet internal structures.
 * Follows the same pattern as SunCutaway.js.
 */
import { t } from '../i18n/i18n.js';
import { PLANET_LAYERS } from '../data/planetLayers.js';

/**
 * Render a planet's cross-section SVG diagram.
 * @param {string} planetKey - e.g. 'earth', 'mars'
 * @returns {string} HTML string with SVG
 */
export function renderPlanetCutaway(planetKey) {
  const layers = PLANET_LAYERS[planetKey];
  if (!layers) return '';

  let layersSvg = '';
  let labelsSvg = '';

  for (let i = 0; i < layers.length; i++) {
    const { key, color, r } = layers[i];
    const label = t(key);
    const opacity = i === 0 ? 0.5 : 0.6 + i * 0.08;

    // Right half semicircle (cutaway)
    layersSvg += `
      <path
        d="M 160 ${160 - r} A ${r} ${r} 0 0 1 160 ${160 + r}"
        fill="${color}" fill-opacity="${opacity}"
        stroke="rgba(255,255,255,0.15)" stroke-width="0.5"
        class="cutaway-layer"
      />`;

    // Left half (surface appearance) - only outermost layer
    if (i === 0) {
      layersSvg += `
        <path
          d="M 160 ${160 - r} A ${r} ${r} 0 0 0 160 ${160 + r}"
          fill="${color}" fill-opacity="0.4"
          stroke="none"
        />`;
    }

    // Leader lines and labels
    const labelY = 30 + i * (240 / layers.length);
    const arcY = 160 - r + (r * 0.5);
    const lineStartX = 160 + r * 0.7;
    labelsSvg += `
      <line x1="${lineStartX}" y1="${arcY}" x2="240" y2="${labelY}"
        stroke="rgba(255,255,255,0.25)" stroke-width="0.5" stroke-dasharray="2,2" />
      <circle cx="240" cy="${labelY}" r="2" fill="${color}" opacity="0.8" />
      <text x="248" y="${labelY + 4}" fill="var(--text-secondary)" font-size="9" font-family="var(--font-main)">
        ${label}
      </text>`;
  }

  // Surface gradient for left half
  const surfaceColor = layers[0].color;
  const surfaceSvg = `
    <defs>
      <radialGradient id="planet-surface-grad-${planetKey}" cx="40%" cy="40%">
        <stop offset="0%" stop-color="${surfaceColor}" stop-opacity="0.3" />
        <stop offset="100%" stop-color="${surfaceColor}" stop-opacity="0.6" />
      </radialGradient>
      <clipPath id="planet-left-clip-${planetKey}">
        <rect x="20" y="20" width="140" height="280" />
      </clipPath>
    </defs>
    <circle cx="160" cy="160" r="140" fill="url(#planet-surface-grad-${planetKey})"
      clip-path="url(#planet-left-clip-${planetKey})" />`;

  return `
    <div class="planet-cutaway-container">
      <svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" class="planet-cutaway-svg">
        ${surfaceSvg}
        ${layersSvg}
        ${labelsSvg}
        <line x1="160" y1="20" x2="160" y2="300" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" stroke-dasharray="4,4" />
      </svg>
    </div>`;
}
