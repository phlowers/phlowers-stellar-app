import { FormControl, Validators } from '@angular/forms';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { Section, Study } from '@shared/domain';

// Same source as the menu bar: the selected charge is tracked on the study's copy of the section
export const hasStaffPresence = (study: Study | null, section: Section | null): boolean => {
  const chargeUuid = study?.sections.find((s) => s?.uuid === section?.uuid)?.selected_charge_uuid;
  return !!section?.charges?.find((c) => c.uuid === chargeUuid)?.personnelPresence;
};

// Max of the finite values: support-sized rate arrays end with NaN (null once serialized)
export const maxFinite = (values: number[] | null | undefined): number | null => {
  const finite = (values ?? []).filter(Number.isFinite);
  return finite.length ? Math.max(...finite) : null;
};

export const cutStrandsControl = (max: number) =>
  new FormControl<number>(0, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(max), maxDecimalsValidator(0)]
  });
