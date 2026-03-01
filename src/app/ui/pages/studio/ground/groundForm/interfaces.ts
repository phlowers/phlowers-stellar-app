import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { GroundPosition, GroundReferenceSupport } from '@core/domain/models/ground.model';

export interface GroundFormData {
  uuid: string;
  supportUuid: string | null;
  referenceSupport: GroundReferenceSupport | null;
  altitudeType: string | null;
  positions: GroundPosition[];
}

export interface GroundFormGroupData {
  uuid: FormControl<string | null>;
  supportUuid: FormControl<string | null>;
  referenceSupport: FormControl<GroundReferenceSupport | null>;
  altitudeType: FormControl<string | null>;
  positions: FormArray<
    FormGroup<{
      x: FormControl<number | null>;
      z: FormControl<number | null>;
    }>
  >;
}
