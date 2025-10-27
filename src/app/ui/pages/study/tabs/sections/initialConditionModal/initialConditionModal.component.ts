import { Component, effect, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { FormsModule } from '@angular/forms';
import { InitialConditionFunctionsInput } from '@src/app/core/services/initial-conditions/initial-condition.service';
import { MessageModule } from 'primeng/message';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { isNumber } from 'lodash';
import { CablesService } from '@core/services/cables/cables.service';

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
    FormsModule,
    MessageModule,
    InputGroup,
    InputGroupAddon
  ]
})
export class InitialConditionModalComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();
  section = input.required<Section>();
  mode = input.required<'view' | 'edit' | 'create'>();
  addInitialCondition = output<InitialConditionFunctionsInput>();
  updateInitialCondition = output<InitialConditionFunctionsInput>();
  initialConditionInput = input.required<InitialCondition>();
  initialConditions = input.required<InitialCondition[]>();
  initialCondition = signal<InitialCondition>({
    uuid: '',
    name: '',
    base_parameters: 0,
    base_temperature: 0,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
  });
  isCableNarcisse = signal<boolean>(false);
  isNameUnique = signal<boolean>(true);
  onNameChange(name: string) {
    this.isNameUnique.set(
      !this.initialConditions().find(
        (ic) => ic.name === name && ic.uuid !== this.initialCondition().uuid
      )
    );
  }
  constructor(private readonly cablesService: CablesService) {
    // Initialize initialCondition from input immediately
    effect(() => {
      this.initialCondition.set(this.initialConditionInput());
    });

    effect(() => {
      if (this.isOpen()) {
        this.cablesService.getCables().then((cables) => {
          const sectionCableName = this.section().cable_name;
          if (sectionCableName) {
            this.isCableNarcisse.set(
              !!cables?.find((c) => c.name === sectionCableName)?.is_narcisse
            );
          }
        });
      }
    });
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  onSubmit() {
    this.isOpenChange.emit(false);
    if (this.mode() === 'create') {
      this.addInitialCondition.emit({
        section: this.section(),
        initialCondition: this.initialCondition()
      });
    } else if (this.mode() === 'edit') {
      this.updateInitialCondition.emit({
        section: this.section(),
        initialCondition: this.initialCondition()
      });
    } else if (this.mode() === 'view') {
      // do nothing
    }
  }

  isNumber(value: number): boolean {
    return isNumber(value);
  }
}
