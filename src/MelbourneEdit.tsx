import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  Img,
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

type MediaLayerProps = {
  segment: Segment;
  src: string;
  trimBefore: number;
  trimAfter: number;
  style: React.CSSProperties;
};

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const Grain = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      mixBlendMode: 'screen',
      opacity: 0.045,
      backgroundImage:
        'radial-gradient(circle at 18% 30%, rgba(255,255,255,0.35) 0 1px, transparent 1px), radial-gradient(circle at 80% 62%, rgba(255,255,255,0.25) 0 1px, transparent 1px)',
      backgroundSize: '8px 8px, 13px 13px',
    }}
  />
);

const Vignette = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background:
        'radial-gradient(circle at 50% 45%, transparent 0%, transparent 58%, rgba(0,0,0,0.36) 100%)',
    }}
  />
);

const MediaLayer = ({segment, src, trimBefore, trimAfter, style}: MediaLayerProps) => {
  if (segment.mediaType === 'image') {
    return <Img src={src} style={style} />;
  }

  return <OffthreadVideo src={src} trimBefore={trimBefore} trimAfter={trimAfter} muted style={style} />;
};

const ClipLayer = ({segment}: {segment: Segment}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - segment.fromFrame;
  const progress = clamp(local / Math.max(1, segment.durationFrames), 0, 1);
  const trimBefore = Math.max(0, Math.round(segment.startSec * fps));
  const trimAfter = Math.max(trimBefore + 1, Math.round(segment.endSec * fps));
  const src = staticFile(`/clips/${segment.clip}`);

  const motionScale = interpolate(progress, [0, 1], [1.012, 1.038], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const driftX = interpolate(progress, [0, 1], [-6, 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const driftY = interpolate(progress, [0, 1], [3, -3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeIn = interpolate(local, [0, 8], [0.72, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exposure = segment.timelineStartSec >= 10 ? 1.12 : segment.timelineStartSec >= 8 ? 1.08 : 1.03;

  return (
    <Sequence from={segment.fromFrame} durationInFrames={segment.durationFrames} name={segment.label}>
      <AbsoluteFill style={{background: '#050505', opacity: fadeIn}}>
        <MediaLayer
          segment={segment}
          src={src}
          trimBefore={trimBefore}
          trimAfter={trimAfter}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${segment.cropX ?? 50}% ${segment.cropY ?? 50}%`,
            filter: `brightness(${exposure}) contrast(1.07) saturate(1.08)`,
            transform: `translate3d(${driftX}px, ${driftY}px, 0) scale(${motionScale})`,
            transformOrigin: `${segment.cropX ?? 50}% ${segment.cropY ?? 50}%`,
          }}
        />
      </AbsoluteFill>
    </Sequence>
  );
};

const IntroTitle = ({plan}: {plan: EditPlan}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14, 58, 76], [0, 0.9, 0.9, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 24], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        padding: '0 84px 72px',
        fontFamily,
        opacity,
        transform: `translateY(${y}px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 16,
          letterSpacing: 4,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.72)',
          textTransform: 'uppercase',
        }}
      >
        {plan.subtitle}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 50,
          lineHeight: 0.9,
          letterSpacing: -2.5,
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
  const start = durationInFrames - Math.round(plan.fps * 2.35);
  const opacity = interpolate(frame, [start, start + 14, durationInFrames - 8], [0, 0.95, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 90,
        textAlign: 'center',
        fontFamily,
        opacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 18,
          letterSpacing: 7,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.76)',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        Howards
      </div>
      <div
        style={{
          fontSize: 62,
          lineHeight: 0.94,
          letterSpacing: -2.5,
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
    <div style={{fontSize: 58, fontWeight: 950, letterSpacing: -2}}>Melbourne edit ready</div>
    <div style={{fontSize: 28, lineHeight: 1.35, opacity: 0.72, marginTop: 24}}>
      Add clips, audio, and manifest, then run npm run plan.
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
            interpolate(frame, [0, 16, plan.durationInFrames - 16, plan.durationInFrames], [0, 0.92, 0.92, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}

      <Vignette />
      <Grain />
      <IntroTitle plan={plan} />
      <EndCard plan={plan} />
    </AbsoluteFill>
  );
};
