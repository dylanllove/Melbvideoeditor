import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {EditPlan, MediaType} from '../src/types';

type Settings = {
  bpm?: number;
  audioFile?: string;
  audioStartSeconds?: number;
  analysisFile?: string;
  title?: string;
  subtitle?: string;
  endCard?: string;
};

type ManifestClip = {
  filename?: string;
  clip_name?: string;
  clip_duration?: string | number;
  beginning_strength_score?: number;
  end_strength_score?: number;
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

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
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

const listFiles = (dir: string) => {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).sort((a, b) => a.localeCompare(b));
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

  const direct = Number(trimmed);
  if (Number.isFinite(direct)) {
    return direct;
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

const mediaTypeFor = (filename: string): MediaType => {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase()) ? 'image' : 'video';
};

const resolveAnalysisFile = (settings: Settings) => {
  const jsonFiles = listFiles(ANALYSIS_DIR).filter((file) => path.extname(file).toLowerCase() === '.json');
  if (settings.analysisFile && jsonFiles.includes(settings.analysisFile)) {
    return settings.analysisFile;
  }
  return jsonFiles.find((file) => file === 'melbourne_edit_manifest.json') ?? jsonFiles[0] ?? null;
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

const chooseAudio = (settings: Settings, manifest: Manifest) => {
  const audioFiles = listFiles(AUDIO_DIR).filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const manifestAudio = manifest.metadata?.audio_source;
  if (settings.audioFile && audioFiles.some((file) => file.toLowerCase() === settings.audioFile?.toLowerCase())) {
    return settings.audioFile;
  }
  if (manifestAudio && audioFiles.some((file) => file.toLowerCase() === manifestAudio.toLowerCase())) {
    return manifestAudio;
  }
  return audioFiles[0] ?? manifestAudio ?? null;
};

const buildEmptyPlan = (settings: Settings, notes: string[]): EditPlan => {
  const bpm = settings.bpm ?? 120;
  const durationSeconds = 15;
  return {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    bpm,
    beatSeconds: Number((60 / bpm).toFixed(6)),
    durationSeconds,
    durationInFrames: Math.round(durationSeconds * FPS),
    audio: null,
    audioStartSeconds: settings.audioStartSeconds ?? 0,
    audioStartFrame: Math.round((settings.audioStartSeconds ?? 0) * FPS),
    title: settings.title ?? 'Howards in Melbourne',
    subtitle: settings.subtitle ?? 'Melbourne City Pacing Edit',
    endCard: settings.endCard ?? 'Making moves in the Aus market',
    segments: [],
    notes,
  };
};

const buildPlan = () => {
  ensureFolders();

  const settings = readJson<Settings>(SETTINGS_PATH, {});
  const analysisFile = resolveAnalysisFile(settings);

  if (!analysisFile) {
    return buildEmptyPlan(settings, ['No manifest JSON found in public/analysis.']);
  }

  const manifest = readJson<Manifest>(path.join(ANALYSIS_DIR, analysisFile), {});
  const timeline = manifest.audio_timeline_sequence ?? [];
  if (!timeline.length) {
    return buildEmptyPlan(settings, [`Manifest ${analysisFile} has no audio_timeline_sequence.`]);
  }

  const bpm = settings.bpm ?? 120;
  const beatSeconds = 60 / bpm;
  const clipLookup = buildManifestLookup(manifest);
  const clipFiles = listFiles(CLIPS_DIR);
  const audio = chooseAudio(settings, manifest);

  const segments = timeline.map((item, index) => {
    const filename = item.filename ?? `missing-${index + 1}.mov`;
    const manifestClip = clipLookup.get(filename.toLowerCase());
    const timelineStartSec = parseTime(item.timestamp_start) ?? 0;
    const duration = parseTime(item.duration) ?? Math.max(0.5, (parseTime(item.timestamp_end) ?? timelineStartSec + 1) - timelineStartSec);
    const timelineEndSec = parseTime(item.timestamp_end) ?? timelineStartSec + duration;
    const actualDuration = Math.max(0.25, timelineEndSec - timelineStartSec);
    const sourceDuration = parseTime(manifestClip?.clip_duration);
    const mediaType = mediaTypeFor(filename);
    const useEndStrength = (manifestClip?.end_strength_score ?? 0) > (manifestClip?.beginning_strength_score ?? 0);
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
      fromFrame: Math.round(timelineStartSec * FPS),
      durationFrames: Math.max(1, Math.round(actualDuration * FPS)),
      beatStart: Number((timelineStartSec / beatSeconds).toFixed(3)),
      beatLength: Number((actualDuration / beatSeconds).toFixed(3)),
      score: Number(((useEndStrength ? manifestClip?.end_strength_score : manifestClip?.beginning_strength_score) ?? 5) / 10),
      cropX: 50,
      cropY: 50,
    };
  });

  const durationSeconds = Math.max(...segments.map((segment) => segment.timelineEndSec));
  const missingMedia = segments
    .map((segment) => segment.clip)
    .filter((clip) => !clipFiles.some((file) => file.toLowerCase() === clip.toLowerCase()));

  return {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    bpm,
    beatSeconds: Number(beatSeconds.toFixed(6)),
    durationSeconds: Number(durationSeconds.toFixed(3)),
    durationInFrames: Math.round(durationSeconds * FPS),
    audio,
    audioStartSeconds: settings.audioStartSeconds ?? 0,
    audioStartFrame: Math.round((settings.audioStartSeconds ?? 0) * FPS),
    title: settings.title ?? 'Howards in Melbourne',
    subtitle: settings.subtitle ?? 'Melbourne City Pacing Edit',
    endCard: settings.endCard ?? 'Making moves in the Aus market',
    pacingStyle: manifest.metadata?.pacing_style,
    manifestSource: analysisFile,
    segments,
    notes: [
      `Built landscape edit plan from ${analysisFile}.`,
      manifest.metadata?.pacing_style ? `Pacing style: ${manifest.metadata.pacing_style}.` : 'Pacing style: manifest-defined.',
      `Selected ${segments.length} timeline segments across ${durationSeconds.toFixed(2)}s.`,
      audio ? `Using audio/${audio}.` : 'No audio file found yet. Add the song to public/audio.',
      missingMedia.length ? `Missing referenced media in public/clips: ${[...new Set(missingMedia)].join(', ')}.` : 'All manifest media references were found locally.',
    ],
  } satisfies EditPlan;
};

const plan = buildPlan();
writeFileSync(OUT_PLAN, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`Wrote ${plan.width}x${plan.height} edit plan with ${plan.segments.length} segments / ${plan.durationSeconds}s to ${path.relative(ROOT, OUT_PLAN)}.`);
