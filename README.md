# Melbvideoeditor

Remotion pipeline for cutting a 15 second Howards Melbourne edit from the supplied Melbourne manifest.

The current workflow is manifest-first: `public/analysis/melbourne_edit_manifest.json` contains the intended timeline, clip order, durations, pacing notes, and audio source. Add the matching media assets, run the edit-plan builder, then render.

## Folder layout

```txt
public/
  clips/       raw video clips/images, e.g. 1.MOV, 2.MOV, 5.jpg
  audio/       one song file, e.g. Video1Audio.mp3
  analysis/    melbourne_edit_manifest.json
src/
  generated/   auto-written edit plan
out/           rendered video output
```

## Fast run

```bash
npm install
cp public/edit-settings.example.json public/edit-settings.json
npm run plan
npm run dev
npm run render
```

The render target is vertical 1080x1920, designed for Reels/TikTok/Shorts. The source clips can be landscape; the composition uses a vertical crop/blur treatment, tasteful low-light correction, grain, beat flashes, and short Howards title/end-card overlays.

## Required assets for the supplied manifest

Add these to `public/clips/`:

```txt
1.MOV
2.MOV
3.MOV
4.MOV
5.jpg
6.MOV
7.MOV
8.MOV
9.MOV
10.mov
11.MOV
12.MOV
```

Add this to `public/audio/`:

```txt
Video1Audio.mp3
```

If `5.jpg` was accidental, either add the image anyway for now or change the 1.50s–2.25s timeline item in `public/analysis/melbourne_edit_manifest.json` to a real video filename.

## Settings

Copy the example settings file:

```bash
cp public/edit-settings.example.json public/edit-settings.json
```

Default settings are already pointed at the supplied manifest:

```json
{
  "bpm": 120,
  "targetSeconds": 15,
  "audioFile": "Video1Audio.mp3",
  "analysisFile": "melbourne_edit_manifest.json",
  "audioStartSeconds": 0,
  "style": "melbourne-howards-founder-edit"
}
```

If the song starts at the wrong section, adjust `audioStartSeconds`. If you know the exact BPM, update `bpm`; the supplied timeline itself still controls the 0–15s cut points.

## How the planner works

1. Looks for `public/analysis/melbourne_edit_manifest.json`.
2. Reads `audio_timeline_sequence` as the source of truth.
3. Builds `src/generated/edit-plan.json` with exact timeline positions.
4. Uses clip strength scores to decide whether to trim from the start or end of each source clip.
5. Reports missing media/audio in the generated plan notes.

## Output

The default output path is:

```txt
out/melb-howards-edit.mp4
```

## Codex workflow

See `CODEX_RUN.md` for the exact coding-agent instruction to use after the footage and song are added.
