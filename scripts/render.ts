import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'src', 'index.ts');
const OUT_DIR = path.join(ROOT, 'out');
const OUTPUT = process.env.OUTPUT ?? path.join(OUT_DIR, 'melb-howards-edit.mp4');
const COMPOSITION_ID = process.env.COMPOSITION_ID ?? 'MelbourneEdit';

mkdirSync(OUT_DIR, {recursive: true});

console.log('Bundling Remotion project...');
const serveUrl = await bundle({
  entryPoint: ENTRY,
  webpackOverride: (config) => config,
});

console.log(`Selecting composition ${COMPOSITION_ID}...`);
const composition = await selectComposition({
  serveUrl,
  id: COMPOSITION_ID,
});

console.log(`Rendering to ${path.relative(ROOT, OUTPUT)}...`);
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  imageFormat: 'jpeg',
  outputLocation: OUTPUT,
  inputProps: {},
});

console.log(`Done: ${path.relative(ROOT, OUTPUT)}`);
