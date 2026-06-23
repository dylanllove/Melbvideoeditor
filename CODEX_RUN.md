# Codex run brief: Howards Melbourne edit

Use this after the footage and song are in the repo. The manifest JSON is already committed at `public/analysis/melbourne_edit_manifest.json`.

## Goal

Create a 15 second **landscape 1920x1080** Howards Melbourne edit from the supplied landscape/low-light clips.

The videos are landscape for a reason and should stay landscape. The desired vibe is **photographs with motion**: smooth, cinematic, lightly stabilised, premium, and atmospheric. Think controlled camera drift, subtle reframing, city mood, and clean pacing — not portrait cropping, not hyperactive zooms, and not a sterile corporate montage.

## Source of truth

Use the manifest timeline first:

```txt
public/analysis/melbourne_edit_manifest.json
```

The key field is:

```txt
audio_timeline_sequence
```

That sequence already defines the 0–15s order, durations, clip names, and pacing notes. Do not replace it with a generic auto-sort unless the user explicitly asks.

## Required assets

Put these in `public/clips/`:

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

Put this in `public/audio/`:

```txt
Video1Audio.mp3
```

If `5.jpg` is not intended, replace the 1.50s–2.25s timeline item in the manifest with a real video filename before rendering.

## Asset locations

- Clips/images: `public/clips/`
- Song: `public/audio/`
- Manifest JSON: `public/analysis/melbourne_edit_manifest.json`
- Edit settings: `public/edit-settings.json`
- Generated plan: `src/generated/edit-plan.json`
- Main composition: `src/MelbourneEdit.tsx`
- Plan builder: `scripts/build-edit-plan.ts`

## First commands

```bash
npm install
cp public/edit-settings.example.json public/edit-settings.json
npm run plan
npm run dev
```

Open Remotion Studio, preview `MelbourneEdit`, and inspect the generated cut.

## Render command

```bash
npm run render
```

Output:

```txt
out/melb-howards-edit.mp4
```

## What Codex should improve once assets exist

1. Inspect `src/generated/edit-plan.json` and verify the manifest was used.
2. Keep the composition landscape 1920x1080.
3. Preserve landscape framing unless a tiny crop is needed for smoothing.
4. Smooth and lightly stabilise the shots with subtle transforms, easing, and reframing.
5. Make the look feel like photographs with motion: controlled movement, gentle drift, clean city mood.
6. If a clip starts on the wrong moment, adjust its manifest timeline item or improve the trim logic in `scripts/build-edit-plan.ts`.
7. Keep low-light correction tasteful: brighter, sharper, more saturated, but not fried.
8. Keep the intro and end-card short. The clips should carry the edit.
9. Do a final `npm run typecheck` and `npm run render`.

## Style notes

- Follow the day-to-night progression in the manifest.
- Keep the 0–3s intro sharp but smooth.
- Let the station walk and hotel glide breathe longer.
- Let the sunset section feel like the transition zone.
- Let the neon/balcony ending feel like the final Melbourne payoff.
- The final line should land like a statement: `Making moves in the Aus market`.
- Music should be the only real audio layer unless there is an obviously strong voice clip later.

## Useful Remotion notes

- The project uses `staticFile()` to reference assets from `public/`.
- The composition uses `OffthreadVideo` for video layers and `Img` for static image layers.
- The audio layer uses `Html5Audio` with `trimBefore` from the settings file.
- The edit plan is generated so the cut can be rebuilt quickly as footage changes.
