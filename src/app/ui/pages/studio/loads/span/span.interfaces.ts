import { FormControl } from '@angular/forms';
import { LoadType } from '@src/app/core/domain/models/charge.model';

/** Option representing a support side selection (LEFT or RIGHT). */
export interface SupportOption {
  /** Display label (support number). */
  label: number;
  /** Support side value. */
  value: 'LEFT' | 'RIGHT';
}

/** Names of the load-related form controls in the span form. */
export type LoadControlName = 'loadPosition' | 'loadWeight' | 'type' | 'referenceSupport';

/** Typed form controls for the span load form. */
export interface SpanFormControls {
  spanSelect: FormControl<string | null>;
  referenceSupport: FormControl<'LEFT' | 'RIGHT' | null>;
  type: FormControl<LoadType>;
  loadPosition: FormControl<number>;
  loadWeight: FormControl<number>;
}
