import { FormControl } from '@angular/forms';
import { LoadType } from '@src/app/core/domain/models/charge.model';

export interface SupportOption {
  label: number;
  value: 'LEFT' | 'RIGHT';
}

export type LoadControlName = 'loadPosition' | 'loadWeight' | 'type' | 'referenceSupport';

export interface SpanFormControls {
  spanSelect: FormControl<string | null>;
  referenceSupport: FormControl<'LEFT' | 'RIGHT' | null>;
  type: FormControl<LoadType>;
  loadPosition: FormControl<number>;
  loadWeight: FormControl<number>;
}
