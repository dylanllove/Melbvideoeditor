# Single analysis JSON format

Use one JSON file for everything, placed here:

```txt
public/analysis/everything.json
```

The filename can be different, but using `everything.json` keeps the workflow obvious.

## Recommended shape

```json
{
  "project": "Howards Melbourne edit",
  "clips": [
    {
      "filename": "IMG_1234.MOV",
      "summary": "Walking through Melbourne CBD at night, strong city energy",
      "moments": [
        {
          "start": 1.2,
          "end": 3.8,
          "score": 0.92,
          "label": "CBD night walking shot",
          "description": "Fast movement, lights, good transition clip"
        },
        {
          "start": "00:07.4",
          "end": "00:10.1",
          "score": 0.75,
          "label": "Street sign / city detail"
        }
      ]
    },
    {
      "filename": "IMG_1235.MOV",
      "summary": "Founder/laptop/Howards work session",
      "moments": [
        {
          "startTime": 0.4,
          "endTime": 2.6,
          "rating": 0.95,
          "scene": "Working in cafe",
          "caption": "Howards building in Melbourne"
        }
      ]
    }
  ]
}
```

## Fields the parser understands

### Clip filename fields

Use one of these keys near the clip or moment:

```txt
filename, file, clip, video, source, sourceFile, source_file, path, name
```

The script matches these values against the actual files inside `public/clips/`.

### Timestamp fields

Use seconds as numbers where possible.

Accepted start fields:

```txt
start, startSec, startSeconds, start_time, startTime, in, from, timestamp, time
```

Accepted end fields:

```txt
end, endSec, endSeconds, end_time, endTime, out, to
```

Accepted duration fields:

```txt
duration, durationSec, durationSeconds, length
```

You can also use:

```json
"timestamps": [1.2, 3.8]
```

or:

```json
"range": ["00:01.2", "00:03.8"]
```

### Quality fields

Use one of these:

```txt
score, rating, quality, confidence, interest, interestingness, rank
```

A value from `0` to `1` is best. Values out of `100` are also handled.

### Label/description fields

Use one of these:

```txt
label, scene, description, summary, caption, moment, action
```

These labels help with debugging the generated edit plan and make it easier to manually tune cuts later.

## How the cut is selected

The builder recursively walks the full JSON file, finds timestamped moments that match real clip filenames, scores them, then lays them onto the BPM grid. It boosts moments that sound like founder, office, meeting, city, Melbourne, street, deal, move, train, night, bar, rooftop, property, agent, Howards, or startup content. It penalises obvious weak labels such as blurry, bad, boring, dark, unusable, or duplicate.

## Minimum useful JSON

This is enough:

```json
{
  "clips": [
    {
      "filename": "IMG_1234.MOV",
      "moments": [
        {"start": 1.2, "end": 3.8, "score": 0.9, "label": "strong opening shot"},
        {"start": 7.1, "end": 9.4, "score": 0.7, "label": "cutaway"}
      ]
    }
  ]
}
```
