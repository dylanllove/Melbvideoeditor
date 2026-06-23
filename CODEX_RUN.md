# Codex run brief: Howards Melbourne edit

Use this after the footage, song, and JSON are in the repo.

## Goal

Create the best 15–25 second Howards Melbourne edit from the supplied landscape/low-light clips. The vibe should be a cross between:

1. a cool Howards week-in-Melbourne recap, and
2. Howards making moves in the Australian market.

It should not feel like a sterile corporate video. It should feel fast, confident, slightly gritty, founder-led, and beatmatched.

## Asset locations

- Clips: `public/clips/`
- Song: `public/audio/`
- Clip analysis JSON: `public/analysis/`
- Edit settings: `public/edit-settings.json`
- Generated plan: `src/generated/edit-plan.json`
- Main composition: `src/MelbourneEdit.tsx`
- Plan builder: `scripts/build-edit-plan.ts`

## First commands

```bash
npm install
cp public/edit-settings.example.json public/edit-settings.json
```

Set the real `bpm`, `audioFile`, and optionally `audioStartSeconds` in `public/edit-settings.json`.

Then run:

```bash
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

1. Inspect `src/generated/edit-plan.json` and the source JSON in `public/analysis/`.
2. Make sure the strongest shots are selected first: people, movement, city, offices, laptops, agents, deals, night shots, rooftops, car/arrival/travel shots.
3. Avoid dead clips, duplicate angles, unusably blurry sections, and long static shots.
4. Keep cuts on beat boundaries. Do not drift off the BPM grid.
5. Tune crop positions per clip if important subjects are getting cropped out in the vertical 1080x1920 output.
6. Keep low-light correction tasteful: brighter, sharper, more saturated, but not fried.
7. Keep the intro and end-card short. The clips should carry the edit.
8. Do a final `npm run typecheck` and `npm run render`.

## Style notes

- Use quick two-beat cuts for energy.
- Use four-beat hero shots for skyline/office/founder moments.
- Keep the first 1.5 seconds strong.
- The final line should land like a statement: `Making moves in the Aus market`.
- Music should be the only real audio layer unless there is an obviously strong voice clip later.

## Useful Remotion notes

- The project uses `staticFile()` to reference assets from `public/`.
- The composition uses `OffthreadVideo` for video layers.
- The audio layer uses `Html5Audio` with `trimBefore` from the settings file.
- The edit plan is generated so the cut can be rebuilt quickly as footage changes.
