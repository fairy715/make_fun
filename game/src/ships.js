// How ships sail. A merchant in the beam (or just out of it) knows the water: it holds its course
// for its quay and steers around rocks. One left in the dark loses its bearings: its heading
// drifts further off course the longer it stays unlit. A smuggler hunts the nearest merchant.
(function (LK) {
  'use strict';

  /** The rocky cape under the lighthouse, an obstacle like any reef. */
  const CAPE = { x: 640, y: 712, r: 118, kind: 'cape' };

  function createShip(id, arrival) {
    const type = LK.SHIP_TYPES[arrival.kind];
    const { x, y } = arrival.spawn;
    const target = arrival.harbor ? { x: arrival.harbor.gateX, y: arrival.harbor.gateY } : { x: 640, y: 360 };
    return {
      id,
      kind: arrival.kind,
      type,
      harbor: arrival.harbor,
      x,
      y,
      heading: Math.atan2(target.y - y, target.x - x),
      r: type.radius,
      drift: 0,
      guide: 2.5, // a ship sights the coast as it arrives
      lit: false,
      focusLit: false,
      halt: 0,
      age: 0,
      exposed: 0,
      reload: LK.PIRATE.firstShot,
      flash: 0,
      prey: null,
      state: 'sail', // sail, docked, wrecked, plundered, fleeing, gone
      wake: [],
      bob: id * 1.7,
    };
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /** A turn away from every rock ahead within look-ahead; positive turns clockwise. */
  function avoidance(ship, obstacles, lookAhead) {
    let steer = 0;
    for (const o of obstacles) {
      const dx = o.x - ship.x;
      const dy = o.y - ship.y;
      const gap = Math.hypot(dx, dy) - o.r - ship.r;
      if (gap > lookAhead) continue;
      const off = wrapAngle(Math.atan2(dy, dx) - ship.heading);
      if (Math.abs(off) > 1.25) continue;
      const strength = Math.min(1, Math.max(0, 1 - gap / lookAhead));
      const side = off === 0 ? 1 : Math.sign(off);
      steer -= side * strength * (1.6 - Math.abs(off));
    }
    return Math.max(-1.5, Math.min(1.5, steer));
  }

  /** Whether sailing `distance` along `angle` keeps the ship clear of every obstacle. */
  function laneClear(ship, obstacles, angle, distance) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (const o of obstacles) {
      const ox = o.x - ship.x;
      const oy = o.y - ship.y;
      const along = Math.max(0, Math.min(distance, ox * dx + oy * dy));
      const px = ox - dx * along;
      const py = oy - dy * along;
      if (px * px + py * py < (o.r + ship.r + 10) * (o.r + ship.r + 10)) return false;
    }
    return true;
  }

  /** The heading nearest `base` whose lane ahead is clear: how a ship that can see the rocks steers. */
  function clearHeading(ship, obstacles, base, distance) {
    if (laneClear(ship, obstacles, base, distance)) return base;
    const prefer = ship.lastSide || 1;
    for (let k = 1; k <= 12; k++) {
      for (const side of [prefer, -prefer]) {
        const angle = base + side * k * 0.13;
        if (laneClear(ship, obstacles, angle, distance)) {
          ship.lastSide = side;
          return angle;
        }
      }
    }
    return base + prefer * 1.6;
  }

  function turnToward(ship, desired, rate, dt) {
    const delta = wrapAngle(desired - ship.heading);
    ship.heading = wrapAngle(ship.heading + Math.max(-rate * dt, Math.min(rate * dt, delta)));
  }

  /** One step of a merchant ship's sailing. */
  function sailMerchant(ship, night, dt) {
    const { GUIDE, BEAM } = LK;
    const stats = night.stats;
    const gate = ship.harbor;
    const toGate = Math.atan2(gate.gateY - ship.y, gate.gateX - ship.x);
    let desired;
    let rate;
    if (ship.guide > 0) {
      ship.drift *= Math.exp(-2.6 * dt);
      const toHome = Math.hypot(gate.gateX - ship.x, gate.gateY - ship.y);
      desired = clearHeading(ship, night.obstacles, toGate + ship.drift, Math.min(GUIDE.lookAhead, toHome));
      rate = 2.2;
    } else {
      const storm = 1 + 0.6 * night.def.storm + (night.inFog(ship.x, ship.y) ? 0.5 : 0);
      ship.drift += night.rng.gauss() * GUIDE.wander * storm * Math.sqrt(dt);
      ship.drift = Math.max(-GUIDE.maxDrift, Math.min(GUIDE.maxDrift, ship.drift));
      desired = toGate + ship.drift;
      rate = 1.1;
    }
    // A ship wandering off the chart turns back toward the bay.
    if (ship.age > 4 && (ship.x < 10 || ship.x > LK.VIEW.width - 10 || ship.y < 4)) ship.drift *= 0.5;
    turnToward(ship, desired, rate, dt);
    let speed = ship.type.speed * (ship.guide > 0 ? stats.guidedSpeed : GUIDE.darkSpeed);
    if (ship.focusLit) speed *= BEAM.focusBoost;
    if (ship.halt > 0) speed = 0;
    ship.x += Math.cos(ship.heading) * speed * dt;
    ship.y += Math.sin(ship.heading) * speed * dt;
  }

  /** One step of a smuggler: chase the nearest merchant, or run for the edge once exposed. */
  function sailSmuggler(ship, night, dt) {
    const { SMUGGLER, GUIDE, VIEW } = LK;
    let desired = ship.heading;
    let speed = ship.type.speed;
    if (ship.state === 'fleeing') {
      desired = ship.x < VIEW.width / 2 ? Math.PI : 0;
      speed *= SMUGGLER.fleeSpeed;
    } else {
      let best = null;
      let bestDist = Infinity;
      for (const other of night.ships) {
        if (other.state !== 'sail' || other.kind === 'smuggler') continue;
        const d = Math.hypot(other.x - ship.x, other.y - ship.y);
        if (d < bestDist) {
          bestDist = d;
          best = other;
        }
      }
      if (best) {
        const lead = Math.min(1.2, bestDist / 120);
        const tx = best.x + Math.cos(best.heading) * best.type.speed * lead;
        const ty = best.y + Math.sin(best.heading) * best.type.speed * lead;
        desired = Math.atan2(ty - ship.y, tx - ship.x);
      } else {
        desired = Math.atan2(260 - ship.y, 640 - ship.x);
        speed *= 0.6;
      }
      desired += avoidance(ship, night.obstacles, GUIDE.lookAhead);
    }
    if (ship.halt > 0) speed = 0;
    turnToward(ship, desired, 2.2, dt);
    ship.x += Math.cos(ship.heading) * speed * dt;
    ship.y += Math.sin(ship.heading) * speed * dt;
  }

  function sailShip(ship, night, dt) {
    ship.age += dt;
    ship.halt = Math.max(0, ship.halt - dt);
    ship.guide = Math.max(0, ship.guide - dt);
    ship.flash = Math.max(0, ship.flash - dt);
    if (ship.kind === 'smuggler') sailSmuggler(ship, night, dt);
    else if (ship.kind === 'pirate') LK.sailPirate(ship, night, dt);
    else sailMerchant(ship, night, dt);
    // The wake: a short trail of recent positions, for drawing.
    ship.wakeClock = (ship.wakeClock || 0) + dt;
    if (ship.wakeClock > 0.12) {
      ship.wakeClock = 0;
      ship.wake.push({ x: ship.x, y: ship.y });
      if (ship.wake.length > 14) ship.wake.shift();
    }
  }

  /** Whether a ship has struck an obstacle; returns it or null. */
  function strikes(ship, obstacles) {
    for (const o of obstacles) {
      if (Math.hypot(o.x - ship.x, o.y - ship.y) < o.r + ship.r * 0.65) return o;
    }
    return null;
  }

  LK.CAPE = CAPE;
  LK.createShip = createShip;
  LK.sailShip = sailShip;
  LK.strikes = strikes;
  LK.wrapAngle = wrapAngle;
})((globalThis.LK = globalThis.LK || {}));
