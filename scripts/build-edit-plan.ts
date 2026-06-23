import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getVideoMetadata} from '@remotion/renderer';
import type {EditPlan} from '../src/types';

type Settings = {
  bpm?: number;
  targetSeconds?: number;
  minSeconds?: number;
  maxSeconds?: number;
  audioFile?: string;
  audioStartSeconds?: number;
  title?: string;
  subtitle?: string;
  endCard?: string;
};

type Candidate = {
  clip: string;
  startSec: number;
  endSec: number;
  score: number;
  label: string;
};

type ClipMeta = {
  durationInSeconds: number | null;
  width: number | null;
  height: number | null;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CLIPS_DIR = path.join(PUBLIC_DIR, 'clips');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const ANALYSIS_DIR = path.join(PUBLIC_DIR, 'analysis');
const SETTINGS_PATH = path.join(PUBLIC_DIR, 'edit-settings.json');
const GENERATED_DIR = path.join(ROOT, 'src', 'generated');
const OUT_PLAN = path.join(GENERATED_DIR, 'edit-plan.json');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg']);

const ensureFolders = () => {
  for (const dir of [PUBLIC_DIR, CLIPS_DIR, AUDIO_DIR, ANALYSIS_DIR, GENERATED_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, {recursive: true});
    }
  }
};

const readJson = <T>(filePath: string, fallback: T): T => {
  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    console.warn(`Could not parse ${path.relative(ROOT, filePath)}. Using fallback.`, error);
    return fallback;
  }
};

const listMedia = (dir: string, extensions: Set<string>) => {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => extensions.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
};

const parseTime = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/s$/i, '');
  if (!trimmed) {
    return null;
  }

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }

  const parts = trimmed.split(':').map(Number);
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const filenameFromValue = (value: unknown, clipFiles: string[]): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const base = path.basename(value);
  const exact = clipFiles.find((clip) => clip === base);
  if (exact) {
    return exact;
  }

  const lower = value.toLowerCase();
  return clipFiles.find((clip) => lower.includes(clip.toLowerCase())) ?? null;
};

const getClipFromObject = (obj: Record<string, unknown>, inherited: string | null, clipFiles: string[]) => {
  const clipKeys = ['filename', 'file', 'clip', 'video', 'source', 'sourceFile', 'source_file', 'path', 'name'];
  for (const key of clipKeys) {
    const found = filenameFromValue(obj[key], clipFiles);
    if (found) {
      return found;
    }
  }
  return inherited;
};

const firstTimeFromKeys = (obj: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const parsed = parseTime(obj[key]);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const getBoundsFromObject = (obj: Record<string, unknown>) => {
  let start = firstTimeFromKeys(obj, ['start', 'startSec', 'startSeconds', 'start_time', 'startTime', 'in', 'from', 'timestamp', 'time']);
  let end = firstTimeFromKeys(obj, ['end', 'endSec', 'endSeconds', 'end_time', 'endTime', 'out', 'to']);
  const duration = firstTimeFromKeys(obj, ['duration', 'durationSec', 'durationSeconds', 'length']);

  const timestamps = obj.timestamps ?? obj.timecodes ?? obj.range;
  if (Array.isArray(timestamps)) {
    start ??= parseTime(timestamps[0]);
    end ??= parseTime(timestamps[1]);
  }

  if (start !== null && end === null && duration !== null) {
    end = start + duration;
  }
  if (start !== null && end === null) {
    end = start + 3;
  }

  if (start === null || end === null) {
    return null;
  }

  return {
    startSec: Math.max(0, start),
    endSec: Math.max(start + 0.5, end),
  };
};

const scoreObject = (obj: Record<string, unknown>) => {
  const scoreKeys = ['score', 'rating', 'quality', 'confidence', 'interest', 'interestingness', 'rank'];
  let score = 0.5;

  for (const key of scoreKeys) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      score = Math.max(score, value > 10 ? value / 100 : value);
    }
  }

  const text = Object.values(obj)
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  const boosters = ['founder', 'office', 'meeting', 'city', 'melbourne', 'street', 'deal', 'move', 'train', 'night', 'bar', 'rooftop', 'property', 'agent', 'howards', 'startup'];
  const penalties = ['blurry', 'bad', 'boring', 'dark', 'unusable', 'duplicate'];

  score += boosters.filter((word) => text.includes(word)).length * 0.08;
  score -= penalties.filter((word) => text.includes(word)).length * 0.08;

  return Math.max(0.05, Math.min(1.5, score));
};

const labelObject = (obj: Record<string, unknown>, fallback: string) => {
  const labelKeys = ['label', 'scene', 'description', 'summary', 'caption', 'moment', 'action'];
  for (const key of labelKeys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().slice(0, 80);
    }
  }
  return fallback;
};

