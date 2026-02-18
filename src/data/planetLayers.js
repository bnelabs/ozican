/**
 * Internal layer data for planet cross-section diagrams.
 * Each planet has layers from outermost to innermost.
 * Radius is relative (outermost = 140 for SVG viewbox).
 *
 * color: primary layer color (used for sphere material and face shader base)
 * deepColor: darker variant used for texture mixing in the face shader
 * Colors are scientifically-informed, muted geological palette.
 */
export const PLANET_LAYERS = {
  mercury: [
    { key: 'layer.mercury.crust', color: '#7A6E5D', deepColor: '#5A5045', r: 140 },
    { key: 'layer.mercury.mantle', color: '#8B6840', deepColor: '#6A4E2E', r: 110 },
    { key: 'layer.mercury.outerCore', color: '#B8863A', deepColor: '#8A6428', r: 75 },
    { key: 'layer.mercury.innerCore', color: '#D4A84A', deepColor: '#A88038', r: 50 },
  ],
  venus: [
    { key: 'layer.venus.crust', color: '#A89060', deepColor: '#7A6840', r: 140 },
    { key: 'layer.venus.mantle', color: '#9A7038', deepColor: '#6E5028', r: 115 },
    { key: 'layer.venus.outerCore', color: '#B88830', deepColor: '#8A6820', r: 65 },
    { key: 'layer.venus.innerCore', color: '#D4A840', deepColor: '#A88830', r: 35 },
  ],
  earth: [
    { key: 'layer.earth.crust', color: '#5C6B5A', deepColor: '#3E4A3C', r: 140 },
    { key: 'layer.earth.upperMantle', color: '#7A4E2D', deepColor: '#5C3A1F', r: 130 },
    { key: 'layer.earth.lowerMantle', color: '#8B3A1A', deepColor: '#6B2A0E', r: 105 },
    { key: 'layer.earth.outerCore', color: '#C47A20', deepColor: '#9A5A10', r: 65 },
    { key: 'layer.earth.innerCore', color: '#E8C840', deepColor: '#C4A030', r: 30 },
  ],
  mars: [
    { key: 'layer.mars.crust', color: '#A84820', deepColor: '#803818', r: 140 },
    { key: 'layer.mars.mantle', color: '#8A4828', deepColor: '#6A3418', r: 115 },
    { key: 'layer.mars.core', color: '#B07838', deepColor: '#885828', r: 55 },
  ],
  jupiter: [
    { key: 'layer.jupiter.clouds', color: '#B88840', deepColor: '#8A6830', r: 140 },
    { key: 'layer.jupiter.molecularH2', color: '#786858', deepColor: '#584838', r: 115 },
    { key: 'layer.jupiter.metallicH', color: '#4878A8', deepColor: '#305878', r: 75 },
    { key: 'layer.jupiter.core', color: '#606060', deepColor: '#404040', r: 30 },
  ],
  saturn: [
    { key: 'layer.saturn.clouds', color: '#B8A070', deepColor: '#8A7850', r: 140 },
    { key: 'layer.saturn.molecularH2', color: '#A89078', deepColor: '#787058', r: 115 },
    { key: 'layer.saturn.metallicH', color: '#4878A8', deepColor: '#305878', r: 70 },
    { key: 'layer.saturn.core', color: '#606060', deepColor: '#404040', r: 25 },
  ],
  uranus: [
    { key: 'layer.uranus.atmosphere', color: '#68A8B8', deepColor: '#488898', r: 140 },
    { key: 'layer.uranus.iceMantle', color: '#2E5858', deepColor: '#1E3838', r: 100 },
    { key: 'layer.uranus.core', color: '#606060', deepColor: '#404040', r: 35 },
  ],
  neptune: [
    { key: 'layer.neptune.atmosphere', color: '#384898', deepColor: '#283068', r: 140 },
    { key: 'layer.neptune.iceMantle', color: '#2E5858', deepColor: '#1E3838', r: 100 },
    { key: 'layer.neptune.core', color: '#606060', deepColor: '#404040', r: 35 },
  ],
  sun: [
    { key: 'sun.layer.corona', color: '#E8D0A0', deepColor: '#C8B080', r: 140 },
    { key: 'sun.layer.chromosphere', color: '#D85840', deepColor: '#A84030', r: 125 },
    { key: 'sun.layer.photosphere', color: '#E8C050', deepColor: '#C8A040', r: 115 },
    { key: 'sun.layer.convective', color: '#D87820', deepColor: '#A85810', r: 100 },
    { key: 'sun.layer.radiative', color: '#D85800', deepColor: '#A04000', r: 75 },
    { key: 'sun.layer.core', color: '#F0E8D0', deepColor: '#E0D0B0', r: 35 },
  ],

  // === Moons ===
  earth_moon_0: [
    { key: 'layer.moon.crust', color: '#787878', deepColor: '#585858', r: 140 },
    { key: 'layer.moon.upperMantle', color: '#6A5E4A', deepColor: '#4A4030', r: 120 },
    { key: 'layer.moon.lowerMantle', color: '#786848', deepColor: '#584830', r: 85 },
    { key: 'layer.moon.innerCore', color: '#B08838', deepColor: '#886828', r: 40 },
  ],
  jupiter_moon_0: [ // Io
    { key: 'layer.io.crust', color: '#C8A030', deepColor: '#A08020', r: 140 },
    { key: 'layer.io.mantle', color: '#8A4828', deepColor: '#6A3418', r: 110 },
    { key: 'layer.io.core', color: '#C89030', deepColor: '#A07020', r: 50 },
  ],
  jupiter_moon_1: [ // Europa
    { key: 'layer.europa.iceShell', color: '#A8C0D8', deepColor: '#88A0B8', r: 140 },
    { key: 'layer.europa.ocean', color: '#285878', deepColor: '#184058', r: 115 },
    { key: 'layer.europa.mantle', color: '#786848', deepColor: '#584830', r: 80 },
    { key: 'layer.europa.core', color: '#B08838', deepColor: '#886828', r: 40 },
  ],
  jupiter_moon_2: [ // Ganymede
    { key: 'layer.ganymede.iceShell', color: '#A8B8C8', deepColor: '#8898A8', r: 140 },
    { key: 'layer.ganymede.ocean', color: '#285878', deepColor: '#184058', r: 115 },
    { key: 'layer.ganymede.mantle', color: '#786848', deepColor: '#584830', r: 80 },
    { key: 'layer.ganymede.core', color: '#C8A040', deepColor: '#A08030', r: 35 },
  ],
  jupiter_moon_3: [ // Callisto
    { key: 'layer.callisto.iceRock', color: '#605850', deepColor: '#403830', r: 140 },
    { key: 'layer.callisto.interior', color: '#4A4038', deepColor: '#302820', r: 95 },
    { key: 'layer.callisto.core', color: '#786848', deepColor: '#584830', r: 40 },
  ],
  saturn_moon_0: [ // Titan
    { key: 'layer.titan.atmosphere', color: '#C08830', deepColor: '#A06820', r: 140 },
    { key: 'layer.titan.iceShell', color: '#A0B0C0', deepColor: '#8090A0', r: 115 },
    { key: 'layer.titan.ocean', color: '#285878', deepColor: '#184058', r: 95 },
    { key: 'layer.titan.iceMantle', color: '#688090', deepColor: '#486070', r: 70 },
    { key: 'layer.titan.core', color: '#786848', deepColor: '#584830', r: 35 },
  ],
  saturn_moon_1: [ // Enceladus
    { key: 'layer.enceladus.iceShell', color: '#D8E0E8', deepColor: '#B8C8D8', r: 140 },
    { key: 'layer.enceladus.ocean', color: '#285878', deepColor: '#184058', r: 100 },
    { key: 'layer.enceladus.core', color: '#786848', deepColor: '#584830', r: 50 },
  ],

  // === Dwarf Planets ===
  pluto: [
    { key: 'layer.pluto.nitrogenIce', color: '#B0A090', deepColor: '#908070', r: 140 },
    { key: 'layer.pluto.waterIce', color: '#7898B0', deepColor: '#587888', r: 105 },
    { key: 'layer.pluto.core', color: '#786848', deepColor: '#584830', r: 55 },
  ],
  ceres: [
    { key: 'layer.ceres.regolith', color: '#787870', deepColor: '#585850', r: 140 },
    { key: 'layer.ceres.iceMantle', color: '#689098', deepColor: '#487078', r: 100 },
    { key: 'layer.ceres.core', color: '#786848', deepColor: '#584830', r: 50 },
  ],
  eris: [
    { key: 'layer.eris.methaneIce', color: '#A0A0B0', deepColor: '#808090', r: 140 },
    { key: 'layer.eris.waterIce', color: '#7898B0', deepColor: '#587888', r: 100 },
    { key: 'layer.eris.core', color: '#786848', deepColor: '#584830', r: 50 },
  ],
  haumea: [
    { key: 'layer.haumea.surface', color: '#C0B8B0', deepColor: '#A09888', r: 140 },
    { key: 'layer.haumea.iceMantle', color: '#7898B0', deepColor: '#587888', r: 100 },
    { key: 'layer.haumea.core', color: '#786848', deepColor: '#584830', r: 50 },
  ],
  makemake: [
    { key: 'layer.makemake.methaneIce', color: '#B89878', deepColor: '#987858', r: 140 },
    { key: 'layer.makemake.waterIce', color: '#7898B0', deepColor: '#587888', r: 100 },
    { key: 'layer.makemake.core', color: '#786848', deepColor: '#584830', r: 50 },
  ],
};
