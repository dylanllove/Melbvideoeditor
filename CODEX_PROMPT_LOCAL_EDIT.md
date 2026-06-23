# Codex prompt: finish and preview the Howards Melbourne edit

Use this prompt in Codex from the local repo root after the media assets have been committed or are present locally.

```txt
You are working in the local GitHub repo `Melbvideoeditor`, a Remotion project for a 15-second Howards Melbourne edit.

Goal:
Create a polished, previewable 15-second vertical Remotion edit that follows the supplied manifest timeline and feels like a cool Howards week-in-Melbourne recap crossed with “Howards making moves in the Aus market.” It should feel fast, confident, gritty/premium, founder-led, and social-native — not a sterile corporate montage.

Important context:
- The main manifest is `public/analysis/melbourne_edit_manifest.json`.
- The manifest’s `audio_timeline_sequence` is the source of truth for clip order and timing.
- Do not throw away the timeline and auto-sort everything unless absolutely necessary.
- Source clips/images are in `public/clips/`.
- Audio is in `public/audio/Video1Audio.mp3`.
- The generated Remotion plan is `src/generated/edit-plan.json`.
- Main composition is `src/MelbourneEdit.tsx`.
- Plan builder is `scripts/build-edit-plan.ts`.

First, run:

npm install
npm run check:assets
npm run plan
npm run typecheck

If any command fails, fix the actual issue. Do not ignore type errors or missing assets.

Editing requirements:
1. Preserve the manifest’s 0.00s–15.00s timeline.
2. Make sure the 0–3s stutter-build feels sharp and energetic.
3. Let the 3–8s station/hotel section breathe but not feel slow.
4. Make the 8–10s sunset section clearly feel like the day-to-night transition.
5. Make 10–15s feel like a night-city climax, with the balcony skyline reveal feeling like the final payoff.
6. Keep the Howards overlay minimal. The clips should carry the video.
7. Keep `Making moves in the Aus market` as the final statement unless there is a very strong reason to adjust.
8. Tune vertical crops per segment if subjects are getting cut off. Prefer changing `cropX` / `cropY` in `src/generated/edit-plan.json` or adding a small override system in the code.
9. Improve the look if needed: low-light correction, contrast, saturation, grain, vignette, subtle beat flash. Do not overcook it.
10. If `5.jpg` feels wrong or is missing, replace that 1.50s–2.25s slot with the strongest available short video moment from nearby day/indoor content, preferably `7.MOV` or another founder/work/city detail.
11. Do not make the video longer than 15 seconds unless the manifest or audio clearly requires it.
12. Do not add fake claims, fake logos, fake client names, or fake captions.

After fixes, run:

npm run check:assets
npm run plan
npm run typecheck
npm run dev

Leave Remotion Studio running so I can open localhost and preview `MelbourneEdit`.

If the preview looks good, also verify render works with:

npm run render

Output should be:

out/melb-howards-edit.mp4

When finished, summarize:
- what you changed,
- what command is running for preview,
- the localhost URL,
- anything I need to manually inspect in the edit.
```
