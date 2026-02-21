/**
 * Mission panel UI — displays NASA mission info, timeline, and mission HUD overlay.
 */
import { MISSIONS } from '../data/missions.js';
import { getLang, t } from '../i18n/i18n.js';
import { getWaypointProgressPositions } from '../scene/OrbitalMechanics.js';
import { escapeHTML, sanitizeHTML } from '../utils/sanitize.js';

export function renderMissionList() {
  const lang = getLang();
  let html = `<div class="mission-list">`;

  for (const mission of MISSIONS) {
    const status = lang === 'tr' ? mission.statusTr : mission.status;
    const desc = lang === 'tr' ? mission.descriptionTr : mission.description;
    const isActive = mission.status.startsWith('Active');

    html += `
      <div class="mission-card" data-mission-id="${escapeHTML(mission.id)}" style="--mission-color:${mission.color};">
        <div class="mission-card-indicator" style="background: ${mission.color}; color: ${mission.color};"></div>
        <div class="mission-card-body">
          <div class="mission-card-header">
            <h3 class="mission-card-name">${escapeHTML(mission.name)}</h3>
            <span class="mission-card-year">${escapeHTML(mission.launchDate.slice(0, 4))}</span>
          </div>
          <p class="mission-card-desc">${sanitizeHTML(desc)}</p>
          <div class="mission-card-status ${isActive ? 'active' : 'ended'}">
            ${escapeHTML(status)}
          </div>
        </div>
      </div>`;
  }

  html += `</div>`;
  return html;
}

export function renderMissionDetail(missionId) {
  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission) return '';

  const lang = getLang();
  let html = '';

  // Header
  html += `
    <div class="mission-detail-header">
      <button class="mission-back-btn" id="mission-back">&larr; ${escapeHTML(t('missions.title'))}</button>
      <h2 style="color: ${mission.color};">${escapeHTML(mission.name)}</h2>
      <div class="mission-detail-status">${escapeHTML(lang === 'tr' ? mission.statusTr : mission.status)}</div>
    </div>`;

  // Description
  html += `<p class="mission-detail-desc">${sanitizeHTML(lang === 'tr' ? mission.descriptionTr : mission.description)}</p>`;

  // Timeline
  html += `<div class="mission-timeline">
    <h3>${t('missions.timeline')}</h3>`;

  for (let i = 0; i < mission.waypoints.length; i++) {
    const wp = mission.waypoints[i];
    const eventText = lang === 'tr' ? wp.eventTr : wp.event;
    const date = new Date(wp.date);
    const dateStr = date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    html += `
      <div class="timeline-event" data-waypoint-index="${i}" data-mission-id="${escapeHTML(mission.id)}">
        <div class="timeline-dot" style="background: ${mission.color};"></div>
        <div class="timeline-line" ${i === mission.waypoints.length - 1 ? 'style="display:none;"' : ''}></div>
        <div class="timeline-content">
          <div class="timeline-date">${escapeHTML(dateStr)}</div>
          <div class="timeline-event-name">${escapeHTML(eventText)}</div>`;

    // Facts
    const facts = lang === 'tr' ? wp.factsTr : wp.facts;
    if (facts && facts.length > 0) {
      html += `<ul class="timeline-facts">`;
      for (const fact of facts) {
        html += `<li>${sanitizeHTML(fact)}</li>`;
      }
      html += `</ul>`;
    }

    html += `</div></div>`;
  }

  html += `</div>`;
  return html;
}

/**
 * Render the mission HUD overlay with timeline scrubber and controls.
 * This is a separate floating overlay at the bottom of the screen.
 */
