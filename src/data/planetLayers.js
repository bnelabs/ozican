/**
 * Internal layer data for planet cross-section diagrams.
 * Each planet has layers from outermost to innermost.
 * Radius is relative (outermost = 140 for SVG viewbox).
 */
export const PLANET_LAYERS = {
  mercury: [
    { key: 'layer.mercury.crust', color: '#8C7E6D', r: 140 },
    { key: 'layer.mercury.mantle', color: '#A0522D', r: 110 },
    { key: 'layer.mercury.outerCore', color: '#CD853F', r: 75 },
    { key: 'layer.mercury.innerCore', color: '#DAA520', r: 50 },
  ],
  venus: [
    { key: 'layer.venus.crust', color: '#C4A45A', r: 140 },
    { key: 'layer.venus.mantle', color: '#B8860B', r: 115 },
    { key: 'layer.venus.outerCore', color: '#CD853F', r: 65 },
    { key: 'layer.venus.innerCore', color: '#FFD700', r: 35 },
  ],
  earth: [
    { key: 'layer.earth.crust', color: '#4A90D9', r: 140 },
    { key: 'layer.earth.upperMantle', color: '#8B4513', r: 130 },
    { key: 'layer.earth.lowerMantle', color: '#A0522D', r: 105 },
    { key: 'layer.earth.outerCore', color: '#DAA520', r: 65 },
    { key: 'layer.earth.innerCore', color: '#FFD700', r: 30 },
  ],
  mars: [
    { key: 'layer.mars.crust', color: '#C1440E', r: 140 },
    { key: 'layer.mars.mantle', color: '#A0522D', r: 115 },
    { key: 'layer.mars.core', color: '#CD853F', r: 55 },
  ],
  jupiter: [
    { key: 'layer.jupiter.clouds', color: '#C88B3A', r: 140 },
    { key: 'layer.jupiter.molecularH2', color: '#8B7355', r: 115 },
    { key: 'layer.jupiter.metallicH', color: '#4682B4', r: 75 },
    { key: 'layer.jupiter.core', color: '#696969', r: 30 },
  ],
  saturn: [
    { key: 'layer.saturn.clouds', color: '#C5AB6E', r: 140 },
    { key: 'layer.saturn.molecularH2', color: '#B8A088', r: 115 },
    { key: 'layer.saturn.metallicH', color: '#4682B4', r: 70 },
    { key: 'layer.saturn.core', color: '#696969', r: 25 },
  ],
  uranus: [
    { key: 'layer.uranus.atmosphere', color: '#72B5C4', r: 140 },
    { key: 'layer.uranus.iceMantle', color: '#2F4F4F', r: 100 },
    { key: 'layer.uranus.core', color: '#696969', r: 35 },
  ],
  neptune: [
    { key: 'layer.neptune.atmosphere', color: '#3E54A3', r: 140 },
    { key: 'layer.neptune.iceMantle', color: '#2F4F4F', r: 100 },
    { key: 'layer.neptune.core', color: '#696969', r: 35 },
  ],
  sun: [
    { key: 'sun.layer.corona', color: '#ffe4b5', r: 140 },
    { key: 'sun.layer.chromosphere', color: '#ff6347', r: 125 },
    { key: 'sun.layer.photosphere', color: '#ffd700', r: 115 },
    { key: 'sun.layer.convective', color: '#ff8c00', r: 100 },
    { key: 'sun.layer.radiative', color: '#ff6200', r: 75 },
    { key: 'sun.layer.core', color: '#ffffff', r: 35 },
  ],

  // === Moons ===
  earth_moon_0: [
    { key: 'layer.moon.crust', color: '#8C8C88', r: 140 },
    { key: 'layer.moon.upperMantle', color: '#7A6E5A', r: 120 },
    { key: 'layer.moon.lowerMantle', color: '#8B7355', r: 85 },
    { key: 'layer.moon.innerCore', color: '#CD853F', r: 40 },
  ],
  jupiter_moon_0: [ // Io
    { key: 'layer.io.crust', color: '#D4A830', r: 140 },
    { key: 'layer.io.mantle', color: '#A0522D', r: 110 },
    { key: 'layer.io.core', color: '#DAA520', r: 50 },
  ],
  jupiter_moon_1: [ // Europa
    { key: 'layer.europa.iceShell', color: '#B8D4E8', r: 140 },
    { key: 'layer.europa.ocean', color: '#2E6B8A', r: 115 },
    { key: 'layer.europa.mantle', color: '#8B7355', r: 80 },
    { key: 'layer.europa.core', color: '#CD853F', r: 40 },
  ],
  jupiter_moon_2: [ // Ganymede
    { key: 'layer.ganymede.iceShell', color: '#C0CDD8', r: 140 },
    { key: 'layer.ganymede.ocean', color: '#2E6B8A', r: 115 },
    { key: 'layer.ganymede.mantle', color: '#8B7355', r: 80 },
    { key: 'layer.ganymede.core', color: '#DAA520', r: 35 },
  ],
  jupiter_moon_3: [ // Callisto
    { key: 'layer.callisto.iceRock', color: '#706860', r: 140 },
    { key: 'layer.callisto.interior', color: '#5A5048', r: 95 },
    { key: 'layer.callisto.core', color: '#8B7355', r: 40 },
  ],
  saturn_moon_0: [ // Titan
    { key: 'layer.titan.atmosphere', color: '#D4963A', r: 140 },
    { key: 'layer.titan.iceShell', color: '#B8C8D8', r: 115 },
    { key: 'layer.titan.ocean', color: '#2E6B8A', r: 95 },
    { key: 'layer.titan.iceMantle', color: '#7A8890', r: 70 },
    { key: 'layer.titan.core', color: '#8B7355', r: 35 },
  ],
  saturn_moon_1: [ // Enceladus
    { key: 'layer.enceladus.iceShell', color: '#E8F0F8', r: 140 },
    { key: 'layer.enceladus.ocean', color: '#2E6B8A', r: 100 },
    { key: 'layer.enceladus.core', color: '#8B7355', r: 50 },
  ],

  // === Dwarf Planets ===
  pluto: [
    { key: 'layer.pluto.nitrogenIce', color: '#C4B5A0', r: 140 },
    { key: 'layer.pluto.waterIce', color: '#8AA8C0', r: 105 },
    { key: 'layer.pluto.core', color: '#8B7355', r: 55 },
  ],
  ceres: [
    { key: 'layer.ceres.regolith', color: '#8A8A7A', r: 140 },
    { key: 'layer.ceres.iceMantle', color: '#7A9AAA', r: 100 },
    { key: 'layer.ceres.core', color: '#8B7355', r: 50 },
  ],
  eris: [
    { key: 'layer.eris.methaneIce', color: '#B8B8C8', r: 140 },
    { key: 'layer.eris.waterIce', color: '#8AA8C0', r: 100 },
    { key: 'layer.eris.core', color: '#8B7355', r: 50 },
  ],
  haumea: [
    { key: 'layer.haumea.surface', color: '#D0C8C0', r: 140 },
    { key: 'layer.haumea.iceMantle', color: '#8AA8C0', r: 100 },
    { key: 'layer.haumea.core', color: '#8B7355', r: 50 },
  ],
  makemake: [
    { key: 'layer.makemake.methaneIce', color: '#C8A882', r: 140 },
    { key: 'layer.makemake.waterIce', color: '#8AA8C0', r: 100 },
    { key: 'layer.makemake.core', color: '#8B7355', r: 50 },
  ],
};
