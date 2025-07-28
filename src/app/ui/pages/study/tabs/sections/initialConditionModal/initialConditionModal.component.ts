import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-initial-condition-modal',
  templateUrl: './initialConditionModal.component.html',
  styleUrls: ['./initialConditionModal.component.scss']
})
export class InitialConditionModalComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }
}
