// A computer keeper: the screenshot scenes and the balance simulation play the real rules with it.
// skill: { react: seconds between re-thinking, aimError: radians of sloppy aim, horn: whether it
// uses the foghorn, focus: whether it focuses the beam on far ships }.
(function (LK) {
  'use strict';

  const SKILLS = {
    novice: { react: 0.9, aimError: 0.22, horn: false, focus: false },
    casual: { react: 0.55, aimError: 0.12, horn: true, focus: false },
    skilled: { react: 0.3, aimError: 0.06, horn: true, focus: true },
    expert: { react: 0.15, aimError: 0.03, horn: true, focus: true },
  };

  /** Seconds until the ship, on its current heading, reaches an obstacle (Infinity when clear). */
  function timeToRock(ship, night) {
    const speed = Math.max(ship.type.speed * 0.8, 1);
    for (let t = 0.25; t <= 3; t += 0.25) {
      const x = ship.x + Math.cos(ship.heading) * speed * t;
      const y = ship.y + Math.sin(ship.heading) * speed * t;
      for (const o of night.obstacles) if (Math.hypot(o.x - x, o.y - y) < o.r + ship.r) return t;
    }
    return Infinity;
  }

  /** How badly a ship needs the light right now. */
  function need(ship, night) {
    if (ship.kind === 'pirate') {
      if (ship.state !== 'sail' || ship.x < 0 || ship.x > LK.VIEW.width) return -1;
      const preyDist = ship.prey ? Math.hypot(ship.prey.x - ship.x, ship.prey.y - ship.y) : Infinity;
      return preyDist < LK.PIRATE.range + 40 ? 2.6 + (ship.reload < 1 ? 1 : 0) : 0.8;
    }
    if (ship.kind === 'smuggler') {
      if (ship.state !== 'sail') return -1;
      let nearest = Infinity;
      for (const s of night.ships) if (s.state === 'sail' && s.kind !== 'smuggler') nearest = Math.min(nearest, Math.hypot(s.x - ship.x, s.y - ship.y));
      return ship.x > 0 && ship.x < LK.VIEW.width && ship.y > 0 ? 2.2 + 200 / (nearest + 60) : -1;
    }
    if (ship.state !== 'sail') return -1;
    if (ship.y < -10 || ship.x < -10 || ship.x > LK.VIEW.width + 10) return 0.1;
    const rock = timeToRock(ship, night);
    let value = 0.3 + Math.abs(ship.drift) * 0.8 + (rock < 3 ? (3.2 - rock) * 0.9 : 0);
    if (ship.guide > 0.35) value -= 0.9;
    return value;
  }

  function createAutopilot(skillName, seed) {
    return { skill: SKILLS[skillName] || SKILLS.skilled, rng: LK.createRng(seed >>> 0), clock: 0, target: null, aim: -Math.PI / 2, wobble: 0 };
  }

  /** The keeper's input for this step. */
  function autopilotInput(pilot, night, dt) {
    const skill = pilot.skill;
    pilot.clock -= dt;
    if (pilot.clock <= 0) {
      pilot.clock = skill.react * (0.7 + 0.6 * pilot.rng.next());
      let best = null;
      let bestNeed = 0;
      for (const ship of night.ships) {
        const value = need(ship, night);
        if (value > bestNeed) {
          bestNeed = value;
          best = ship;
        }
      }
      pilot.target = best;
      pilot.wobble = pilot.rng.gauss() * skill.aimError;
    }
    const input = { aim: null, turn: 0, focus: false, horn: false };
    const target = pilot.target && (pilot.target.state === 'sail' || pilot.target.state === 'fleeing') ? pilot.target : null;
    // Rising green eyes come first, once the keeper has had time to notice them.
    const rising = night.monsters.find((m) => m.state === 'rise' && m.timer < LK.MONSTER.riseTime - skill.react * 0.8);
    if (rising) {
      input.aim = LK.aimAt(rising.x, rising.y) + pilot.wobble * 0.5;
      const dist = Math.hypot(rising.x - LK.LIGHTHOUSE.x, rising.y - LK.LIGHTHOUSE.y);
      input.focus = skill.focus && dist > night.lamp.reach * 0.92 && night.lamp.oil > 5;
    } else if (target) {
      input.aim = LK.aimAt(target.x, target.y) + pilot.wobble;
      const dist = Math.hypot(target.x - LK.LIGHTHOUSE.x, target.y - LK.LIGHTHOUSE.y);
      input.focus = skill.focus && dist > night.lamp.reach * 0.92 && night.lamp.oil > 15;
    } else {
      input.aim = -Math.PI / 2 + Math.sin(night.t * 0.6) * 1.1;
    }
    if (skill.horn && night.hornCooldown <= 0) {
      let urgent = 0;
      for (const ship of night.ships) {
        if (ship.state === 'sail' && ship.kind !== 'smuggler' && ship.guide <= 0 && timeToRock(ship, night) < 1) urgent++;
      }
      input.horn = urgent >= 2;
    }
    return input;
  }

  /** Picks an upgrade from an offer the way a sensible keeper would. */
  function autopilotPick(offer, run, rng) {
    const order = ['lens', 'gears', 'wick', 'lifeboat', 'roof', 'afterglow', 'pilots', 'spyglass', 'horn', 'cistern'];
    if (run.trust <= 1 && offer.includes('roof')) return 'roof';
    const sorted = offer.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return rng.next() < 0.75 ? sorted[0] : offer[Math.floor(rng.next() * offer.length)];
  }

  LK.SKILLS = SKILLS;
  LK.createAutopilot = createAutopilot;
  LK.autopilotInput = autopilotInput;
  LK.autopilotPick = autopilotPick;
})((globalThis.LK = globalThis.LK || {}));
