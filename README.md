# Melbvideoeditor

Remotion pipeline for cutting a 15–25 second Howards Melbourne edit from landscape, low-light clips.

Drop your footage, song, and clip-analysis JSON into `public/`, run the edit-plan builder, then render.

## Folder layout

```txt
public/
  clips/       raw video clips, e.g. IMG_1234.MOV
  audio/       one song file, e.g. track.mp3
  analysis/    JSON analysis files with timestamps/moments
src/
  generated/   auto-written edit plan
out/           rendered video output
```

## Fast run

```bash
npm install
npm run plan
npm run dev
npm run render
```

The render target is vertical 1080x1920, designed for Reels/TikTok/Shorts. The source clips can be landscape; the composition uses a vertical crop/blur treatment and low-light correction.

## Settings

Copy the example settings file:

```bash
cp public/edit-settings.example.json public/edit-settings.json
```

Then set the BPM once you pick the song:

```json
{
  "bpm": 128,
  "targetSeconds": 21,
  "audioFile": "song.mp3",
  "audioStartSeconds": 0,
  "style": "melbourne-howards-founder-edit"
}
```

If no BPM is supplied, the builder defaults to 128 BPM and keeps the cut between 15 and 25 seconds.

## Asset rules

- Keep the best clips in `public/clips/`.
- Put the chosen song in `public/audio/`.
- Put any AI/video analysis JSON in `public/analysis/`.
- The script tries to read timestamp fields like `start`, `end`, `startTime`, `endTime`, `timestamp`, `file`, `filename`, `clip`, `score`, `rating`, `description`, and `label`.

## Output

The default output path is:

```txt
out/melb-howards-edit.mp4
```

## Codex workflow

See `CODEX_RUN.md` for the exact coding-agent instruction to use after the footage and song are added.
