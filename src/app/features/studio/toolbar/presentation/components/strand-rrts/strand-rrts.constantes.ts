import { WorkLoadIcon, WorkLoadStatus } from './strand-rrts.interfaces';

// Max distance to the reference support, in meters
export const DISTANCE_MAX = 5000;

// Cut strands of each layer with strands until some are entered
export const DEFAULT_CUT_STRANDS = 0;

// Only the first layers are shown in the form: the others are sent to the engine at 0
export const MAX_SHOWN_LAYER = 3;

export const WORK_LOAD_ICONS: Record<WorkLoadStatus, WorkLoadIcon> = {
  null: { name: 'counter_0', label: 'studio.rrts-cut-strands.result-new-working-load-null' },
  ok: { name: 'check', label: 'studio.rrts-cut-strands.result-new-working-load-ok' },
  warning: { name: 'exclamation', label: 'studio.rrts-cut-strands.result-new-working-load-warning' },
  error: { name: 'close_small', label: 'studio.rrts-cut-strands.result-new-working-load-error' },
  unknown: { name: 'question_mark', label: 'studio.rrts-cut-strands.result-new-working-load-unknown' }
};
