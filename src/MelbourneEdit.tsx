import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {EditPlan, Segment} from './types';

type Props = {
  plan: EditPlan;
};

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const BeatFlash = ({plan}: {plan: EditPlan}) => {
  const frame = useCurrentFrame();
  const beatFrame = Math.max(1, Math.round(plan.beatSeconds * plan.fps));
  const distanceFromBeat = frame % beatFrame;
  const opacity = interpolate(distanceFromBeat, [0, 2, 7], [0.18, 0.09, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <AbsoluteFill style={{background: 'white', opacity, pointerEvents: 'none'}} />;
};

const Grain = () => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: 0.08,
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0 1px, transparent 1px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.35) 0 1px, transparent 1px)',
        backgroundSize: '7px 7px, 11px 11px',
      }}
    />
  );
};

const Vignette = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background:
        'radial-gradient(circle at 50% 42%, transparent 0%, transparent 46%, rgba(0,0,0,0.45) 100%)',
    }}
  />
);

const ClipLayer = ({segment}: {segment: Segment}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - segment.fromFrame;
  const progress = clamp(local / Math.max(1, segment.durationFrames), 0, 1);
  const trimBefore = Math.max(0, Math.round(segment.startSec * fps));
  const trimAfter = Math.max(trimBefore + 1, Math.round(segment.endSec * fps));
  const src = staticFile(`/clips/${segment.clip}`);
  const punchScale = interpolate(progress, [0, 1], [1.06, 1.14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const settle = interpolate(local, [0, 5, 12], [1.035, 1.01, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Sequence from={segment.fromFrame} durationInFrames={segment.durationFrames} name={segment.label}>
      <AbsoluteFill style={{background: '#050505'}}>
        <OffthreadVideo
          src={src}
          trimBefore={trimBefore}
          trimAfter={trimAfter}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(22px) brightness(0.55) contrast(1.15) saturate(1.15)',
            transform: `scale(${punchScale * 1.16})`,
          }}
        />
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 36,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              borderRadius: 34,
              boxShadow: '0 28px 80px rgba(0,0,0,0.55)',
              transform: `scale(${settle})`,
              background: '#111',
            }}
          >
            <OffthreadVideo
              src={src}
              trimBefore={trimBefore}
              trimAfter={trimAfter}
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${segment.cropX ?? 50}% ${segment.cropY ?? 50}%`,
                filter: 'brightness(1.18) contrast(1.12) saturate(1.18)',
                transform: `scale(${punchScale})`,
              }}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </Sequence>
  );
};

const IntroTitle = ({plan}: {plan: EditPlan}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 70, 82], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 18], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        padding: '0 54px 118px',
        fontFamily,
        opacity,
        transform: `translateY(${y}px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: 5,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.78)',
          textTransform: 'uppercase',
        }}
      >
        {plan.subtitle}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 78,
          lineHeight: 0.88,
          letterSpacing: -4,
          fontWeight: 950,
          color: 'white',
          textTransform: 'uppercase',
          textShadow: '0 14px 40px rgba(0,0,0,0.55)',
        }}
      >
        {plan.title}
      </div>
    </AbsoluteFill>
  );
};

const EndCard = ({plan}: {plan: EditPlan}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const start = durationInFrames - Math.round(plan.fps * 2.8);
  const opacity = interpolate(frame, [start, start + 10, durationInFrames - 10], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 56,
        textAlign: 'center',
        fontFamily,
        opacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: 7,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.75)',
          textTransform: 'uppercase',
          marginBottom: 18,
        }}
      >
        Howards
      </div>
      <div
        style={{
          fontSize: 72,
          lineHeight: 0.92,
          letterSpacing: -3,
          fontWeight: 950,
          color: 'white',
          textTransform: 'uppercase',
          textShadow: '0 18px 60px rgba(0,0,0,0.62)',
        }}
      >
        {plan.endCard}
      </div>
    </AbsoluteFill>
  );
};

const Placeholder = ({plan}: {plan: EditPlan}) => (
  <AbsoluteFill
    style={{
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0b0b0b, #1a1a1a)',
      color: 'white',
      fontFamily,
      padding: 60,
      textAlign: 'center',
    }}
  >
    <div style={{fontSize: 58, fontWeight: 950, letterSpacing: -2}}>Melbourne edit pipeline ready</div>
    <div style={{fontSize: 28, lineHeight: 1.35, opacity: 0.72, marginTop: 24}}>
      Add clips to public/clips, song to public/audio, JSON to public/analysis, then run npm run plan.
    </div>
    <div style={{fontSize: 20, opacity: 0.48, marginTop: 42}}>Current BPM: {plan.bpm}</div>
  </AbsoluteFill>
);

export const MelbourneEdit = ({plan}: Props) => {
  const hasEdit = plan.segments.length > 0;

  if (!hasEdit) {
    return <Placeholder plan={plan} />;
  }

  return (
    <AbsoluteFill style={{background: '#050505'}}>
      {plan.segments.map((segment) => (
        <ClipLayer key={segment.id} segment={segment} />
      ))}

      {plan.audio ? (
        <Html5Audio
          src={staticFile(`/audio/${plan.audio}`)}
          trimBefore={plan.audioStartFrame}
          volume={(frame) =>
            interpolate(frame, [0, 18, plan.durationInFrames - 18, plan.durationInFrames], [0, 0.92, 0.92, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}

      <BeatFlash plan={plan} />
      <Vignette />
      <Grain />
      <IntroTitle plan={plan} />
      <EndCard plan={plan} />
    </AbsoluteFill>
  );
};
