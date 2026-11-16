// The keeper's improvements, one chosen from three offered after each night survived.
// Each has a stack limit; lampStats() turns the stacks into the numbers the night runs on.
(function (LK) {
  'use strict';

  const UPGRADES = [
    { id: 'lens', name: 'Fresnel Lens', icon: 'lens', max: 3, text: 'Beam 20% wider.' },
    { id: 'wick', name: 'Brighter Wick', icon: 'flame', max: 3, text: 'Beam reaches 15% farther.' },
    { id: 'gears', name: 'Oiled Gears', icon: 'gear', max: 2, text: 'Lamp swings 35% faster.' },
    { id: 'cistern', name: 'Oil Cistern', icon: 'drop', max: 2, text: '+40 oil for the focused beam.' },
    { id: 'horn', name: 'Deep Foghorn', icon: 'horn', max: 2, text: 'Foghorn recharges 30% sooner and holds ships longer.' },
    { id: 'lifeboat', name: 'Lifeboat Crew', icon: 'buoy', max: 3, text: 'Rescues the next wrecked crew: no trust lost.' },
    { id: 'afterglow', name: 'Afterglow', icon: 'eye', max: 2, text: 'Rocks stay outlined and ships keep their bearings longer.' },
    { id: 'pilots', name: 'Harbour Pilots', icon: 'anchor', max: 2, text: 'Guided ships sail 15% faster.' },
    { id: 'roof', name: 'Mended Roof', icon: 'heart', max: 2, text: '+1 harbour trust (up to 6).' },
    { id: 'spyglass', name: 'Spyglass', icon: 'glass', max: 1, text: 'Smugglers give up after half the light.' },
  ];

  const BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

  function upgradeById(id) {
    return BY_ID[id];
  }

  /** Three different upgrades the keeper may still take, drawn with the run's rng. */
  function offerUpgrades(run, rng) {
    const open = UPGRADES.filter((u) => (run.upgrades[u.id] || 0) < u.max && !(u.id === 'roof' && run.maxTrust >= LK.TRUST.max));
    const offer = [];
    while (offer.length < 3 && open.length > 0) {
      const index = Math.floor(rng.next() * open.length);
      offer.push(open[index].id);
      open.splice(index, 1);
    }
    return offer;
  }

  /** Takes an upgrade: stacks it and applies the one-off effects (trust, lifeboats). */
  function takeUpgrade(run, id) {
    run.upgrades[id] = (run.upgrades[id] || 0) + 1;
    if (id === 'roof') {
      run.maxTrust = Math.min(LK.TRUST.max, run.maxTrust + 1);
      run.trust = Math.min(run.maxTrust, run.trust + 1);
    }
    if (id === 'lifeboat') run.lifeboats += 1;
  }

  /** The lamp, foghorn and guidance numbers for this run's upgrades. */
  function lampStats(run) {
    const n = (id) => run.upgrades[id] || 0;
    const { BEAM, FOGHORN, GUIDE, REVEAL, SMUGGLER } = LK;
    return {
      halfWidth: BEAM.halfWidth * (1 + 0.2 * n('lens')),
      focusHalfWidth: BEAM.focusHalfWidth * (1 + 0.2 * n('lens')),
      reach: BEAM.reach * (1 + 0.15 * n('wick')),
      focusReach: BEAM.focusReach * (1 + 0.15 * n('wick')),
      turnSpeed: BEAM.turnSpeed * (1 + 0.35 * n('gears')),
      oilMax: BEAM.oilMax + 40 * n('cistern'),
      hornCooldown: FOGHORN.cooldown * Math.pow(0.7, n('horn')),
      hornHalt: FOGHORN.halt + 0.6 * n('horn'),
      guideMemory: GUIDE.memory + 0.8 * n('afterglow'),
      revealLinger: REVEAL.linger + 3 * n('afterglow'),
      guidedSpeed: 1 + 0.15 * n('pilots'),
      exposeTime: SMUGGLER.exposeTime * (n('spyglass') ? 0.5 : 1),
    };
  }

  LK.UPGRADES = UPGRADES;
  LK.upgradeById = upgradeById;
  LK.offerUpgrades = offerUpgrades;
  LK.takeUpgrade = takeUpgrade;
  LK.lampStats = lampStats;
})((globalThis.LK = globalThis.LK || {}));
