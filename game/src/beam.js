// The lighthouse beam: where it points, how wide and far it shines, and what it lights.
(function (LK) {
  'use strict';

  function createLamp(stats) {
    return {
      angle: -Math.PI / 2, // straight out to sea
      target: -Math.PI / 2,
      focused: false,
      oil: stats.oilMax,
      oilMax: stats.oilMax,
      halfWidth: stats.halfWidth,
      reach: stats.reach,
    };
  }

  /** Keeps an aim inside the bay: aims behind the cape fold back to the nearest edge. */
  function clampAngle(angle) {
    const { BEAM } = LK;
    if (angle > Math.PI / 2) return BEAM.minAngle;
    if (angle >= 0) return BEAM.maxAngle;
    return Math.min(BEAM.maxAngle, Math.max(BEAM.minAngle, angle));
  }

  /** The angle from the lamp to a point of the field. */
  function aimAt(x, y) {
    return clampAngle(Math.atan2(y - LK.LIGHTHOUSE.y, x - LK.LIGHTHOUSE.x));
  }

  /**
   * Swings the lamp toward its target, burns or refills oil, and eases the beam's shape.
   * wantFocus: the keeper holds the focus button.
   */
  function updateLamp(lamp, stats, wantFocus, dt) {
    const { BEAM } = LK;
    const delta = lamp.target - lamp.angle;
    const maxTurn = stats.turnSpeed * dt;
    lamp.angle += Math.max(-maxTurn, Math.min(maxTurn, delta));
    lamp.focused = wantFocus && lamp.oil > 0;
    if (lamp.focused) lamp.oil = Math.max(0, lamp.oil - BEAM.focusDrain * dt);
    else lamp.oil = Math.min(lamp.oilMax, lamp.oil + BEAM.idleRefill * dt);
    const goalWidth = lamp.focused ? stats.focusHalfWidth : stats.halfWidth;
    const goalReach = lamp.focused ? stats.focusReach : stats.reach;
    const ease = 1 - Math.exp(-12 * dt);
    lamp.halfWidth += (goalWidth - lamp.halfWidth) * ease;
    lamp.reach += (goalReach - lamp.reach) * ease;
  }

  /** Whether a point (with a radius) is in the beam; inFog cuts how far the light gets. */
  function isLit(lamp, x, y, radius, inFog) {
    const { LIGHTHOUSE, BEAM } = LK;
    const r = radius || 0;
    const dx = x - LIGHTHOUSE.x;
    const dy = y - LIGHTHOUSE.y;
    const dist = Math.hypot(dx, dy);
    const reach = lamp.reach * (inFog ? BEAM.fogReach : 1);
    if (dist - r > reach) return false;
    if (dist < 40) return true;
    let diff = Math.atan2(dy, dx) - lamp.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= lamp.halfWidth + Math.atan2(r, dist);
  }

  LK.createLamp = createLamp;
  LK.clampAngle = clampAngle;
  LK.aimAt = aimAt;
  LK.updateLamp = updateLamp;
  LK.isLit = isLit;
})((globalThis.LK = globalThis.LK || {}));
