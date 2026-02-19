/**
 * Planet comparison table generator with visual enhancements.
 */
import { getLocalizedComparisonData } from '../i18n/localizedData.js';
import { t } from '../i18n/i18n.js';
import { escapeHTML } from '../utils/sanitize.js';

/** Convert THREE.js Color hex int to CSS hex string */
function colorToHex(c) {
  if (typeof c === 'string') return c;
  return '#' + c.toString(16).padStart(6, '0');
}

/** Calculate relative dot size (Jupiter = max) */
function relativeSize(displayRadius, maxRadius, maxPx = 40) {
  return Math.max(6, Math.round((displayRadius / maxRadius) * maxPx));
}

export function renderCompareTable() {
  const data = getLocalizedComparisonData();
  const maxR = Math.max(...data.map(p => p.displayRadius));

  let html = `<div class="compare-table-wrapper"><table class="compare-table">
    <thead>
      <tr>
        <th>${t('compare.planet')}</th>
        <th>${t('compare.type')}</th>
        <th>${t('compare.diameter')}</th>
        <th>${t('compare.mass')}</th>
        <th>${t('compare.gravity')}</th>
        <th>${t('compare.day')}</th>
        <th>${t('compare.year')}</th>
        <th>${t('compare.moons')}</th>
        <th>${t('compare.temp')}</th>
      </tr>
    </thead>
    <tbody>`;

  for (const planet of data) {
    const hex = colorToHex(planet.color);
    const dotSize = relativeSize(planet.displayRadius, maxR);
    html += `
      <tr>
        <td class="planet-name">
          <span class="compare-planet-dot" style="background: ${hex}; width: ${dotSize}px; height: ${dotSize}px;"></span>
          ${escapeHTML(planet.name)}
        </td>
        <td>${escapeHTML(planet.type)}</td>
        <td>${escapeHTML(planet.diameter)}</td>
        <td>${escapeHTML(planet.mass)}</td>
        <td>${escapeHTML(planet.gravity)}</td>
        <td>${escapeHTML(planet.dayLength)}</td>
        <td>${escapeHTML(planet.year)}</td>
        <td>${planet.moons > 0 ? escapeHTML(String(planet.moons)) + ' ' + escapeHTML(t('compare.known')) : '0'}</td>
        <td>${escapeHTML(planet.temperature)}</td>
      </tr>`;
  }

  html += `</tbody></table></div>`;

  // Size comparison bar
  html += renderSizeBar(data, maxR);

  return html;
}

export function renderCompareCards() {
  const data = getLocalizedComparisonData();
  const maxR = Math.max(...data.map(p => p.displayRadius));

  let html = '<div class="compare-cards">';

  for (const planet of data) {
    const hex = colorToHex(planet.color);
    const dotSize = relativeSize(planet.displayRadius, maxR, 64);
    html += `
      <div class="compare-card" style="border-top: 3px solid ${hex};">
        <div class="compare-card-header" style="background: linear-gradient(135deg, ${hex}22 0%, transparent 60%);">
          <span class="compare-planet-dot" style="background: ${hex}; width: ${dotSize}px; height: ${dotSize}px;"></span>
          <div>
            <div class="planet-name">${escapeHTML(planet.name)}</div>
            <div class="planet-type">${escapeHTML(planet.type)}</div>
          </div>
        </div>
        <div class="compare-card-grid">
          <div class="compare-card-stat"><div class="label">${t('compare.diameter')}</div><div class="value">${escapeHTML(planet.diameter)}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.mass')}</div><div class="value">${escapeHTML(planet.mass)}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.gravity')}</div><div class="value">${escapeHTML(planet.gravity)}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.day')}</div><div class="value">${escapeHTML(planet.dayLength)}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.year')}</div><div class="value">${escapeHTML(planet.year)}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.moons')}</div><div class="value">${planet.moons > 0 ? escapeHTML(String(planet.moons)) + ' ' + escapeHTML(t('compare.known')) : '0'}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.temp')}</div><div class="value">${escapeHTML(planet.temperature)}</div></div>
          <div class="compare-card-stat"><div class="label">${t('compare.distance')}</div><div class="value">${escapeHTML(planet.distance)}</div></div>
        </div>
      </div>`;
  }

  html += '</div>';

  // Size comparison bar
  html += renderSizeBar(data, maxR);

  return html;
}

function renderSizeBar(data, maxR) {
  let html = '<div class="compare-size-bar">';
  for (const planet of data) {
    const hex = colorToHex(planet.color);
    const widthPct = Math.max(2, (planet.displayRadius / maxR) * 100);
    html += `
      <div class="compare-size-item">
        <div class="compare-size-fill" style="width: ${widthPct}%; background: ${hex};" title="${escapeHTML(planet.name)}"></div>
        <span class="compare-size-label">${escapeHTML(planet.name)}</span>
      </div>`;
  }
  html += '</div>';
  return html;
}
