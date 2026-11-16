// Black Sail raiders: they close to cannon range of the nearest merchant, circle it and fire.
// While the beam is on them their gunners are dazzled and cannot fire; held long enough in the
// light, they give up and run for open sea.
(function (LK) {
  'use strict';

  function nearestMerchant(ship, night) {
    let best = null;
    let bestDist = Infinity;
    for (const other of night.ships) {
      if (other.state !== 'sail' || !other.harbor) continue;
      const d = Math.hypot(other.x - ship.x, other.y - ship.y);
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
    return { prey: best, dist: bestDist };
  }

  /** One step of a raider's sailing: close in, then circle at stand-off range. */
  function sailPirate(ship, night, dt) {
    const { PIRATE, GUIDE, VIEW } = LK;
    let speed = ship.type.speed;
    let desired;
    if (ship.state === 'fleeing') {
      desired = ship.x < VIEW.width / 2 ? Math.PI : 0;
      speed *= PIRATE.fleeSpeed;
    } else {
      const { prey, dist } = nearestMerchant(ship, night);
      ship.prey = prey;
      if (!prey) {
        desired = Math.atan2(220 - ship.y, 640 - ship.x);
        speed *= 0.5;
      } else if (dist > PIRATE.standOff) {
        desired = Math.atan2(prey.y - ship.y, prey.x - ship.x);
      } else {
        // Broadside on: sail across the prey's bearing, keeping the range.
        desired = Math.atan2(prey.y - ship.y, prey.x - ship.x) + (ship.id % 2 ? 1 : -1) * 1.45;
        speed *= 0.55;
      }
      desired += avoidanceFor(ship, night, GUIDE.lookAhead);
    }
    if (ship.halt > 0) speed = 0;
    const delta = LK.wrapAngle(desired - ship.heading);
    ship.heading = LK.wrapAngle(ship.heading + Math.max(-1.4 * dt, Math.min(1.4 * dt, delta)));
    ship.x += Math.cos(ship.heading) * speed * dt;
    ship.y += Math.sin(ship.heading) * speed * dt;
  }

  function avoidanceFor(ship, night, lookAhead) {
    let steer = 0;
    for (const o of night.obstacles) {
      const gap = Math.hypot(o.x - ship.x, o.y - ship.y) - o.r - ship.r;
      if (gap > lookAhead) continue;
      const off = LK.wrapAngle(Math.atan2(o.y - ship.y, o.x - ship.x) - ship.heading);
      if (Math.abs(off) > 1.25) continue;
      steer -= (off === 0 ? 1 : Math.sign(off)) * Math.max(0, 1 - gap / lookAhead) * (1.6 - Math.abs(off));
    }
    return Math.max(-1.5, Math.min(1.5, steer));
  }

  /** Reloads and fires each raider's guns; a lit raider's gunners are dazzled and hold fire. */
  function fireCannons(night, events, dt) {
    const { PIRATE } = LK;
    for (const ship of night.ships) {
      if (ship.kind !== 'pirate' || ship.state !== 'sail') continue;
      if (ship.lit) continue;
      ship.reload -= dt;
      const prey = ship.prey;
      if (ship.reload > 0 || !prey || prey.state !== 'sail') continue;
      const dist = Math.hypot(prey.x - ship.x, prey.y - ship.y);
      if (dist > PIRATE.range) continue;
      // Leads the shot: aims where the prey will be when the ball arrives.
      const travel = dist / PIRATE.ballSpeed;
      const speed = prey.halt > 0 ? 0 : prey.type.speed * (prey.guide > 0 ? night.stats.guidedSpeed : LK.GUIDE.darkSpeed);
      const tx = prey.x + Math.cos(prey.heading) * speed * travel;
      const ty = prey.y + Math.sin(prey.heading) * speed * travel;
      const angle = Math.atan2(ty - ship.y, tx - ship.x) + night.rng.gauss() * PIRATE.spread;
      night.balls.push({ x: ship.x, y: ship.y, vx: Math.cos(angle) * PIRATE.ballSpeed, vy: Math.sin(angle) * PIRATE.ballSpeed, life: PIRATE.ballLife, from: ship.id });
      ship.reload = PIRATE.reload;
      ship.flash = 0.25;
      events.push({ type: 'cannon', x: ship.x, y: ship.y });
    }
  }

  /** Moves the cannonballs; one that meets a merchant sinks it. Returns the ships it sank. */
  function moveBalls(night, events, dt) {
    const sunk = [];
    for (const ball of night.balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.life -= dt;
      for (const ship of night.ships) {
        if (ship.state !== 'sail' || !ship.harbor) continue;
        if (Math.hypot(ship.x - ball.x, ship.y - ball.y) < ship.r + 5) {
          ball.life = 0;
          ball.hit = true;
          sunk.push(ship);
          break;
        }
      }
      if (ball.life <= 0 && !ball.hit) events.push({ type: 'splash', x: ball.x, y: ball.y });
    }
    night.balls = night.balls.filter((b) => b.life > 0);
    return sunk;
  }

  LK.sailPirate = sailPirate;
  LK.fireCannons = fireCannons;
  LK.moveBalls = moveBalls;
})((globalThis.LK = globalThis.LK || {}));
