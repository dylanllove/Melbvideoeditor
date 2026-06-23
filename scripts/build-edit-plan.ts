import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getVideoMetadata} from '@remotion/renderer';
import type {EditPlan, MediaType} from '../src/types';

type Settings = {
  bpm?: number;
  targetSeconds?: number;
  minSeconds?: number;
  maxSeconds?: number;
  audioFile?: string;
  audioStartSeconds?: number;
  analysisFile?: string;
  title?: string;
  subtitle?: string;
  endCard?: string;
};

type Candidate = {
  clip: string;
  mediaType: MediaType;
  startSec: number;
  endSec: number;
  score: number;
  label: string;
  note?: string;
};

type ClipMeta = {
  durationInSeconds: number | null;
  width: number | null;
  height: number | null;
};

type ManifestClip = {
  filename?: string;
  clip_name?: string;
  clip_duration?: string | number;
  beginning_strength_score?: number;
  end_strength_score?: number;
  whats_happening?: string;
  time_of_day?: string;
};

type ManifestTimelineItem = {
  timestamp_start?: string | number;
  timestamp_end?: string | number;
  duration?: string | number;
  filename?: string;
  clip_name?: string;
  pacing_note?: string;
};

type Manifest = {
  metadata?: {
    project_name?: string;
    audio_source?: string;
    target_video_duration?: string | number;
    pacing_style?: string;
  };
  clips?: ManifestClip[];
  audio_timeline_sequence?: ManifestTimelineItem[];
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
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg']);
const MEDIA_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]);

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

const mediaTypeFor = (filename: string): MediaType => {
  const extension = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension) ? 'image' : 'video';
};

const parseTime = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/s$/i, '');
  if (!trimmed || trimmed.toLowerCase() === 'static image') {
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

const filenameFromValue = (value: unknown, mediaFiles: string[]): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const base = path.basename(value);
  const exact = mediaFiles.find((clip) => clip === base);
  if (exact) {
    return exact;
  }

  const caseInsensitive = mediaFiles.find((clip) => clip.toLowerCase() === base.toLowerCase());
  if (caseInsensitive) {
    return caseInsensitive;
  }

  const lower = value.toLowerCase();
  return mediaFiles.find((clip) => lower.includes(clip.toLowerCase())) ?? null;
};

