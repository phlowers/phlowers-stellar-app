import { ChangeDetectionStrategy, Component, inject, input, output, computed, signal, effect } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { Charge } from '@shared/domain';
import { v4 as uuidv4 } from 'uuid';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '@services/plot/plot.service';
import { defaultClimaticCharge } from '../../../features/studio/loads/presentation/components/climate/climate.component';

/** Creates a new charge with default climate values and an auto-generated name. */
const newCharge = (currentCharges: Charge[]): Charge => {
  return {
    uuid: uuidv4(),
    name: $localize`CC` + ' ' + (currentCharges.length + 1),
    personnelPresence: true,
    description: '',
    data: {
      climate: { ...defaultClimaticCharge },
      spanLoads: []
    }
  };
};

@Component({
  selector: 'app-new-charge-modal',
  imports: [
    DialogModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    IconComponent,
    ButtonComponent,
    MessageModule
  ],
  templateUrl: './new-charge-modal.component.html',
  styleUrl: './new-charge-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Modal dialog component for creating a new charge case. */
export class NewChargeModalComponent {
  /** Whether the modal is open. */
  isOpen = input<boolean>(false);
  /** Emits the new open/close state of the modal. */
  isOpenChange = output<boolean>();

  name = signal<string>('');
  personnelPresence = signal<boolean>(true);
  description = signal<string>('');

  descriptionLength = computed(() => this.description().length);

  isNameDuplicate = computed(() => {
    const existingCharges = this.plotService.section()?.charges;
    return !!existingCharges?.some((c) => c.name === this.name());
  });

  /** Emits the validated charge on submit. */
  validate = output<Charge>();
  private readonly chargesService = inject(ChargesService);
  private readonly plotService = inject(PlotService);

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const emptyCase = newCharge(this.plotService.section()?.charges ?? []);
        this.name.set(emptyCase.name);
        this.personnelPresence.set(emptyCase.personnelPresence);
        this.description.set(emptyCase.description);
      }
    });
  }

  updateName(name: string) {
    this.name.set(name);
  }

  updatePersonnelPresence(presence: boolean) {
    this.personnelPresence.set(presence);
  }

  updateDescription(description: string) {
    this.description.set(description);
  }

  async onSubmit() {
    const charge: Charge = {
      uuid: uuidv4(),
      name: this.name(),
      personnelPresence: this.personnelPresence(),
      description: this.description(),
      data: {
        climate: { ...defaultClimaticCharge },
        spanLoads: []
      }
    };

    this.validate.emit(charge);

    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }

    await this.chargesService.createOrUpdateCharge(studyUuid, sectionUuid, charge);
    this.isOpenChange.emit(false);
  }

  onClose() {
    this.isOpenChange.emit(false);
  }

  isFormValid(): boolean {
    return this.name().length > 0 && !this.isNameDuplicate();
  }
}
