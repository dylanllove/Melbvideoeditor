import {Composition} from 'remotion';
import {MelbourneEdit} from './MelbourneEdit';
import rawPlan from './generated/edit-plan.json';
import type {EditPlan} from './types';

const plan = rawPlan as EditPlan;

export const Root = () => {
  return (
    <Composition
      id="MelbourneEdit"
      component={MelbourneEdit}
      durationInFrames={Math.max(1, plan.durationInFrames)}
      fps={plan.fps}
      width={plan.width}
      height={plan.height}
      defaultProps={{plan}}
    />
  );
};
