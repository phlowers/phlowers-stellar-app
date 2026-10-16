import { WorkLoadIcon, WorkLoadStatus } from './strand-rrts.interfaces';

// Max distance to the reference support, in meters
export const DISTANCE_MAX = 5000;

export const WORK_LOAD_ICONS: Record<WorkLoadStatus, WorkLoadIcon> = {
  null: { name: 'counter_0', label: 'studio.rrts-cut-strands.result-new-working-load-null' },
  ok: { name: 'check', label: 'studio.rrts-cut-strands.result-new-working-load-ok' },
  warning: { name: 'exclamation', label: 'studio.rrts-cut-strands.result-new-working-load-warning' },
  error: { name: 'close_small', label: 'studio.rrts-cut-strands.result-new-working-load-error' },
  unknown: { name: 'question_mark', label: 'studio.rrts-cut-strands.result-new-working-load-unknown' }
};
