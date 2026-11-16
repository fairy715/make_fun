// Writes a one-file copy of the game (every script inlined into index.html) for previewing where
// sibling files cannot be loaded, such as a chat app's file viewer. The entry itself stays the
// multi-file game/ folder.
//   node tools/preview.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const game = fileURLToPath(new URL('../game/', import.meta.url));
const html = readFileSync(join(game, 'index.html'), 'utf8');
const out = process.argv[2];
if (!out) {
  console.error('usage: node tools/preview.mjs <out.html>');
  process.exit(2);
}
const inlined = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${readFileSync(join(game, src), 'utf8')}</script>`);
writeFileSync(out, inlined);
console.log(`${out}  ${inlined.length} bytes`);
