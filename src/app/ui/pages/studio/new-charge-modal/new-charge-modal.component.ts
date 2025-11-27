import {
  Component,
  input,
  output,
  computed,
  signal,
  effect
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { Charge } from '@src/app/core/data/database/interfaces/charge';
import { v4 as uuidv4 } from 'uuid';
import { ChargesService } from '@src/app/core/services/charges/charges.service';
import { PlotService } from '../plot.service';
import { defaultClimaticCharge } from '../loads/climate/climate.component';

const newCharge = (): Charge => {
  return {
    uuid: uuidv4(),
    name: '',
    personnelPresence: false,
    description: '',
    data: {
      climate: { ...defaultClimaticCharge }
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
    ButtonComponent
  ],
  templateUrl: './new-charge-modal.component.html',
  styleUrl: './new-charge-modal.component.scss'
})
export class NewChargeModalComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();
  mode = input.required<'create' | 'edit' | 'view'>();

  uuidInput = input<string | null>(null);

  name = signal<string>('');
  personnelPresence = signal<boolean>(false);
  description = signal<string>('');

  nameLength = computed(() => this.name().length ?? 0);
  descriptionLength = computed(() => this.description().length ?? 0);
  isViewMode = computed(() => this.mode() === 'view');
  isEditMode = computed(() => this.mode() === 'edit');
  isCreateMode = computed(() => this.mode() === 'create');

  validate = output<Charge>();

  constructor(
    private readonly chargesService: ChargesService,
    private readonly plotService: PlotService
  ) {
    effect(async () => {
      if (this.isOpen()) {
        if (this.mode() === 'edit' || this.mode() === 'view') {
          const charge = await this.chargesService.getCharge(
            this.plotService.study()?.uuid ?? '',
            this.plotService.section()?.uuid ?? '',
            this.uuidInput() ?? ''
          );
          if (!charge) {
            throw new Error(`Charge with uuid ${this.uuidInput()} not found`);
          }
          this.name.set(charge.name);
          this.personnelPresence.set(charge.personnelPresence);
          this.description.set(charge.description);
        } else {
          const emptyCase = newCharge();
          this.name.set(emptyCase.name);
          this.personnelPresence.set(emptyCase.personnelPresence);
          this.description.set(emptyCase.description);
        }
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
    const chargeUuid =
      this.isEditMode() && this.uuidInput() ? this.uuidInput() : uuidv4();

    const charge: Charge = {
      uuid: chargeUuid ?? '',
      name: this.name(),
      personnelPresence: this.personnelPresence(),
      description: this.description(),
      data: {
        climate: { ...defaultClimaticCharge }
      }
    };

    this.validate.emit(charge);

    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }

    await this.chargesService.createOrUpdateCharge(
      studyUuid,
      sectionUuid,
      charge
    );
    this.isOpenChange.emit(false);
  }

  onClose() {
    this.isOpenChange.emit(false);
  }
}
