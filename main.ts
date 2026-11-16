// Lamplight Keeper's hand-in for make.fun's best-game-01 (Node 22, standard library only).
// It copies the playable game (game/, plain static files that open in a desktop browser with no
// network) and its screenshots to the output folder, then writes dossier.json, the summary the
// judge reads, with make.fun's vendored library. Both runs of the grader must write the same
// bytes, so nothing here reads the clock or a random number.
//
// Locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The grader's caps (the same numbers the gate enforces), so a bad hand-in fails here first.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyGame(): void {
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
}

function copyScreenshots(): void {
  const from = join(repoRoot, 'screenshots');
  const to = join(outputDir, 'screenshots');
  mkdirSync(to, { recursive: true });
  if (!existsSync(from)) return;
  // Only the images: the gate counts every entry under screenshots/.
  for (const name of readdirSync(from).sort()) {
    if (/\.(png|jpe?g)$/i.test(name)) cpSync(join(from, name), join(to, name));
  }
}

mkdirSync(outputDir, { recursive: true });
copyGame();
copyScreenshots();
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, CAPS));
