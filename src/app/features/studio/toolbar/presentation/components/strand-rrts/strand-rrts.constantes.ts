import { WorkLoadIcon, WorkLoadStatus } from './strand-rrts.interfaces';

// Max distance to the reference support, in meters
export const DISTANCE_MAX = 5000;

// Cable catalog keys holding the strand count of each layer
export const STRAND_LAYER_KEYS = [
  'nb_strand_layer_1',
  'nb_strand_layer_2',
  'nb_strand_layer_3',
  'nb_strand_layer_4',
  'nb_strand_layer_5',
  'nb_strand_layer_6',
  'nb_strand_layer_7',
  'nb_strand_layer_8'
] as const;

export const WORK_LOAD_ICONS: Record<WorkLoadStatus, WorkLoadIcon> = {
  null: { name: 'counter_0', label: 'studio.rrts-cut-strands.result-new-working-load-null' },
  ok: { name: 'check', label: 'studio.rrts-cut-strands.result-new-working-load-ok' },
  warning: { name: 'exclamation', label: 'studio.rrts-cut-strands.result-new-working-load-warning' },
  error: { name: 'close_small', label: 'studio.rrts-cut-strands.result-new-working-load-error' },
  unknown: { name: 'question_mark', label: 'studio.rrts-cut-strands.result-new-working-load-unknown' }
};
