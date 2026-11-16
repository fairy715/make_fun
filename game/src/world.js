// The rules of a run: seven nights, harbour trust, score and combo. A night steps forward one
// fixed step at a time from the keeper's input and reports what happened as events, which the
// sound and the renderer react to. No drawing and no browser here, so the balance simulation
// runs the same rules in Node.
(function (LK) {
  'use strict';

  /**
   * Run modes. The gale is the main game: the whole sea runs faster while the keeper's lamp keeps
   * its own pace. The calm (internally 'normal') is the gentler watch for a first evening.
   */
  const MODES = {
    gale: { name: 'Gale watch', pace: 1.6, scoreScale: 1.5 },
    normal: { name: 'Calm watch', pace: 1, scoreScale: 1 },
  };

  function createRun(seed, mode) {
    const m = MODES[mode] ? mode : 'gale';
    return {
      seed,
      mode: m,
      pace: MODES[m].pace,
      scoreScale: MODES[m].scoreScale,
      rng: LK.createRng(LK.hashSeed('run:' + seed)),
      nightIndex: 0,
      score: 0,
      trust: LK.TRUST.start,
      maxTrust: LK.TRUST.start,
      lifeboats: 0,
      upgrades: {},
      combo: 1,
      bestCombo: 1,
      totals: { docked: 0, wrecked: 0, rescued: 0, plundered: 0, chased: 0, repelled: 0, flawless: 0 },
    };
  }

  function startNight(run) {
    const def = LK.NIGHTS[run.nightIndex];
    const rng = LK.createRng(LK.hashSeed('night:' + run.seed + ':' + run.nightIndex));
    const sea = LK.buildSea(rng, def);
    const stats = LK.lampStats(run);
    const night = {
      def,
      index: run.nightIndex,
      rng,
      stats,
      t: 0,
      arrivals: sea.arrivals,
      nextArrival: 0,
      reefs: sea.reefs,
      icebergs: sea.icebergs,
      fogs: sea.fogs,
      monsters: sea.monsters,
      balls: [],
      ships: [],
      nextId: 1,
      lamp: LK.createLamp(stats),
      hornCooldown: 0,
      hornFlash: 0,
      counts: { docked: 0, wrecked: 0, rescued: 0, plundered: 0, chased: 0, repelled: 0, merchants: def.ships },
      over: false,
      obstacles: [],
    };
    night.inFog = (x, y) => night.fogs.some((f) => Math.hypot(x - f.x, y - f.y) < f.r * 0.85);
    refreshObstacles(night);
    return night;
  }

  function refreshObstacles(night) {
    night.obstacles = night.reefs.concat(night.icebergs, [LK.CAPE]);
  }

  /** Moves fog banks and icebergs; icebergs bounce inside the open water. */
  function driftSea(night, dt) {
    const { VIEW, FIELD_TOP, FIELD_BOTTOM } = LK;
    for (const f of night.fogs) {
      f.x += f.vx * dt;
      if (f.x > VIEW.width + f.r) f.x = -f.r;
      if (f.x < -f.r) f.x = VIEW.width + f.r;
    }
    for (const ice of night.icebergs) {
      ice.x += ice.vx * dt;
      ice.y += ice.vy * dt;
      ice.spin += 0.05 * dt;
      if (ice.x < 90 || ice.x > VIEW.width - 90) ice.vx = -ice.vx;
      if (ice.y < FIELD_TOP + 20 || ice.y > FIELD_BOTTOM - 40) ice.vy = -ice.vy;
    }
  }

  function loseTrust(run, night, events, cause, ship) {
    run.combo = 1;
    if (cause === 'wreck' && run.lifeboats > 0) {
      run.lifeboats -= 1;
      night.counts.rescued += 1;
      run.totals.rescued += 1;
      events.push({ type: 'rescued', x: ship.x, y: ship.y });
      return;
    }
    run.trust -= 1;
    events.push({ type: 'trustLost', cause });
  }

  /** A merchant lost to rocks, cannon or the thing below: a lifeboat saves the crew if one is ready. */
  function sinkShip(run, night, ship, cause, events) {
    ship.state = 'wrecked';
    ship.cause = cause;
    night.counts.wrecked += 1;
    run.totals.wrecked += 1;
    events.push({ type: 'wreck', x: ship.x, y: ship.y, kind: ship.kind, cause });
    loseTrust(run, night, events, 'wreck', ship);
  }

  function dock(run, night, ship, events) {
    const { SCORE } = LK;
    ship.state = 'docked';
    let points = ship.type.points * run.combo;
    let quick = false;
    if (ship.kind === 'clipper' && ship.age < SCORE.clipperTime) {
      points += SCORE.clipperQuickBonus;
      quick = true;
    }
    points = Math.round(points * run.scoreScale);
    run.score += points;
    night.counts.docked += 1;
    run.totals.docked += 1;
    night.lamp.oil = Math.min(night.lamp.oilMax, night.lamp.oil + ship.type.oil);
    events.push({ type: 'dock', x: ship.x, y: ship.y, points, combo: run.combo, quick, kind: ship.kind });
    run.combo = Math.min(SCORE.comboMax, run.combo + SCORE.comboStep);
    run.bestCombo = Math.max(run.bestCombo, run.combo);
  }

  /**
   * One fixed step of the night. input: { aim: angle or null, turn: -1..1, focus: bool, horn: bool }.
   * Returns the events of the step.
   */
  function stepNight(run, night, input, dt) {
    const events = [];
    if (night.over) return events;
    // The sea moves at the run's pace; the lamp, the foghorn and the keeper's light keep real time.
    const keeperDt = dt;
    dt *= run.pace;
    night.t += dt;
    const lamp = night.lamp;
    if (input.aim !== null && input.aim !== undefined) lamp.target = input.aim;
    if (input.turn) lamp.target = LK.clampAngle(lamp.target + input.turn * night.stats.turnSpeed * keeperDt);
    LK.updateLamp(lamp, night.stats, input.focus, keeperDt);

    // The foghorn: every ship drops anchor for a moment.
    night.hornCooldown = Math.max(0, night.hornCooldown - keeperDt);
    night.hornFlash = Math.max(0, night.hornFlash - keeperDt);
    if (input.horn && night.hornCooldown <= 0) {
      night.hornCooldown = night.stats.hornCooldown;
      night.hornFlash = 1.2;
      for (const ship of night.ships) if (ship.state === 'sail') ship.halt = night.stats.hornHalt;
      events.push({ type: 'horn' });
    }

    while (night.nextArrival < night.arrivals.length && night.arrivals[night.nextArrival].t <= night.t) {
      const arrival = night.arrivals[night.nextArrival++];
      const ship = LK.createShip(night.nextId++, arrival);
      night.ships.push(ship);
      events.push({ type: 'arrive', kind: ship.kind, x: ship.x, y: ship.y });
    }

    driftSea(night, dt);

    // What the beam touches: rocks it outlines, ships it guides, smugglers it exposes.
    for (const o of night.reefs.concat(night.icebergs)) {
      if (LK.isLit(lamp, o.x, o.y, o.r, night.inFog(o.x, o.y))) {
        if (!o.seen) events.push({ type: 'spotted', x: o.x, y: o.y });
        o.seen = true;
        o.reveal = night.stats.revealLinger;
      } else {
        o.reveal = Math.max(0, o.reveal - keeperDt);
      }
    }

    for (const ship of night.ships) {
      if (ship.state !== 'sail' && ship.state !== 'fleeing') continue;
      ship.lit = LK.isLit(lamp, ship.x, ship.y, ship.r, night.inFog(ship.x, ship.y));
      ship.focusLit = ship.lit && lamp.focused;
      if (ship.kind === 'smuggler' || ship.kind === 'pirate') {
        if (ship.lit && ship.state === 'sail') {
          ship.exposed += keeperDt;
          const needed = ship.kind === 'pirate' ? LK.PIRATE.exposeTime * (night.stats.exposeTime / LK.SMUGGLER.exposeTime) : night.stats.exposeTime;
          if (ship.exposed >= needed) {
            ship.state = 'fleeing';
            const points = Math.round(ship.type.points * run.scoreScale);
            run.score += points;
            night.counts.chased += 1;
            run.totals.chased += 1;
            events.push({ type: 'chased', x: ship.x, y: ship.y, points, kind: ship.kind });
          }
        }
      } else if (ship.lit) {
        ship.guide = night.stats.guideMemory;
      }
      LK.sailShip(ship, night, dt);
    }

    LK.fireCannons(night, events, dt);
    for (const ship of LK.moveBalls(night, events, dt)) sinkShip(run, night, ship, 'cannon', events);
    LK.updateMonsters(run, night, events, dt, (ship) => sinkShip(run, night, ship, 'monster', events), keeperDt);

    for (const ship of night.ships) {
      if (ship.state === 'fleeing') {
        if (ship.x < -60 || ship.x > LK.VIEW.width + 60) ship.state = 'gone';
        continue;
      }
      if (ship.state !== 'sail' || ship.kind === 'pirate') continue;
      if (ship.kind === 'smuggler') {
        for (const prey of night.ships) {
          if (prey.state !== 'sail' || prey.kind === 'smuggler') continue;
          if (Math.hypot(prey.x - ship.x, prey.y - ship.y) < prey.r + ship.r) {
            prey.state = 'plundered';
            ship.state = 'fleeing';
            night.counts.plundered += 1;
            run.totals.plundered += 1;
            events.push({ type: 'plunder', x: prey.x, y: prey.y });
            loseTrust(run, night, events, 'plunder', prey);
            break;
          }
        }
        continue;
      }
      const h = ship.harbor;
      if (Math.hypot(h.gateX - ship.x, h.gateY - ship.y) < h.gateRadius) {
        dock(run, night, ship, events);
        continue;
      }
      const rock = LK.strikes(ship, night.obstacles);
      if (rock) {
        rock.reveal = night.stats.revealLinger;
        rock.seen = true;
        sinkShip(run, night, ship, rock.kind, events);
      }
    }

    if (run.trust <= 0) {
      night.over = true;
      events.push({ type: 'gameOver' });
      return events;
    }
    // With no merchant left to hunt, smugglers and raiders slip away (scoring nothing).
    const merchantsLeft = night.ships.some((s) => s.state === 'sail' && s.harbor) || night.arrivals.slice(night.nextArrival).some((a) => a.harbor);
    if (!merchantsLeft) {
      for (const ship of night.ships) if (ship.state === 'sail' && !ship.harbor) ship.state = 'fleeing';
    }
    const allArrived = night.nextArrival >= night.arrivals.length;
    const anyAfloat = night.ships.some((s) => s.state === 'sail' || s.state === 'fleeing');
    if (allArrived && !anyAfloat) {
      night.over = true;
      finishNight(run, night, events);
    }
    return events;
  }

  function finishNight(run, night, events) {
    const { SCORE } = LK;
    const bonus = Math.round(SCORE.nightBonus * (night.index + 1) * run.scoreScale);
    const flawless = night.counts.wrecked === 0 && night.counts.plundered === 0 && night.counts.rescued === 0;
    const flawlessBonus = flawless ? Math.round(SCORE.flawlessBonus * run.scoreScale) : 0;
    run.score += bonus + flawlessBonus;
    if (flawless) run.totals.flawless += 1;
    night.result = { bonus, flawless, flawlessBonus };
    events.push({ type: 'nightClear', flawless, last: night.index === LK.NIGHTS.length - 1 });
  }

  /** After a night is cleared: the next night's number, or null once the seventh is survived. */
  function advanceRun(run) {
    run.nightIndex += 1;
    return run.nightIndex < LK.NIGHTS.length ? run.nightIndex : null;
  }

  LK.MODES = MODES;
  LK.createRun = createRun;
  LK.startNight = startNight;
  LK.stepNight = stepNight;
  LK.advanceRun = advanceRun;
})((globalThis.LK = globalThis.LK || {}));
