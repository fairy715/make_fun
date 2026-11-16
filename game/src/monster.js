// The thing below. It rests, then swims unseen toward the nearest merchant. Beside it, it rises:
// ripples and two green eyes give the keeper a moment's warning. Light on it while it rises sends
// it diving away (and scores); unlit when the moment ends, it drags the ship under.
(function (LK) {
  'use strict';

  function clampToBay(m) {
    m.x = Math.max(60, Math.min(LK.VIEW.width - 60, m.x));
    m.y = Math.max(LK.FIELD_TOP - 20, Math.min(LK.FIELD_BOTTOM + 10, m.y));
  }

  function pickPrey(m, night) {
    let best = null;
    let bestDist = Infinity;
    for (const ship of night.ships) {
      if (ship.state !== 'sail' || !ship.harbor || ship.y < 30) continue;
      const d = Math.hypot(ship.x - m.x, ship.y - m.y);
      if (d < bestDist) {
        bestDist = d;
        best = ship;
      }
    }
    return best;
  }

  function swimToward(m, x, y, speed, dt) {
    const want = Math.atan2(y - m.y, x - m.x);
    const delta = LK.wrapAngle(want - m.heading);
    m.heading = LK.wrapAngle(m.heading + Math.max(-2 * dt, Math.min(2 * dt, delta)));
    m.x += Math.cos(m.heading) * speed * dt;
    m.y += Math.sin(m.heading) * speed * dt;
  }

  /** One step of every monster. onGrab(ship) sinks a ship it drags under. */
  function updateMonsters(run, night, events, dt, onGrab) {
    const { MONSTER } = LK;
    for (const m of night.monsters) {
      m.swim += dt;
      m.timer -= dt;
      if (m.state === 'rest') {
        m.x += Math.cos(m.swim * 0.4) * 8 * dt;
        m.y += Math.sin(m.swim * 0.3) * 6 * dt;
        if (m.timer <= 0) m.state = 'lurk';
      } else if (m.state === 'lurk') {
        if (!m.target || m.target.state !== 'sail') m.target = pickPrey(m, night);
        if (m.target) {
          swimToward(m, m.target.x, m.target.y, MONSTER.speed, dt);
          if (Math.hypot(m.target.x - m.x, m.target.y - m.y) < MONSTER.riseRange) {
            m.state = 'rise';
            m.timer = MONSTER.riseTime;
            m.lightOn = 0;
            events.push({ type: 'monsterRise', x: m.x, y: m.y });
          }
        } else {
          m.x += Math.cos(m.swim * 0.5) * 12 * dt;
        }
      } else if (m.state === 'rise') {
        if (m.target && m.target.state === 'sail') swimToward(m, m.target.x, m.target.y, MONSTER.speed * 0.6, dt);
        if (LK.isLit(night.lamp, m.x, m.y, MONSTER.radius, night.inFog(m.x, m.y))) m.lightOn += dt;
        if (m.lightOn >= MONSTER.repelTime) {
          m.state = 'dive';
          m.timer = 1.3;
          m.heading = Math.atan2(m.y - LK.LIGHTHOUSE.y, m.x - LK.LIGHTHOUSE.x);
          run.score += MONSTER.points;
          night.counts.repelled += 1;
          run.totals.repelled += 1;
          events.push({ type: 'monsterRepelled', x: m.x, y: m.y, points: MONSTER.points });
        } else if (m.timer <= 0) {
          const prey = m.target;
          if (prey && prey.state === 'sail' && Math.hypot(prey.x - m.x, prey.y - m.y) < MONSTER.grabRange) {
            events.push({ type: 'monsterGrab', x: prey.x, y: prey.y });
            onGrab(prey);
          }
          m.state = 'rest';
          m.timer = MONSTER.rest * 0.8;
          m.target = null;
        }
      } else if (m.state === 'dive') {
        m.x += Math.cos(m.heading) * MONSTER.speed * 2.2 * dt;
        m.y += Math.sin(m.heading) * MONSTER.speed * 2.2 * dt;
        if (m.timer <= 0) {
          m.state = 'rest';
          m.timer = MONSTER.rest;
          m.target = null;
        }
      }
      clampToBay(m);
    }
  }

  LK.updateMonsters = updateMonsters;
})((globalThis.LK = globalThis.LK || {}));