const getClipFromObject = (obj: Record<string, unknown>, inherited: string | null, mediaFiles: string[]) => {
  const clipKeys = ['filename', 'file', 'clip', 'video', 'source', 'sourceFile', 'source_file', 'path', 'name'];
  for (const key of clipKeys) {
    const found = filenameFromValue(obj[key], mediaFiles);
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

const walkAnalysis = (node: unknown, mediaFiles: string[], inheritedClip: string | null, candidates: Candidate[]) => {
  if (Array.isArray(node)) {
    for (const child of node) {
      walkAnalysis(child, mediaFiles, inheritedClip, candidates);
    }
    return;
  }

  const obj = asObject(node);
  if (!obj) {
    return;
  }

  const clip = getClipFromObject(obj, inheritedClip, mediaFiles);
  const bounds = getBoundsFromObject(obj);

  if (clip && bounds) {
    candidates.push({
      clip,
      mediaType: mediaTypeFor(clip),
      startSec: bounds.startSec,
      endSec: bounds.endSec,
      score: scoreObject(obj),
      label: labelObject(obj, `${clip} ${bounds.startSec.toFixed(1)}s`),
    });
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      walkAnalysis(value, mediaFiles, clip, candidates);
    }
  }
};

const getClipMetadata = async (mediaFiles: string[]): Promise<Map<string, ClipMeta>> => {
  const map = new Map<string, ClipMeta>();

  for (const file of mediaFiles) {
    if (mediaTypeFor(file) === 'image') {
      map.set(file, {durationInSeconds: null, width: null, height: null});
      continue;
    }

    const absolutePath = path.join(CLIPS_DIR, file);
    try {
      const metadata = await getVideoMetadata(absolutePath, {logLevel: 'warn'});
      map.set(file, {
        durationInSeconds: metadata.durationInSeconds,
        width: metadata.width,
        height: metadata.height,
      });
    } catch (error) {
      console.warn(`Could not read metadata for ${file}. The edit plan will still reference it.`, error);
      map.set(file, {durationInSeconds: null, width: null, height: null});
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
    notes: ['No media or usable manifest timeline found yet. Add files to public/clips and a manifest to public/analysis, then rerun npm run plan.'],
  };
};

const resolveAnalysisFiles = (settings: Settings) => {
  const jsonFiles = listMedia(ANALYSIS_DIR, new Set(['.json']));
  if (settings.analysisFile && jsonFiles.includes(settings.analysisFile)) {
    return [settings.analysisFile];
  }

  const preferred = ['melbourne_edit_manifest.json', 'everything.json', 'manifest.json'];
  const preferredFound = preferred.find((file) => jsonFiles.includes(file));
  if (preferredFound) {
    return [preferredFound];
  }

  return jsonFiles.slice(0, 1);
};

const buildManifestLookup = (manifest: Manifest) => {
  const map = new Map<string, ManifestClip>();
  for (const clip of manifest.clips ?? []) {
    if (clip.filename) {
      map.set(clip.filename.toLowerCase(), clip);
    }
  }
  return map;
};

const scoreFromManifest = (item: ManifestTimelineItem, clip: ManifestClip | undefined) => {
  const beginning = clip?.beginning_strength_score ?? 5;
  const ending = clip?.end_strength_score ?? 5;
  const note = `${item.pacing_note ?? ''} ${clip?.whats_happening ?? ''}`.toLowerCase();
  const isFinalOrReveal = note.includes('final') || note.includes('reveal') || note.includes('climax') || note.includes('cold stop');
  return (isFinalOrReveal ? ending : Math.max(beginning, ending)) / 10;
};

const buildPlanFromManifestTimeline = (manifest: Manifest, manifestSource: string, settings: Settings, mediaFiles: string[], audioFiles: string[]): EditPlan | null => {
  const timeline = manifest.audio_timeline_sequence ?? [];
  if (!timeline.length) {
    return null;
  }

  const fps = 30;
  const bpm = settings.bpm ?? 120;
  const beatSeconds = 60 / bpm;
  const clipLookup = buildManifestLookup(manifest);
  const audioFromManifest = manifest.metadata?.audio_source;
  const audio = settings.audioFile && audioFiles.includes(settings.audioFile)
    ? settings.audioFile
    : audioFromManifest && audioFiles.includes(audioFromManifest)
      ? audioFromManifest
      : audioFiles[0] ?? audioFromManifest ?? null;

  const segments = timeline.map((item, index) => {
    const filename = item.filename ?? `missing-${index + 1}.mp4`;
    const manifestClip = clipLookup.get(filename.toLowerCase());
    const timelineStartSec = parseTime(item.timestamp_start) ?? 0;
    const duration = parseTime(item.duration) ?? Math.max(0.5, (parseTime(item.timestamp_end) ?? timelineStartSec + 1) - timelineStartSec);
    const timelineEndSec = parseTime(item.timestamp_end) ?? timelineStartSec + duration;
    const actualDuration = Math.max(0.25, timelineEndSec - timelineStartSec);
    const mediaType = mediaTypeFor(filename);
    const useEndStrength = (manifestClip?.end_strength_score ?? 0) > (manifestClip?.beginning_strength_score ?? 0);
    const sourceDuration = parseTime(manifestClip?.clip_duration);
    const startSec = mediaType === 'image'
      ? 0
      : useEndStrength && sourceDuration !== null
        ? Math.max(0, sourceDuration - actualDuration)
        : 0;
    const endSec = mediaType === 'image' ? actualDuration : startSec + actualDuration;

    return {
      id: `seg-${String(index + 1).padStart(2, '0')}`,
      clip: filename,
      mediaType,
      label: item.clip_name ?? manifestClip?.clip_name ?? filename,
      note: item.pacing_note,
      startSec: Number(startSec.toFixed(3)),
      endSec: Number(endSec.toFixed(3)),
      timelineStartSec: Number(timelineStartSec.toFixed(3)),
      timelineEndSec: Number(timelineEndSec.toFixed(3)),
      fromFrame: Math.round(timelineStartSec * fps),
      durationFrames: Math.max(1, Math.round(actualDuration * fps)),
      beatStart: Number((timelineStartSec / beatSeconds).toFixed(3)),
      beatLength: Number((actualDuration / beatSeconds).toFixed(3)),
      score: Number(scoreFromManifest(item, manifestClip).toFixed(3)),
      cropX: 50,
      cropY: 50,
    };
  });

  const durationSeconds = Math.max(...segments.map((segment) => segment.timelineEndSec));
  const missingMedia = segments
    .map((segment) => segment.clip)
    .filter((clip) => !mediaFiles.some((file) => file.toLowerCase() === clip.toLowerCase()));

  const notes = [
    `Built from manifest timeline: ${manifestSource}.`,
    manifest.metadata?.pacing_style ? `Pacing style: ${manifest.metadata.pacing_style}.` : 'Pacing style: manifest-defined.',
    `Selected ${segments.length} timeline segments across ${durationSeconds.toFixed(2)}s.`,
    audio ? `Using audio/${audio}.` : 'No audio file found yet. Add the song to public/audio.',
  ];

  if (missingMedia.length) {
    notes.push(`Missing referenced media in public/clips: ${[...new Set(missingMedia)].join(', ')}.`);
  }

  return {
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
    subtitle: settings.subtitle ?? 'Melbourne City Pacing Edit',
    endCard: settings.endCard ?? 'Making moves in the Aus market',
    pacingStyle: manifest.metadata?.pacing_style,
    manifestSource,
    segments,
    notes,
  };
};

const buildFallbackPlan = async (settings: Settings, mediaFiles: string[], audioFiles: string[], analysisFiles: string[]) => {
  const audio = settings.audioFile && audioFiles.includes(settings.audioFile) ? settings.audioFile : audioFiles[0] ?? null;

  if (mediaFiles.length === 0) {
    const empty = makeEmptyPlan({...settings, audioFile: audio ?? undefined});
    empty.audio = audio;
    return empty;
  }

  const candidates: Candidate[] = [];

  for (const analysisFile of analysisFiles) {
    const json = readJson<unknown>(path.join(ANALYSIS_DIR, analysisFile), null);
    walkAnalysis(json, mediaFiles, null, candidates);
  }

  if (candidates.length === 0) {
    for (const clip of mediaFiles) {
      candidates.push({
        clip,
        mediaType: mediaTypeFor(clip),
        startSec: 0,
        endSec: 4,
        score: 0.5,
        label: `Fallback moment from ${clip}`,
      });
    }
  }

  const metadata = await getClipMetadata(mediaFiles);
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
    const startSec = candidate.mediaType === 'image' ? 0 : Math.max(0, Math.min(candidate.startSec, latestSafeStart));
    const fallbackEnd = startSec + segmentDurationSeconds + 0.15;
    const desiredEnd = Math.max(candidate.endSec, fallbackEnd);
    const endSec = candidate.mediaType === 'image' ? segmentDurationSeconds : clipDuration === null ? desiredEnd : Math.min(clipDuration, desiredEnd);
    const fromFrame = Math.round(beatCursor * beatSeconds * fps);
    const nextFrame = Math.round((beatCursor + beatLength) * beatSeconds * fps);

    const segment = {
      id: `seg-${String(index + 1).padStart(2, '0')}`,
      clip: candidate.clip,
      mediaType: candidate.mediaType,
      label: candidate.label,
      note: candidate.note,
      startSec: Number(startSec.toFixed(3)),
      endSec: Number(Math.max(startSec + 0.5, endSec).toFixed(3)),
      timelineStartSec: Number((beatCursor * beatSeconds).toFixed(3)),
      timelineEndSec: Number(((beatCursor + beatLength) * beatSeconds).toFixed(3)),
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

  return {
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
      `Selected ${segments.length} beatmatched segments from ${mediaFiles.length} media assets.`,
      analysisFiles.length ? `Read ${analysisFiles.length} analysis JSON file(s).` : 'No analysis JSON found; used simple media fallbacks.',
      audio ? `Using audio/${audio}.` : 'No audio file found yet. Add one to public/audio.',
    ],
  } satisfies EditPlan;
};

const buildPlan = async () => {
  ensureFolders();

  const settings = readJson<Settings>(SETTINGS_PATH, {});
  const mediaFiles = listMedia(CLIPS_DIR, MEDIA_EXTENSIONS);
  const audioFiles = listMedia(AUDIO_DIR, AUDIO_EXTENSIONS);
  const analysisFiles = resolveAnalysisFiles(settings);

  for (const analysisFile of analysisFiles) {
    const manifest = readJson<Manifest>(path.join(ANALYSIS_DIR, analysisFile), {});
    const plan = buildPlanFromManifestTimeline(manifest, analysisFile, settings, mediaFiles, audioFiles);
    if (plan) {
      writeFileSync(OUT_PLAN, `${JSON.stringify(plan, null, 2)}\n`);
      console.log(`Wrote manifest edit plan with ${plan.segments.length} segments / ${plan.durationSeconds}s to ${path.relative(ROOT, OUT_PLAN)}.`);
      return;
    }
  }

  const fallbackPlan = await buildFallbackPlan(settings, mediaFiles, audioFiles, analysisFiles);
  writeFileSync(OUT_PLAN, `${JSON.stringify(fallbackPlan, null, 2)}\n`);
  console.log(`Wrote fallback edit plan to ${path.relative(ROOT, OUT_PLAN)}.`);
};

buildPlan().catch((error) => {
  console.error(error);
  process.exit(1);
});