const walkAnalysis = (node: unknown, clipFiles: string[], inheritedClip: string | null, candidates: Candidate[]) => {
  if (Array.isArray(node)) {
    for (const child of node) {
      walkAnalysis(child, clipFiles, inheritedClip, candidates);
    }
    return;
  }

  const obj = asObject(node);
  if (!obj) {
    return;
  }

  const clip = getClipFromObject(obj, inheritedClip, clipFiles);
  const bounds = getBoundsFromObject(obj);

  if (clip && bounds) {
    candidates.push({
      clip,
      startSec: bounds.startSec,
      endSec: bounds.endSec,
      score: scoreObject(obj),
      label: labelObject(obj, `${clip} ${bounds.startSec.toFixed(1)}s`),
    });
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      walkAnalysis(value, clipFiles, clip, candidates);
    }
  }
};

const getClipMetadata = async (clipFiles: string[]): Promise<Map<string, ClipMeta>> => {
  const map = new Map<string, ClipMeta>();

  for (const clip of clipFiles) {
    const absolutePath = path.join(CLIPS_DIR, clip);
    try {
      const metadata = await getVideoMetadata(absolutePath, {logLevel: 'warn'});
      map.set(clip, {
        durationInSeconds: metadata.durationInSeconds,
        width: metadata.width,
        height: metadata.height,
      });
    } catch (error) {
      console.warn(`Could not read metadata for ${clip}. The edit plan will still reference it.`, error);
      map.set(clip, {durationInSeconds: null, width: null, height: null});
    }
  }

  return map;
};

const chooseDuration = (bpm: number, targetSeconds: number, minSeconds: number, maxSeconds: number) => {
  const beatSeconds = 60 / bpm;
  const minBeats = Math.ceil(minSeconds / beatSeconds);
  const maxBeats = Math.floor(maxSeconds / beatSeconds);
  const targetBeats = Math.round(targetSeconds / beatSeconds);
  const candidates: number[] = [];

  for (let beats = minBeats; beats <= maxBeats; beats += 1) {
    if (beats % 4 === 0) {
      candidates.push(beats);
    }
  }

  const totalBeats = candidates.length
    ? candidates.reduce((best, beats) => (Math.abs(beats - targetBeats) < Math.abs(best - targetBeats) ? beats : best), candidates[0])
    : Math.max(minBeats, Math.min(maxBeats, targetBeats));

  return {
    beatSeconds,
    totalBeats,
    durationSeconds: totalBeats * beatSeconds,
  };
};

const buildBeatLengths = (totalBeats: number) => {
  const pattern = [4, 2, 2, 2, 4, 2, 2, 2, 2, 4, 2, 2, 4, 2, 2, 4];
  const lengths: number[] = [];
  let used = 0;
  let index = 0;

  while (used < totalBeats) {
    const remaining = totalBeats - used;
    let next = pattern[index % pattern.length];
    if (remaining <= 4) {
      next = remaining;
    } else if (remaining - next === 1) {
      next += 1;
    }
    lengths.push(next);
    used += next;
    index += 1;
  }

  return lengths.filter((length) => length > 0);
};

const pickCandidate = (candidates: Candidate[], usedCounts: Map<string, number>, previousClip: string | null) => {
  return [...candidates].sort((a, b) => {
    const aPenalty = (usedCounts.get(a.clip) ?? 0) * 0.22 + (a.clip === previousClip ? 0.45 : 0);
    const bPenalty = (usedCounts.get(b.clip) ?? 0) * 0.22 + (b.clip === previousClip ? 0.45 : 0);
    return b.score - bPenalty - (a.score - aPenalty);
  })[0];
};

const makeEmptyPlan = (settings: Settings): EditPlan => {
  const bpm = settings.bpm ?? 128;
  const fps = 30;
  const {beatSeconds, durationSeconds} = chooseDuration(bpm, settings.targetSeconds ?? 21, settings.minSeconds ?? 15, settings.maxSeconds ?? 25);

  return {
    fps,
    width: 1080,
    height: 1920,
    bpm,
    beatSeconds,
    durationSeconds,
    durationInFrames: Math.round(durationSeconds * fps),
    audio: null,
    audioStartSeconds: settings.audioStartSeconds ?? 0,
    audioStartFrame: Math.round((settings.audioStartSeconds ?? 0) * fps),
    title: settings.title ?? 'Howards in Melbourne',
    subtitle: settings.subtitle ?? 'Week in the field',
    endCard: settings.endCard ?? 'Making moves in the Aus market',
    segments: [],
    notes: ['No clips found yet. Add video files to public/clips and rerun npm run plan.'],
  };
};

