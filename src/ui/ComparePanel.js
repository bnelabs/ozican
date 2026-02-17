/**
 * Planet comparison table generator.
 */
import { getComparisonData } from '../data/solarSystem.js';

export function renderCompareTable() {
  const data = getComparisonData();

  let html = `<table class="compare-table">
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

  html += `</tbody></table>`;
  return html;
}
