/**
 * Generates HTML content for planet/moon info panels.
 */
import { SOLAR_SYSTEM } from '../data/solarSystem.js';

export function renderPlanetInfo(key) {
  const data = SOLAR_SYSTEM[key];
  if (!data) return '';

  let html = '';

  // Header
  html += `
    <div class="info-header fade-in">
      <div class="subtitle">${data.type}</div>
      <h1>${data.name}</h1>
      <div class="subtitle">${data.subtitle}</div>
    </div>
  `;

  // Tagline
  html += `<p class="info-tagline fade-in">${data.tagline}</p>`;

  // Quick Stats
  html += `<div class="info-section fade-in">
    <h3>Quick Facts</h3>
    <div class="info-grid">`;

  if (key === 'sun') {
    html += stat('Mass', data.mass);
    html += stat('Surface Temp', data.temperature);
    html += stat('Core Temp', data.coreTemperature);
    html += stat('Luminosity', data.luminosity);
    html += stat('Age', data.age);
    html += stat('Spectral Class', data.spectralClass);
  } else {
    html += stat('Mass', `${data.massEarths} <span class="unit">× Earth</span>`);
    html += stat('Gravity', data.gravity);
    html += stat('Temperature', data.temperature);
    html += stat('Day Length', data.dayLength);
    html += stat('Year', data.orbitalPeriod);
    html += stat('Distance', data.distanceFromSun);
  }

  html += `</div></div>`;

  // Physical Attributes
  if (data.physicalAttributes) {
    html += `<div class="info-section fade-in">
      <h3>Physical Attributes</h3>
      <div class="info-grid">`;
    for (const [label, value] of Object.entries(data.physicalAttributes)) {
      html += stat(formatLabel(label), value);
    }
    html += `</div></div>`;
  }

  // Atmosphere
  if (data.atmosphere) {
    html += `<div class="info-section fade-in">
      <h3>Atmosphere</h3>
      <div class="info-grid">
        ${stat('Composition', data.atmosphere, true)}
      </div>
    </div>`;
  }

  // Composition (Sun)
  if (data.composition) {
    html += `<div class="info-section fade-in">
      <h3>Composition</h3>
      <div class="info-grid">`;
    for (const [element, percentage] of Object.entries(data.composition)) {
      html += stat(capitalize(element), percentage);
    }
    html += `</div></div>`;
  }

  // Minerals
  if (data.minerals && data.minerals.length > 0) {
    html += `<div class="info-section fade-in">
      <h3>Key Minerals & Elements</h3>
      <div class="mineral-tags">`;
    for (const mineral of data.minerals) {
      html += `<span class="mineral-tag">${mineral}</span>`;
    }
    html += `</div></div>`;
  }

  // Astrophysics
  if (data.astrophysics) {
    html += `<div class="info-section fade-in">
      <h3>Astrophysical Data</h3>
      <div class="info-grid">`;
    for (const [label, value] of Object.entries(data.astrophysics)) {
      html += stat(formatLabel(label), value);
    }
    html += `</div></div>`;
  }

  // Geology
  if (data.geology) {
    html += `<div class="info-section fade-in">
      <h3>Geology & Surface</h3>
      <div class="info-description"><p>${data.geology}</p></div>
    </div>`;
  }

  // Description
  if (data.description) {
    html += `<div class="info-section fade-in">
      <h3>About</h3>
      <div class="info-description">`;
    for (const para of data.description) {
      html += `<p>${para}</p>`;
    }
    html += `</div></div>`;
  }

  // Fun Facts
  if (data.funFacts && data.funFacts.length > 0) {
    html += `<div class="info-section fade-in">
      <h3>Interesting Facts</h3>
      <div class="info-description">`;
    for (const fact of data.funFacts) {
      html += `<p>&#x2022; ${fact}</p>`;
    }
    html += `</div></div>`;
  }

  // Moons
  if (data.moons && data.moons.length > 0) {
    html += `<div class="info-section fade-in">
      <h3>Moons (${data.moons.length})</h3>
      <div class="moon-list">`;
    for (let i = 0; i < data.moons.length; i++) {
      const moon = data.moons[i];
      html += `
        <div class="moon-item" data-planet="${key}" data-moon-index="${i}">
          <div class="moon-dot" style="background: ${moon.color};"></div>
          <span class="moon-name">${moon.name}</span>
          <span class="moon-info">${moon.diameter}</span>
        </div>`;
    }
    html += `</div></div>`;
  }

  return html;
}

export function renderMoonInfo(planetKey, moonIndex) {
  const planet = SOLAR_SYSTEM[planetKey];
  if (!planet || !planet.moons[moonIndex]) return '';

  const moon = planet.moons[moonIndex];
  let html = '';

  html += `
    <div class="info-header fade-in">
      <div class="subtitle">Moon of ${planet.name}</div>
      <h1>${moon.name}</h1>
    </div>
  `;

  html += `<div class="info-section fade-in">
    <h3>Quick Facts</h3>
    <div class="info-grid">
      ${stat('Diameter', moon.diameter)}
      ${stat('Orbital Period', moon.orbitalPeriod)}
    </div>
  </div>`;

  html += `<div class="info-section fade-in">
    <h3>Description</h3>
    <div class="info-description"><p>${moon.description}</p></div>
  </div>`;

  if (moon.minerals && moon.minerals.length > 0) {
    html += `<div class="info-section fade-in">
      <h3>Key Minerals</h3>
      <div class="mineral-tags">`;
    for (const mineral of moon.minerals) {
      html += `<span class="mineral-tag">${mineral}</span>`;
    }
    html += `</div></div>`;
  }

  // Back button
  html += `
    <div class="info-section">
      <button class="nav-btn" id="back-to-planet" data-planet="${planetKey}"
        style="width: 100%; text-align: center; padding: 10px;">
        &larr; Back to ${planet.name}
      </button>
    </div>`;

  return html;
}

function stat(label, value, fullWidth = false) {
  return `
    <div class="info-stat${fullWidth ? ' full-width' : ''}">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>`;
}

function formatLabel(camelCase) {
  return camelCase
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