const buildPlan = async () => {
  ensureFolders();

  const settings = readJson<Settings>(SETTINGS_PATH, {});
  const clipFiles = listMedia(CLIPS_DIR, VIDEO_EXTENSIONS);
  const audioFiles = listMedia(AUDIO_DIR, AUDIO_EXTENSIONS);
  const audio = settings.audioFile && audioFiles.includes(settings.audioFile) ? settings.audioFile : audioFiles[0] ?? null;

  if (clipFiles.length === 0) {
    const empty = makeEmptyPlan({...settings, audioFile: audio ?? undefined});
    empty.audio = audio;
    writeFileSync(OUT_PLAN, `${JSON.stringify(empty, null, 2)}\n`);
    console.log(`Wrote placeholder edit plan to ${path.relative(ROOT, OUT_PLAN)}.`);
    return;
  }

  const candidates: Candidate[] = [];
  const analysisFiles = listMedia(ANALYSIS_DIR, new Set(['.json']));

  for (const analysisFile of analysisFiles) {
    const json = readJson<unknown>(path.join(ANALYSIS_DIR, analysisFile), null);
    walkAnalysis(json, clipFiles, null, candidates);
  }

  if (candidates.length === 0) {
    for (const clip of clipFiles) {
      candidates.push({
        clip,
        startSec: 0,
        endSec: 4,
        score: 0.5,
        label: `Fallback moment from ${clip}`,
      });
    }
  }

  const metadata = await getClipMetadata(clipFiles);
  const bpm = settings.bpm ?? 128;
  const fps = 30;
  const minSeconds = settings.minSeconds ?? 15;
  const maxSeconds = settings.maxSeconds ?? 25;
  const targetSeconds = settings.targetSeconds ?? 21;
  const {beatSeconds, totalBeats, durationSeconds} = chooseDuration(bpm, targetSeconds, minSeconds, maxSeconds);
  const beatLengths = buildBeatLengths(totalBeats);
  const usedCounts = new Map<string, number>();
  let beatCursor = 0;
  let previousClip: string | null = null;

  const segments = beatLengths.map((beatLength, index) => {
    const candidate = pickCandidate(candidates, usedCounts, previousClip);
    usedCounts.set(candidate.clip, (usedCounts.get(candidate.clip) ?? 0) + 1);
    previousClip = candidate.clip;

    const segmentDurationSeconds = beatLength * beatSeconds;
    const clipDuration = metadata.get(candidate.clip)?.durationInSeconds ?? null;
    const latestSafeStart = clipDuration === null ? candidate.startSec : Math.max(0, clipDuration - segmentDurationSeconds - 0.1);
    const startSec = Math.max(0, Math.min(candidate.startSec, latestSafeStart));
    const fallbackEnd = startSec + segmentDurationSeconds + 0.15;
    const desiredEnd = Math.max(candidate.endSec, fallbackEnd);
    const endSec = clipDuration === null ? desiredEnd : Math.min(clipDuration, desiredEnd);
    const fromFrame = Math.round(beatCursor * beatSeconds * fps);
    const nextFrame = Math.round((beatCursor + beatLength) * beatSeconds * fps);

    const segment = {
      id: `seg-${String(index + 1).padStart(2, '0')}`,
      clip: candidate.clip,
      label: candidate.label,
      startSec: Number(startSec.toFixed(3)),
      endSec: Number(Math.max(startSec + 0.5, endSec).toFixed(3)),
      fromFrame,
      durationFrames: Math.max(1, nextFrame - fromFrame),
      beatStart: beatCursor,
      beatLength,
      score: Number(candidate.score.toFixed(3)),
      cropX: 50,
      cropY: 50,
    };

    beatCursor += beatLength;
    return segment;
  });

  const plan: EditPlan = {
    fps,
    width: 1080,
    height: 1920,
    bpm,
    beatSeconds: Number(beatSeconds.toFixed(6)),
    durationSeconds: Number(durationSeconds.toFixed(3)),
    durationInFrames: Math.round(durationSeconds * fps),
    audio,
    audioStartSeconds: settings.audioStartSeconds ?? 0,
    audioStartFrame: Math.round((settings.audioStartSeconds ?? 0) * fps),
    title: settings.title ?? 'Howards in Melbourne',
    subtitle: settings.subtitle ?? 'Week in the field',
    endCard: settings.endCard ?? 'Making moves in the Aus market',
    segments,
    notes: [
      `Selected ${segments.length} beatmatched segments from ${clipFiles.length} clips.`,
      analysisFiles.length ? `Read ${analysisFiles.length} analysis JSON file(s).` : 'No analysis JSON found; used simple clip fallbacks.',
      audio ? `Using audio/${audio}.` : 'No audio file found yet. Add one to public/audio.',
    ],
  };

  writeFileSync(OUT_PLAN, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Wrote ${segments.length} segments / ${plan.durationSeconds}s to ${path.relative(ROOT, OUT_PLAN)}.`);
};

buildPlan().catch((error) => {
  console.error(error);
  process.exit(1);
});
