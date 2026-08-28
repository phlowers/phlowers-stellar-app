import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { Section, InitialCondition } from '@shared/domain';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InitialConditionFunctionsInput } from '@services/initial-condition/initial-condition.service';
import { MessageModule } from 'primeng/message';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { isNumber } from 'lodash';
import { CablesService } from '@shared/catalog/services/cables.service';
import { v4 as uuidv4 } from 'uuid';
import { Study } from '@shared/domain';
import { KeyFilterModule } from 'primeng/keyfilter';
import { findDuplicateTitle } from '@shared/helpers/duplicate';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { initialConditionConstraints } from './initialConditionModal.constantes';
import { getErrorIds, integerValidator } from './initialConditionModal.helpers';

/** Form validation rules for initial condition fields. */
const validators = {
  name: ['', [Validators.required, Validators.maxLength(40)]],
  base_parameters: [
    null,
    [
      Validators.required,
      Validators.min(initialConditionConstraints.base_parameters.min),
      Validators.max(initialConditionConstraints.base_parameters.max)
    ]
  ],
  base_temperature: [
    15,
    [
      Validators.required,
      Validators.min(initialConditionConstraints.base_temperature.min),
      Validators.max(initialConditionConstraints.base_temperature.max),
      integerValidator
    ]
  ],
  cable_pretension: [
    0,
    [
      Validators.min(initialConditionConstraints.cable_pretension.min),
      Validators.max(initialConditionConstraints.cable_pretension.max)
    ]
  ],
  min_temperature: [
    15,
    [
      Validators.min(initialConditionConstraints.min_temperature.min),
      Validators.max(initialConditionConstraints.min_temperature.max),
      integerValidator
    ]
  ],
  max_wind_pressure: [
    0,
    [
      Validators.min(initialConditionConstraints.max_wind_pressure.min),
      Validators.max(initialConditionConstraints.max_wind_pressure.max),
      integerValidator
    ]
  ],
  max_frost_width: [
    0,
    [
      Validators.min(initialConditionConstraints.max_frost_width.min),
      Validators.max(initialConditionConstraints.max_frost_width.max)
    ]
  ]
};

/**
 * Modal dialog for creating, editing, or viewing an initial condition of a section.
 *
 * Validates cable-specific constraints and ensures name uniqueness
 * across the section's initial conditions.
 */
