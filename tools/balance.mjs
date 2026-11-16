// Balance simulation: plays many full runs of Lamplight Keeper with the computer keeper at each
// skill level, on the game's own rule files, and reports how far each level gets.
//   node tools/balance.mjs [runs per skill, default 60]
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const RULE_FILES = ['rng', 'config', 'upgrades', 'beam', 'sea', 'ships', 'pirates', 'monster', 'world', 'autopilot'];

/** Loads the game's rule scripts into this process, as the page's script tags do. */
export function loadRules() {
  const src = fileURLToPath(new URL('../game/src/', import.meta.url));
  for (const name of RULE_FILES) {
    const file = join(src, name + '.js');
    runInThisContext(readFileSync(file, 'utf8'), { filename: file });
  }
  return globalThis.LK;
}

/** One full run with the computer keeper; returns how it went. */
export function playRun(LK, skill, seed) {
  const run = LK.createRun(seed);
  const pilot = LK.createAutopilot(skill, seed * 7 + 1);
  const pickRng = LK.createRng(seed * 13 + 5);
  const causes = {};
  const nightTimes = [];
  for (;;) {
    const night = LK.startNight(run);
    let lost = false;
    while (!night.over && night.t < 600) {
      const events = LK.stepNight(run, night, LK.autopilotInput(pilot, night, LK.STEP), LK.STEP);
      for (const e of events) {
        if (e.type === 'wreck') causes[e.cause] = (causes[e.cause] || 0) + 1;
        if (e.type === 'plunder') causes.plunder = (causes.plunder || 0) + 1;
        if (e.type === 'gameOver') lost = true;
      }
    }
    nightTimes.push(night.t);
    if (lost || night.t >= 600) return { reached: run.nightIndex, won: false, score: run.score, causes, nightTimes, run };
    if (LK.advanceRun(run) === null) return { reached: LK.NIGHTS.length, won: true, score: run.score, causes, nightTimes, run };
    LK.takeUpgrade(run, LK.autopilotPick(LK.offerUpgrades(run, run.rng), run, pickRng));
  }
}

function main() {
  const LK = loadRules();
  const runs = Number(process.argv[2] || 60);
  for (const skill of Object.keys(LK.SKILLS)) {
    const reachedCount = new Array(LK.NIGHTS.length + 1).fill(0);
    let wins = 0;
    let scoreSum = 0;
    const causes = {};
    const times = new Array(LK.NIGHTS.length).fill(0);
    const timesN = new Array(LK.NIGHTS.length).fill(0);
    for (let i = 0; i < runs; i++) {
      const r = playRun(LK, skill, 1000 + i);
      reachedCount[r.reached] += 1;
      if (r.won) wins++;
      scoreSum += r.score;
      for (const k in r.causes) causes[k] = (causes[k] || 0) + r.causes[k];
      r.nightTimes.forEach((t, n) => {
        times[n] += t;
        timesN[n] += 1;
      });
    }
    // Share of runs that cleared each night.
    const cleared = LK.NIGHTS.map((_, n) => reachedCount.slice(n + 1).reduce((a, b) => a + b, 0) / runs);
    console.log(`${skill.padEnd(8)} win ${(100 * wins / runs).toFixed(0).padStart(3)}%  avg score ${Math.round(scoreSum / runs).toString().padStart(6)}`);
    console.log(`         cleared  ${cleared.map((c, n) => `N${n + 1} ${(100 * c).toFixed(0)}%`).join('  ')}`);
    console.log(`         seconds  ${times.map((t, n) => `N${n + 1} ${timesN[n] ? Math.round(t / timesN[n]) : '-'}`).join('  ')}`);
    console.log(`         losses   ${JSON.stringify(causes)}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
