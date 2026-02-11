import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  LateralDistanceType,
  Position3D,
  ReferenceSupport
} from '@core/domain/models/obstacle.model';

export interface ObstacleFormData {
  uuid: string;
  name: string | null;
  type: string | null;
  supportUuid: string | null;
  referenceSupport: ReferenceSupport | null;
  altitudeType: string | null;
  lateralDistanceType: LateralDistanceType | null;
  positions: Position3D[];
}

export interface ObstacleFormGroupData {
  uuid: FormControl<string | null>;
  name: FormControl<string | null>;
  type: FormControl<string | null>;
  supportUuid: FormControl<string | null>;
  referenceSupport: FormControl<ReferenceSupport | null>;
  altitudeType: FormControl<string | null>;
  lateralDistanceType: FormControl<LateralDistanceType | null>;
  positions: FormArray<
    FormGroup<{
      x: FormControl<number | null>;
      y: FormControl<number | null>;
      z: FormControl<number | null>;
    }>
  >;
}
