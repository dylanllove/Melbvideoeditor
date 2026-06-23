export type Segment = {
  id: string;
  clip: string;
  label: string;
  startSec: number;
  endSec: number;
  fromFrame: number;
  durationFrames: number;
  beatStart: number;
  beatLength: number;
  score: number;
  cropX?: number;
  cropY?: number;
};

export type EditPlan = {
  fps: number;
  width: number;
  height: number;
  bpm: number;
  beatSeconds: number;
  durationSeconds: number;
  durationInFrames: number;
  audio: string | null;
  audioStartSeconds: number;
  audioStartFrame: number;
  title: string;
  subtitle: string;
  endCard: string;
  segments: Segment[];
  notes: string[];
};
