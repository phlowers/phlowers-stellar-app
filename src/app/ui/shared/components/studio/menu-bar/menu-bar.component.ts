import { Component, computed, input, output, signal } from '@angular/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PlotService } from '@ui/pages/studio/plot.service';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { Section } from '@core/data/database/interfaces/section';
import { SelectModule } from 'primeng/select';
import { RouterLink } from '@angular/router';
import { Study } from '@core/data/database/interfaces/study';
import { SelectWithButtonsComponent } from '../../atoms/select-with-buttons/select-with-buttons.component';
import { ChargesService } from '@core/services/charges/charges.service';

@Component({
  selector: 'app-studio-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss',
  imports: [
    SelectButtonModule,
    FormsModule,
    DividerModule,
    ToggleSwitchModule,
    ButtonComponent,
    IconComponent,
    SelectModule,
    RouterLink,
    SelectWithButtonsComponent
  ]
})
export class StudioMenuBarComponent {
  section = input.required<Section | null>();
  study = input.required<Study | null>();
  openNewChargeModal = output<{
    mode: 'create' | 'edit' | 'view';
    uuid: string | null;
  }>();
  chargeCases = computed(
    () =>
      this.section()?.charges?.map((c) => ({ label: c.name, value: c.uuid })) ??
      []
  );
  selectedChargeCase = computed(() => {
    return (
      this.study()?.sections.find((s) => s?.uuid === this.section()?.uuid)
        ?.selected_charge_uuid ?? null
    );
  });
  initialCondition = computed(() =>
    this.section()?.initial_conditions.find(
      (ic) => ic.uuid === this.section()?.selected_initial_condition_uuid
    )
  );
  staffIsPresent = signal(false);
  constructor(
    public readonly plotService: PlotService,
    private readonly chargesService: ChargesService
  ) {}

  launchChargeFunction(
    functionToLaunch: (
      value: string,
      studyUuid: string,
      sectionUuid: string
    ) => void,
    value: string
  ) {
    if (value) {
      functionToLaunch(
        value,
        this.study()?.uuid ?? '',
        this.section()?.uuid ?? ''
      );
    }
  }

  selectChargeCase(chargeCase?: { label: string; value: string }) {
    this.launchChargeFunction(
      this.chargesService.setSelectedCharge,
      chargeCase?.value ?? ''
    );
  }

  deleteChargeCase(chargeCase?: { label: string; value: string }) {
    this.launchChargeFunction(
      this.chargesService.deleteCharge,
      chargeCase?.value ?? ''
    );
  }

  duplicateChargeCase(chargeCase?: { label: string; value: string }) {
    this.launchChargeFunction(
      this.chargesService.duplicateCharge,
      chargeCase?.value ?? ''
    );
  }

  viewOrEditChargeCase(
    chargeCase: { label: string; value: string },
    mode: 'view' | 'edit'
  ) {
    if (chargeCase?.value) {
      this.openNewChargeModal.emit({ mode, uuid: chargeCase.value });
    }
  }
}
