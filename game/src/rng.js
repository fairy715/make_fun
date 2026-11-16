// Seeded random numbers, so a night built from the same seed is always the same night
// (the screenshot scenes and the balance simulation both rely on that).
// Every file of the game adds itself to one shared namespace, LK, as a plain script, so
// index.html also plays when opened straight from the disk.
(function (LK) {
  'use strict';

  /** mulberry32: a small, fast 32-bit generator, wrapped with the helpers the game uses. */
  function createRng(seed) {
    let state = (seed >>> 0) || 0x9e3779b9;
    function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next,
      range(min, max) {
        return min + (max - min) * next();
      },
      int(min, maxInclusive) {
        return min + Math.floor(next() * (maxInclusive - min + 1));
      },
      pick(list) {
        return list[Math.floor(next() * list.length)];
      },
      chance(p) {
        return next() < p;
      },
      /** Roughly normal, mean 0, deviation 1 (sum of uniforms). */
      gauss() {
        return (next() + next() + next() + next() - 2) * 1.7320508;
      },
      /** Picks a key of `weights` ({key: weight}) in proportion to its weight. */
      weighted(weights) {
        let total = 0;
        for (const key in weights) total += weights[key];
        let roll = next() * total;
        for (const key in weights) {
          roll -= weights[key];
          if (roll <= 0) return key;
        }
        return Object.keys(weights)[0];
      },
    };
  }

  /** Folds a string or number into a 32-bit seed. */
  function hashSeed(value) {
    const text = String(value);
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  LK.createRng = createRng;
  LK.hashSeed = hashSeed;
})((globalThis.LK = globalThis.LK || {}));
