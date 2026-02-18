import { t } from '../i18n/i18n.js';

/**
 * Renders an SVG cutaway diagram of the Sun's internal layers.
 * Left half shows surface texture, right half shows color-coded cross-section.
 */
export function renderSunCutaway() {
  const layers = [
    { key: 'sun.layer.corona',       color: '#ffe4b5', r: 140 },
    { key: 'sun.layer.chromosphere',  color: '#ff6347', r: 125 },
    { key: 'sun.layer.photosphere',   color: '#ffd700', r: 115 },
    { key: 'sun.layer.convective',    color: '#ff8c00', r: 100 },
    { key: 'sun.layer.radiative',     color: '#ff6200', r: 75 },
    { key: 'sun.layer.core',          color: '#ffffff', r: 35 },
  ];

  // Build layer arcs (right half = cutaway, left half = surface)
  let layersSvg = '';
  let labelsSvg = '';

  for (let i = 0; i < layers.length; i++) {
    const { key, color, r } = layers[i];
    const label = t(key);
    const opacity = i === 0 ? 0.3 : 0.6 + i * 0.06;

    // Right half semicircle (cutaway)
    layersSvg += `
      <path
        d="M 160 ${160 - r} A ${r} ${r} 0 0 1 160 ${160 + r}"
        fill="${color}" fill-opacity="${opacity}"
        stroke="rgba(255,255,255,0.15)" stroke-width="0.5"
        class="sun-layer" data-layer="${i}"
      />`;

    // Left half (surface appearance) - only the outermost layers
    if (i < 3) {
      layersSvg += `
        <path
          d="M 160 ${160 - r} A ${r} ${r} 0 0 0 160 ${160 + r}"
          fill="${color}" fill-opacity="${Math.max(0.15, opacity - 0.2)}"
          stroke="none"
        />`;
    }

    // Leader lines and labels (right side)
    const labelY = 40 + i * 40;
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

  // Surface texture on left half (outermost circle)
  const surfaceSvg = `
    <defs>
      <clipPath id="sun-left-clip">
        <rect x="20" y="20" width="140" height="280" />
      </clipPath>
      <radialGradient id="sun-surface-grad" cx="40%" cy="40%">
        <stop offset="0%" stop-color="#fff5d0" stop-opacity="0.4" />
        <stop offset="50%" stop-color="#ffd700" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#ff8c00" stop-opacity="0.8" />
      </radialGradient>
    </defs>
    <circle cx="160" cy="160" r="140" fill="url(#sun-surface-grad)"
      clip-path="url(#sun-left-clip)" />`;

  return `
    <div class="sun-cutaway-container">
      <h3 class="info-section-title">${t('sun.showStructure')}</h3>
      <svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" class="sun-cutaway-svg">
        ${surfaceSvg}
        ${layersSvg}
        ${labelsSvg}
        <!-- Center dividing line -->
        <line x1="160" y1="20" x2="160" y2="300" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" stroke-dasharray="4,4" />
      </svg>
    </div>`;
}
