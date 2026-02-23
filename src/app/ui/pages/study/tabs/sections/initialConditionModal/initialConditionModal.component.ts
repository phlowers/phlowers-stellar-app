import { Component, DestroyRef, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { Section, InitialCondition } from '@core/domain';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@services/initial-conditions/initial-condition.service';
import { MessageModule } from 'primeng/message';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { isNumber } from 'lodash';
import { CablesService } from '@services/cables/cables.service';
import { v4 as uuidv4 } from 'uuid';
import { Study } from '@core/domain';
import { KeyFilterModule } from 'primeng/keyfilter';
import { Subscription } from 'rxjs';
import { findDuplicateTitle } from '@ui/shared/helpers/duplicate';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const validators = {
  name: ['', [Validators.required, Validators.maxLength(40)]],
  base_parameters: [null, [Validators.required, Validators.min(20), Validators.max(5000)]],
  base_temperature: [15, [Validators.required, Validators.min(-50), Validators.max(250)]],
  cable_pretension: [0, [Validators.min(0), Validators.max(100)]],
  min_temperature: [15, [Validators.min(-50), Validators.max(250)]],
  max_wind_pressure: [0, [Validators.min(0), Validators.max(3000)]],
  max_frost_width: [0, [Validators.min(0), Validators.max(20)]]
};

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
  ]
})
/** Modal component for creating, editing, viewing, or duplicating an initial condition. */
export class InitialConditionModalComponent implements OnDestroy {
  private readonly subscriptions = new Subscription();
  private readonly destroyRef = inject(DestroyRef);
  /** Whether the modal is currently visible. */
  isOpen = input<boolean>(false);
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** The section to which this initial condition belongs. */
  section = input.required<Section>();
  /** The parent study. */
  study = input.required<Study | null>();
  /** Current modal mode: view, edit, or create. */
  mode = input.required<'view' | 'edit' | 'create'>();
  /** Emits when the modal mode changes. */
  changeMode = output<'view' | 'edit' | 'create'>();
  /** Emits when a new initial condition should be added. */
  addInitialCondition = output<InitialConditionFunctionsInput>();
  /** Emits when an initial condition should be duplicated. */
  duplicateInitialCondition = output<{
    initialCondition: InitialCondition;
    newUuid: string;
  }>();
  /** Emits when an initial condition should be updated. */
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  /** The initial condition received as input. */
  initialConditionInput = input.required<InitialCondition>();
  /** All initial conditions for the current section. */
  initialConditions = input.required<InitialCondition[]>();
  /** Local signal holding the working copy of the initial condition. */
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
  /** Whether this modal is rendered inside the tools dialog. */
  isInsideToolsDialog = input<boolean>(false);
  /** Whether the cable type is Narcisse (polynomial). */
  isCableNarcisse = signal<boolean>(false);
  /** Whether the initial condition name is unique among siblings. */
  isNameUnique = signal<boolean>(true);
  /** Regex pattern that accepts only positive integers. */
  public onlyPositiveNumbers = /^[0-9]*$/;

  /** Reactive form group for the initial condition fields. */
  form: FormGroup;

  /** Updates the name uniqueness flag when the name input changes. */
  onNameChange(name: string) {
    this.isNameUnique.set(this.checkNameUniqueness(name));
  }

  /** Checks whether the given name is unique among sibling initial conditions. */
  checkNameUniqueness(name: string) {
    return !this.initialConditions().find((ic) => ic.name === name && ic.uuid !== this.initialCondition().uuid);
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly cablesService: CablesService,
    private readonly initialConditionService: InitialConditionService
  ) {
    this.form = this.fb.group(validators);

    this.subscriptions.add(
      this.form
        .get('name')
        ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((name) => {
          this.onNameChange(name);
        })
    );

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

  /** Closes the modal when the dialog visibility changes to hidden. */
  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  /** Submits the initial condition form, emitting an add or update event based on the mode. */
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

  /** Checks whether the given value is a number. */
  isNumber(value: number): boolean {
    return isNumber(value);
  }

  /** Switches the modal to edit mode. */
  onModify() {
    this.changeMode.emit('edit');
  }

  /** Duplicates the current initial condition and loads the new copy into the form. */
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

  /** Deletes the current initial condition and closes the modal. */
  onDelete() {
    this.initialConditionService.deleteInitialCondition(this.study()!, this.section(), this.initialCondition());
    this.isOpenChange.emit(false);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** Returns whether the form is valid and the name is unique. */
  isFormValid(): boolean {
    return this.form.valid && this.isNameUnique();
  }
}
