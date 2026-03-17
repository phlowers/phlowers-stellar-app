import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { Section, InitialCondition } from '@shared/domain';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@services/initial-condition/initial-condition.service';
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

/** Form validation rules for initial condition fields. */
const validators = {
  name: ['', [Validators.required, Validators.maxLength(40)]],
  base_parameters: [null, [Validators.required, Validators.min(20), Validators.max(5000)]],
  base_temperature: [15, [Validators.required, Validators.min(-50), Validators.max(250)]],
  cable_pretension: [0, [Validators.min(0), Validators.max(100)]],
  min_temperature: [15, [Validators.min(-50), Validators.max(250)]],
  max_wind_pressure: [0, [Validators.min(0), Validators.max(3000)]],
  max_frost_width: [0, [Validators.min(0), Validators.max(20)]]
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
    KeyFilterModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InitialConditionModalComponent {
  private readonly destroyRef = inject(DestroyRef);
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
  private readonly fb = inject(FormBuilder);
  private readonly cablesService = inject(CablesService);
  private readonly initialConditionService = inject(InitialConditionService);

  form: FormGroup;

  onNameChange(name: string) {
    this.isNameUnique.set(this.checkNameUniqueness(name));
  }

  checkNameUniqueness(name: string) {
    return !this.initialConditions().find((ic) => ic.name === name && ic.uuid !== this.initialCondition().uuid);
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

  async onDuplicate() {
    const newUuid = uuidv4();
    await this.duplicateInitialCondition.emit({
      initialCondition: {
        ...this.initialCondition(),
        name: findDuplicateTitle(
          this.initialConditions().map((ic) => ic.name),
          this.initialCondition().name
        )
      },
      newUuid
    });
    const studyUuid = this.study()?.uuid ?? '';
    const initialCondition = await this.initialConditionService.getInitialCondition(
      studyUuid,
      this.section().uuid,
      newUuid
    );
    if (initialCondition) {
      this.initialCondition.set(initialCondition);
      this.form.patchValue({
        name: initialCondition.name,
        base_parameters: initialCondition.base_parameters,
        base_temperature: initialCondition.base_temperature,
        cable_pretension: initialCondition.cable_pretension,
        min_temperature: initialCondition.min_temperature,
        max_wind_pressure: initialCondition.max_wind_pressure,
        max_frost_width: initialCondition.max_frost_width
      });
    }
  }

  onDelete() {
    this.initialConditionService.deleteInitialCondition(this.study()!, this.section(), this.initialCondition());
    this.isOpenChange.emit(false);
  }

  isFormValid(): boolean {
    return this.form.valid && this.isNameUnique();
  }
}