export function renderMissionHUD(missionId) {
  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission) return '';

  const lang = getLang();

  // RES-4: Wrap trajectory calculation in try/catch so one bad mission
  // doesn't block the whole HUD from rendering.
  let waypointPositions;
  try {
    waypointPositions = getWaypointProgressPositions(missionId);
  } catch (err) {
    console.warn('[MissionPanel] Trajectory calculation failed, showing text-only view:', err);
    // Return a graceful fallback with mission info but no interactive scrubber
    return `
      <div class="mission-hud" id="mission-hud">
        <div class="mission-hud-header">
          <h3 style="color: ${mission.color};">${escapeHTML(mission.name)}</h3>
          <button class="mission-hud-close" id="mission-hud-close" title="${escapeHTML(t('missions.exitMission') || 'Exit Mission')}">&times;</button>
        </div>
        <p class="mission-hud-error">${escapeHTML(lang === 'tr' ? mission.descriptionTr : mission.description)}</p>
        <div class="mission-controls">
          <button class="mission-control-btn" id="mission-exit-btn">${escapeHTML(t('missions.exitMission') || 'Exit')}</button>
        </div>
      </div>`;
  }

  // Build waypoint dots HTML
  let dotsHtml = '';
  for (let i = 0; i < waypointPositions.length; i++) {
    const wp = mission.waypoints[i];
    const pct = (waypointPositions[i] * 100).toFixed(1);
    const eventText = lang === 'tr' ? (wp.eventTr || wp.event) : wp.event;
    dotsHtml += `<div class="timeline-waypoint-dot"
      style="left: ${pct}%; background: ${mission.color}; color: ${mission.color};"
      data-waypoint-index="${i}"
      title="${escapeHTML(eventText)}"></div>`;
  }

  return `
    <div class="mission-hud" id="mission-hud">
      <div class="mission-hud-header">
        <h3 style="color: ${mission.color};">${escapeHTML(mission.name)}</h3>
        <span class="mission-hud-date" id="mission-hud-date">${escapeHTML(mission.launchDate)}</span>
        <button class="mission-hud-close" id="mission-hud-close" title="${escapeHTML(t('missions.exitMission') || 'Exit Mission')}">&times;</button>
      </div>
      <div class="timeline-scrubber" id="timeline-scrubber">
        <div class="timeline-track" id="timeline-track"
          role="slider" tabindex="0"
          aria-label="${escapeHTML(mission.name)} ${t('missions.timeline') || 'timeline progress'}"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
          aria-orientation="horizontal">
          <div class="timeline-fill" id="timeline-fill" style="background: ${mission.color}; width: 0%;"></div>
          ${dotsHtml}
          <div class="timeline-playhead" id="timeline-playhead" style="left: 0%;"></div>
        </div>
      </div>
      <div class="mission-controls">
        <button class="mission-control-btn" id="mission-play-btn" title="${t('missions.play')}">&#9654;</button>
        <button class="mission-control-btn" id="mission-speed-btn" title="${t('missions.speed') || 'Speed'}">
          <span id="mission-speed-label">1x</span>
        </button>
        <button class="mission-control-btn" id="mission-camera-btn" title="${t('missions.camera') || 'Camera Follow'}">
          &#127909; ${t('missions.camera') || 'Follow'}
        </button>
        <button class="mission-control-btn" id="mission-exit-btn" title="${t('missions.exitMission') || 'Exit Mission'}">
          ${t('missions.exitMission') || 'Exit'}
        </button>
      </div>
    </div>`;
}

/**
 * Render a floating waypoint info card.
 */
export function renderWaypointCard(missionId, waypointIndex) {
  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission || !mission.waypoints[waypointIndex]) return '';

  const lang = getLang();
  const wp = mission.waypoints[waypointIndex];
  const eventText = lang === 'tr' ? (wp.eventTr || wp.event) : wp.event;
  const date = new Date(wp.date);
  const dateStr = date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const facts = lang === 'tr' ? (wp.factsTr || wp.facts) : wp.facts;

  let factsHtml = '';
  if (facts && facts.length > 0) {
    factsHtml = `<ul class="waypoint-card-facts">`;
    for (const fact of facts) {
      factsHtml += `<li>${sanitizeHTML(fact)}</li>`;
    }
    factsHtml += `</ul>`;
  }

  return `
    <div class="waypoint-card" id="waypoint-card" style="border-color: ${mission.color};">
      <div class="waypoint-card-date">${escapeHTML(dateStr)}</div>
      <div class="waypoint-card-event" style="color: ${mission.color};">${escapeHTML(eventText)}</div>
      ${factsHtml}
    </div>`;
}
