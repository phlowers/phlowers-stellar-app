import { Component, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';

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
    FormsModule
  ]
})
export class InitialConditionModalComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();
  section = input.required<Section>();
  addInitialCondition = output<{
    section: Section;
    initialCondition: InitialCondition;
  }>();
  initialCondition = signal<InitialCondition>({
    uuid: uuidv4(),
    name: '',
    base_parameters: '',
    base_temperature: 0
  });

  constructor(private messageService: MessageService) {}

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  onSubmit() {
    this.isOpenChange.emit(false);
    this.addInitialCondition.emit({
      section: this.section(),
      initialCondition: this.initialCondition()
    });
    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Initial condition added successfully`,
      life: 3000
    });
  }
}
