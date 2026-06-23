import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

type Manifest = {
  metadata?: {
    audio_source?: string;
  };
  audio_timeline_sequence?: Array<{
    filename?: string;
  }>;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIPS_DIR = path.join(ROOT, 'public', 'clips');
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');
const MANIFEST_PATH = path.join(ROOT, 'public', 'analysis', 'melbourne_edit_manifest.json');

const listCaseInsensitive = (dir: string) => {
  if (!existsSync(dir)) {
    return new Set<string>();
  }
  return new Set(readdirSync(dir).map((file) => file.toLowerCase()));
};

const fail = (message: string) => {
  console.error(message);
  process.exitCode = 1;
};

if (!existsSync(MANIFEST_PATH)) {
  fail('Missing public/analysis/melbourne_edit_manifest.json');
  process.exit();
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
const clips = listCaseInsensitive(CLIPS_DIR);
const audioFiles = listCaseInsensitive(AUDIO_DIR);

const requiredClips = [...new Set((manifest.audio_timeline_sequence ?? []).map((item) => item.filename).filter(Boolean) as string[])];
const missingClips = requiredClips.filter((file) => !clips.has(file.toLowerCase()));
const audioSource = manifest.metadata?.audio_source;
const missingAudio = audioSource && !audioFiles.has(audioSource.toLowerCase());

console.log(`Manifest timeline items: ${manifest.audio_timeline_sequence?.length ?? 0}`);
console.log(`Required media assets: ${requiredClips.length}`);
console.log(`Audio source: ${audioSource ?? 'not specified'}`);

if (missingClips.length) {
  fail(`Missing clips/images in public/clips: ${missingClips.join(', ')}`);
}

if (missingAudio) {
  fail(`Missing audio in public/audio: ${audioSource}`);
}

if (!missingClips.length && !missingAudio) {
  console.log('All manifest assets are present.');
}