@Component({
  selector: 'app-initial-condition-modal',
  templateUrl: './initialConditionModal.component.html',
  styleUrls: ['./initialConditionModal.component.scss'],
  imports: [
    DialogModule,
    InputTextModule,
    DividerModule,
    ButtonComponent,
    IconComponent,
    ReactiveFormsModule,
    MessageModule,
    InputGroup,
    InputGroupAddon,
    KeyFilterModule,
    TranslocoModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InitialConditionModalComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly translocoService = inject(TranslocoService);
  /** Whether the modal dialog is open. */
  isOpen = input<boolean>(false);
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** The section this initial condition belongs to. */
  section = input.required<Section>();
  /** The parent study. */
  study = input.required<Study | null>();
  /** Current modal mode: view, edit, or create. */
  mode = input.required<'view' | 'edit' | 'create'>();
  changeMode = output<'view' | 'edit' | 'create'>();
  addInitialCondition = output<InitialConditionFunctionsInput>();
  deleteInitialCondition = output<InitialConditionFunctionsInput>();
  duplicateInitialCondition = output<{
    initialCondition: InitialCondition;
    newUuid: string;
  }>();
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  initialConditionInput = input.required<InitialCondition>();
  initialConditions = input.required<InitialCondition[]>();
  initialCondition = signal<InitialCondition>({
    uuid: '',
    name: '',
    base_parameters: null,
    base_temperature: 15,
    cable_pretension: 0,
    min_temperature: 15,
    max_wind_pressure: 0,
    max_frost_width: 0
  });
  isInsideToolsDialog = input<boolean>(false);
  isCableNarcisse = signal<boolean>(false);
  isNameUnique = signal<boolean>(true);
  public onlyPositiveNumbers = /^[0-9]*$/;
  readonly constraints = initialConditionConstraints;
  private readonly fb = inject(FormBuilder);
  private readonly cablesService = inject(CablesService);

  form: FormGroup;

  onNameChange(name: string) {
    this.isNameUnique.set(this.checkNameUniqueness(name));
  }

  checkNameUniqueness(name: string) {
    return !this.initialConditions().find((ic) => ic.name === name && ic.uuid !== this.initialCondition().uuid);
  }

  getErrorIds(controlName: string, errorTypes: string[]): string | null {
    return getErrorIds(this.form, controlName, errorTypes);
  }

  getNameErrorIds(): string | null {
    const ids: string[] = [];
    const requiredId = this.getErrorIds('name', ['required']);
    if (requiredId) {
      ids.push(requiredId);
    }
    if (!this.isNameUnique()) {
      ids.push('initial-condition-name-error-message');
    }
    return ids.length > 0 ? ids.join(' ') : null;
  }

  constructor() {
    this.form = this.fb.group(validators);

    this.form
      .get('name')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        this.onNameChange(name);
      });

    effect(() => {
      const input = this.initialConditionInput();
      this.initialCondition.set(input);
      this.form.patchValue({
        name: input.name,
        base_parameters: input.base_parameters,
        base_temperature: input.base_temperature,
        cable_pretension: input.cable_pretension,
        min_temperature: input.min_temperature,
        max_wind_pressure: input.max_wind_pressure,
        max_frost_width: input.max_frost_width
      });
    });

    effect(() => {
      if (this.isOpen()) {
        this.cablesService.getCables().then((cables) => {
          const sectionCableName = this.section().cable_name;
          if (sectionCableName) {
            const isNarcisse = !!cables?.find((c) => c.name === sectionCableName)?.is_polynomial;
            this.isCableNarcisse.set(isNarcisse);

            const cableFields = ['cable_pretension', 'min_temperature', 'max_wind_pressure', 'max_frost_width'];
            cableFields.forEach((field) => {
              const control = this.form.get(field);
              if (isNarcisse) {
                control?.addValidators(Validators.required);
              } else {
                control?.removeValidators(Validators.required);
              }
              control?.updateValueAndValidity();
            });
          }
        });
        const isNameUnique = this.checkNameUniqueness(this.initialCondition().name);
        this.isNameUnique.set(isNameUnique);
      }
    });
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  onSubmit(generateState: boolean) {
    if (this.form.invalid) return;

    this.isOpenChange.emit(false);
    const formValue = this.form.value;
    const updatedInitialCondition: InitialCondition = {
      ...this.initialCondition(),
      ...formValue
    };

    if (this.mode() === 'create') {
      this.addInitialCondition.emit({
        section: this.section(),
        initialCondition: updatedInitialCondition,
        generateState: generateState
      });
    } else if (this.mode() === 'edit') {
      this.updateInitialCondition.emit({
        section: this.section(),
        initialCondition: updatedInitialCondition,
        generateState: generateState
      });
    } else if (this.mode() === 'view') {
      // do nothing
    }
  }

  isNumber(value: number): boolean {
    return isNumber(value);
  }

  onModify() {
    this.changeMode.emit('edit');
  }

  onDuplicate() {
    const newUuid = uuidv4();
    const duplicatedName = findDuplicateTitle(
      this.initialConditions().map((ic) => ic.name),
      this.initialCondition().name,
      this.translocoService.translate('shared.duplicate.copy-suffix')
    );
    const duplicatedIc: InitialCondition = {
      ...this.initialCondition(),
      uuid: newUuid,
      name: duplicatedName
    };
    this.duplicateInitialCondition.emit({
      initialCondition: duplicatedIc,
      newUuid
    });
    this.initialCondition.set(duplicatedIc);
    this.form.patchValue({
      name: duplicatedIc.name,
      base_parameters: duplicatedIc.base_parameters,
      base_temperature: duplicatedIc.base_temperature,
      cable_pretension: duplicatedIc.cable_pretension,
      min_temperature: duplicatedIc.min_temperature,
      max_wind_pressure: duplicatedIc.max_wind_pressure,
      max_frost_width: duplicatedIc.max_frost_width
    });
  }

  onDelete() {
    this.deleteInitialCondition.emit({
      section: this.section(),
      initialCondition: this.initialCondition()
    });
    this.isOpenChange.emit(false);
  }

  isFormValid(): boolean {
    return this.form.valid && this.isNameUnique();
  }
}
