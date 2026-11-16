// Every tuning number of Lamplight Keeper in one place: the field, the lamp, the ships and the
// seven nights. The balance simulation (tools/balance.mjs) reads the same file.
(function (LK) {
  'use strict';

  const VIEW = { width: 1280, height: 720 };
  const STEP = 1 / 60;

  /** The lamp room at the top of the lighthouse, on the cape at the bottom of the bay. */
  const LIGHTHOUSE = { x: 640, y: 640 };

  /** Two harbours flank the cape; a ship is home once it reaches its harbour's gate. */
  const HARBORS = [
    { id: 0, name: 'West Quay', x: 120, y: 668, gateX: 168, gateY: 604, gateRadius: 34 },
    { id: 1, name: 'East Quay', x: 1160, y: 668, gateX: 1112, gateY: 604, gateRadius: 34 },
  ];

  const BEAM = {
    halfWidth: 0.31, // radians either side of the aim, wide beam
    reach: 510,
    focusHalfWidth: 0.1,
    focusReach: 700,
    turnSpeed: 2.9, // radians a second the lamp can swing
    minAngle: -Math.PI + 0.06,
    maxAngle: -0.06,
    oilMax: 100,
    focusDrain: 11, // oil a second while the focused beam burns
    idleRefill: 2.5, // oil a second while the beam is wide
    fogReach: 0.62, // share of the reach that gets through a fog bank
    focusBoost: 1.35, // speed of a ship held in the focused beam
  };

  const FOGHORN = { cooldown: 13, halt: 1.6 };

  const GUIDE = {
    memory: 1.8, // seconds a ship keeps its bearings after the beam leaves it
    wander: 0.55, // how fast a lost ship's heading drifts (radians per root second)
    maxDrift: 1.35,
    lookAhead: 125, // how far ahead a guided ship looks for rocks
    darkSpeed: 0.62, // lost ships slow down in the dark
  };

  const REVEAL = { linger: 2.2 }; // seconds a rock stays outlined after the beam passes

  const TRUST = { start: 4, max: 6 };

  const SHIP_TYPES = {
    skiff: { name: 'Fishing skiff', speed: 44, radius: 9, points: 100, oil: 14, hull: '#c98b4b', sail: '#efe2c4' },
    steamer: { name: 'Cargo steamer', speed: 29, radius: 15, points: 250, oil: 32, hull: '#7b3b34', sail: '#d9d2c3' },
    clipper: { name: 'Mail clipper', speed: 60, radius: 11, points: 180, oil: 20, hull: '#2f5d73', sail: '#f6f1e3' },
    smuggler: { name: 'Smuggler', speed: 50, radius: 11, points: 300, oil: 0, hull: '#1b1d24', sail: '#3a3f4c' },
    pirate: { name: 'Black Sail raider', speed: 34, radius: 17, points: 400, oil: 0, hull: '#2a1414', sail: '#121212' },
  };

  const SMUGGLER = { exposeTime: 0.8, fleeSpeed: 1.6 };

  /** Black Sail raiders stand off and fire on merchants; the beam dazzles their gunners. */
  const PIRATE = { range: 215, standOff: 165, reload: 4.6, firstShot: 3.6, ballSpeed: 240, ballLife: 1.4, spread: 0.11, exposeTime: 1.8, fleeSpeed: 1.5 };

  /**
   * The thing below: it swims unseen toward a merchant, rises beside it, and drags it under unless
   * the beam catches it while it rises. Caught, it dives and slinks off to rest.
   */
  const MONSTER = { speed: 30, riseRange: 85, riseTime: 1.6, grabRange: 70, repelTime: 0.45, rest: 6, points: 350, radius: 30 };

  const SCORE = {
    comboStep: 0.25,
    comboMax: 3,
    nightBonus: 400, // times the night's number
    flawlessBonus: 800,
    clipperQuickBonus: 120, // a mail clipper docked within its time
    clipperTime: 24,
  };

  /**
   * The seven nights, calm to stormy. ships: merchant ships to bring home; interval: seconds between
   * arrivals; mix: weights of the merchant types; reefs, fogs, icebergs: what the sea holds;
   * smugglers, pirates, monsters: who hunts the merchants; storm: lost ships drift faster;
   * news: the line the night's banner shows.
   */
  const NIGHTS = [
    { name: 'Calm Waters', news: 'Light the ships home. Rocks hide in the dark.', ships: 5, interval: [6, 8], mix: { skiff: 3, steamer: 1, clipper: 1 }, reefs: 5, fogs: 0, icebergs: 0, smugglers: 0, pirates: 0, monsters: 0, storm: 0 },
    { name: 'Rolling Mist', news: 'Fog banks drift in. The beam reaches less far through them.', ships: 6, interval: [5.2, 7], mix: { skiff: 3, steamer: 2, clipper: 1 }, reefs: 6, fogs: 2, icebergs: 0, smugglers: 0, pirates: 0, monsters: 0, storm: 0 },
    { name: "Smugglers' Moon", news: 'Dark hulls hunt the merchants. Hold the light on them.', ships: 8, interval: [4.2, 6], mix: { skiff: 3, steamer: 2, clipper: 2 }, reefs: 6, fogs: 2, icebergs: 0, smugglers: 1, pirates: 0, monsters: 0, storm: 0 },
    { name: 'Black Sails', news: 'Raiders fire on ships from afar. Dazzle their gunners.', ships: 9, interval: [3.8, 5.4], mix: { skiff: 3, steamer: 2, clipper: 2 }, reefs: 7, fogs: 2, icebergs: 0, smugglers: 1, pirates: 1, monsters: 0, storm: 0 },
    { name: 'Something Below', news: 'Green eyes rise beside a ship. Light it before it drags them under.', ships: 10, interval: [3.4, 5], mix: { skiff: 2, steamer: 2, clipper: 2 }, reefs: 6, fogs: 2, icebergs: 3, smugglers: 1, pirates: 0, monsters: 1, storm: 0 },
    { name: 'Gale Warning', news: 'Lost ships drift fast in the gale.', ships: 11, interval: [3.2, 4.6], mix: { skiff: 2, steamer: 2, clipper: 3 }, reefs: 7, fogs: 3, icebergs: 2, smugglers: 1, pirates: 1, monsters: 1, storm: 1 },
    { name: 'The Long Night', news: 'Everything the sea holds, all at once. Keep the lamp lit.', ships: 12, interval: [3, 4.3], mix: { skiff: 2, steamer: 3, clipper: 3 }, reefs: 8, fogs: 3, icebergs: 3, smugglers: 2, pirates: 2, monsters: 1, storm: 1 },
  ];

  LK.VIEW = VIEW;
  LK.STEP = STEP;
  LK.LIGHTHOUSE = LIGHTHOUSE;
  LK.HARBORS = HARBORS;
  LK.BEAM = BEAM;
  LK.FOGHORN = FOGHORN;
  LK.GUIDE = GUIDE;
  LK.REVEAL = REVEAL;
  LK.TRUST = TRUST;
  LK.SHIP_TYPES = SHIP_TYPES;
  LK.SMUGGLER = SMUGGLER;
  LK.PIRATE = PIRATE;
  LK.MONSTER = MONSTER;
  LK.SCORE = SCORE;
  LK.NIGHTS = NIGHTS;
})((globalThis.LK = globalThis.LK || {}));
