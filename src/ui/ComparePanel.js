/**
 * Planet comparison table generator.
 */
import { getComparisonData } from '../data/solarSystem.js';

export function renderCompareTable() {
  const data = getComparisonData();

  let html = `<div class="compare-table-wrapper"><table class="compare-table">
    <thead>
      <tr>
        <th>Planet</th>
        <th>Type</th>
        <th>Diameter</th>
        <th>Mass</th>
        <th>Gravity</th>
        <th>Day</th>
        <th>Year</th>
        <th>Moons</th>
        <th>Temp</th>
      </tr>
    </thead>
    <tbody>`;

  for (const planet of data) {
    html += `
      <tr>
        <td class="planet-name">${planet.name}</td>
        <td>${planet.type}</td>
        <td>${planet.diameter}</td>
        <td>${planet.mass}</td>
        <td>${planet.gravity}</td>
        <td>${planet.dayLength}</td>
        <td>${planet.year}</td>
        <td>${planet.moons}</td>
        <td>${planet.temperature}</td>
      </tr>`;
  }

  html += `</tbody></table></div>`;
  return html;
}

export function renderCompareCards() {
  const data = getComparisonData();

  let html = '<div class="compare-cards">';

  for (const planet of data) {
    html += `
      <div class="compare-card">
        <div class="compare-card-header">
          <div class="planet-name">${planet.name}</div>
          <div class="planet-type">${planet.type}</div>
        </div>
        <div class="compare-card-grid">
          <div class="compare-card-stat"><div class="label">Diameter</div><div class="value">${planet.diameter}</div></div>
          <div class="compare-card-stat"><div class="label">Mass</div><div class="value">${planet.mass}</div></div>
          <div class="compare-card-stat"><div class="label">Gravity</div><div class="value">${planet.gravity}</div></div>
          <div class="compare-card-stat"><div class="label">Day</div><div class="value">${planet.dayLength}</div></div>
          <div class="compare-card-stat"><div class="label">Year</div><div class="value">${planet.year}</div></div>
          <div class="compare-card-stat"><div class="label">Moons</div><div class="value">${planet.moons}</div></div>
          <div class="compare-card-stat"><div class="label">Temp</div><div class="value">${planet.temperature}</div></div>
          <div class="compare-card-stat"><div class="label">Distance</div><div class="value">${planet.distance}</div></div>
        </div>
      </div>`;
  }

  html += '</div>';
  return html;
}
