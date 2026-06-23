# Codex prompt: finish and preview the Howards Melbourne edit

Use this prompt in Codex from the local repo root after the media assets have been committed or are present locally.

```txt
You are working in the local GitHub repo `Melbvideoeditor`, a Remotion project for a 15-second Howards Melbourne edit.

Goal:
Create a polished, previewable 15-second LANDSCAPE Remotion edit that follows the supplied manifest timeline. The videos are landscape for a reason and should stay landscape. The vibe should feel like photographs with motion: smooth, cinematic, lightly stabilised, premium, and atmospheric. Think controlled motion, subtle drift, clean pacing, and a Melbourne city mood — not an aggressive portrait social crop and not a sterile corporate montage.

Important context:
- The final composition must be landscape 1920x1080.
- Do not convert the video to portrait.
- Do not crop important landscape framing unless there is no alternative.
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
npm run plan
npm run typecheck

If any command fails, fix the actual issue. Do not ignore type errors.

Editing requirements:
1. Preserve the manifest’s 0.00s–15.00s timeline.
2. Keep the output landscape 1920x1080.
3. Make the motion smoother and more stabilised. Use subtle Remotion transforms, easing, and reframing where useful.
4. Aim for a photographs-with-motion feel: cinematic stillness with gentle movement, not hyperactive zooms.
5. Keep the 0–3s intro sharp, but not jarring.
6. Let the 3–8s station/hotel section breathe and feel premium.
7. Make the 8–10s sunset section clearly feel like the day-to-night transition.
8. Make 10–15s feel like a night-city climax, with the balcony skyline reveal feeling like the final payoff.
9. Keep the Howards overlay minimal. The clips should carry the video.
10. Keep `Making moves in the Aus market` as the final statement unless there is a very strong reason to adjust.
11. Tune framing only where needed, using `cropX` / `cropY` or small transform changes. Do not force portrait-style crops.
12. Improve the look if needed: low-light correction, contrast, saturation, grain, vignette. Do not overcook it.
13. If `5.jpg` feels wrong or is missing, replace that 1.50s–2.25s slot with the strongest available short video moment from nearby day/indoor content, preferably `7.MOV` or another founder/work/city detail.
14. Do not make the video longer than 15 seconds unless the manifest or audio clearly requires it.
15. Do not add fake claims, fake logos, fake client names, or fake captions.

After fixes, run:

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
