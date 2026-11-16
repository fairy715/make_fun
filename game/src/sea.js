// Lays out one night's sea from its seed: when and where each ship arrives, the reefs (half of
// them dropped across the ships' own lanes, so a ship left in the dark finds them), drifting fog
// banks and icebergs.
(function (LK) {
  'use strict';

  const FIELD_TOP = 110;
  const FIELD_BOTTOM = 560;

  /** An arrival point on the top or side edges, just outside the view. */
  function edgePoint(rng, side) {
    const { VIEW } = LK;
    if (side === 'top') return { x: rng.range(90, VIEW.width - 90), y: -26, side };
    if (side === 'left') return { x: -26, y: rng.range(50, 360), side };
    return { x: VIEW.width + 26, y: rng.range(50, 360), side };
  }

  /** Which quay a ship from this point heads for: mostly the near one, sometimes across the bay. */
  function pickHarbor(rng, spawn) {
    const { VIEW, HARBORS } = LK;
    const near = spawn.x < VIEW.width / 2 ? 0 : 1;
    const cross = spawn.side === 'top' ? 0.28 : 0.18;
    return HARBORS[rng.chance(cross) ? 1 - near : near];
  }

  function buildArrivals(rng, def) {
    const arrivals = [];
    let t = 1.6;
    for (let i = 0; i < def.ships; i++) {
      const side = rng.weighted({ top: 3, left: 1, right: 1 });
      const spawn = edgePoint(rng, side);
      arrivals.push({ t, kind: rng.weighted(def.mix), spawn, harbor: pickHarbor(rng, spawn) });
      // Now and then two ships come in close together from different edges.
      t += rng.chance(0.2) ? rng.range(0.6, 1.2) : rng.range(def.interval[0], def.interval[1]);
    }
    const span = t;
    for (let i = 0; i < def.smugglers; i++) {
      const side = rng.chance(0.5) ? 'left' : 'right';
      arrivals.push({ t: rng.range(span * 0.25, span * 0.85), kind: 'smuggler', spawn: edgePoint(rng, side), harbor: null });
    }
    for (let i = 0; i < def.pirates; i++) {
      const side = rng.chance(0.5) ? 'left' : 'right';
      arrivals.push({ t: rng.range(span * 0.2, span * 0.7), kind: 'pirate', spawn: edgePoint(rng, side), harbor: null });
    }
    arrivals.sort((a, b) => a.t - b.t);
    return arrivals;
  }

  /** A reef is a cluster of rocks drawn around its centre; its radius is what ships must clear. */
  function makeReef(rng, x, y) {
    const r = rng.range(17, 30);
    const rocks = [];
    const count = rng.int(3, 5);
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(0, r * 0.55);
      rocks.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: rng.range(r * 0.35, r * 0.62), tilt: rng.range(0, Math.PI) });
    }
    return { x, y, r, rocks, reveal: 0, seen: false, kind: 'reef' };
  }

  function placeOk(x, y, r, placed) {
    const { LIGHTHOUSE, HARBORS, VIEW } = LK;
    if (x < 60 || x > VIEW.width - 60 || y < FIELD_TOP || y > FIELD_BOTTOM) return false;
    if (Math.hypot(x - LIGHTHOUSE.x, y - LIGHTHOUSE.y) < 200) return false;
    for (const h of HARBORS) if (Math.hypot(x - h.gateX, y - h.gateY) < 130) return false;
    for (const p of placed) if (Math.hypot(x - p.x, y - p.y) < r + p.r + 55) return false;
    return true;
  }

  function buildReefs(rng, def, arrivals) {
    const reefs = [];
    const lanes = arrivals.filter((a) => a.harbor);
    let tries = 0;
    while (reefs.length < def.reefs && tries < 600) {
      tries++;
      let x;
      let y;
      if (reefs.length % 2 === 0 && lanes.length > 0) {
        const lane = rng.pick(lanes);
        const f = rng.range(0.35, 0.75);
        x = lane.spawn.x + (lane.harbor.gateX - lane.spawn.x) * f + rng.range(-22, 22);
        y = lane.spawn.y + (lane.harbor.gateY - lane.spawn.y) * f + rng.range(-22, 22);
      } else {
        x = rng.range(80, LK.VIEW.width - 80);
        y = rng.range(FIELD_TOP, FIELD_BOTTOM);
      }
      const reef = makeReef(rng, x, y);
      if (placeOk(x, y, reef.r, reefs)) reefs.push(reef);
    }
    return reefs;
  }

  function buildIcebergs(rng, def, reefs) {
    const icebergs = [];
    let tries = 0;
    while (icebergs.length < def.icebergs && tries < 300) {
      tries++;
      const x = rng.range(150, LK.VIEW.width - 150);
      const y = rng.range(160, 440);
      const r = rng.range(20, 28);
      if (!placeOk(x, y, r, reefs.concat(icebergs))) continue;
      const corners = [];
      const n = rng.int(6, 8);
      for (let i = 0; i < n; i++) corners.push(r * rng.range(0.75, 1.15));
      icebergs.push({ x, y, r, vx: rng.range(-11, 11), vy: rng.range(-4, 4), corners, spin: rng.range(0, Math.PI), reveal: 0, seen: false, kind: 'ice' });
    }
    return icebergs;
  }

  function buildFogs(rng, def) {
    const fogs = [];
    for (let i = 0; i < def.fogs; i++) {
      fogs.push({ x: rng.range(120, LK.VIEW.width - 120), y: rng.range(170, 470), r: rng.range(115, 170), vx: rng.range(8, 16) * (rng.chance(0.5) ? 1 : -1), phase: rng.range(0, 6.28) });
    }
    return fogs;
  }

  /** The thing below starts deep in the bay, resting for a while before it hunts. */
  function buildMonsters(rng, def) {
    const monsters = [];
    for (let i = 0; i < def.monsters; i++) {
      monsters.push({
        x: rng.range(300, LK.VIEW.width - 300),
        y: rng.range(200, 380),
        state: 'rest', // rest, lurk, rise, dive
        timer: rng.range(9, 14),
        target: null,
        lightOn: 0,
        heading: 0,
        swim: rng.range(0, 6.28),
        id: i,
      });
    }
    return monsters;
  }

  /** The whole night's sea from its own rng: arrivals, reefs, icebergs, fog and what lurks below. */
  function buildSea(rng, def) {
    const arrivals = buildArrivals(rng, def);
    const reefs = buildReefs(rng, def, arrivals);
    const icebergs = buildIcebergs(rng, def, reefs);
    const fogs = buildFogs(rng, def);
    const monsters = buildMonsters(rng, def);
    return { arrivals, reefs, icebergs, fogs, monsters };
  }

  LK.buildSea = buildSea;
  LK.FIELD_TOP = FIELD_TOP;
  LK.FIELD_BOTTOM = FIELD_BOTTOM;
})((globalThis.LK = globalThis.LK || {}));
