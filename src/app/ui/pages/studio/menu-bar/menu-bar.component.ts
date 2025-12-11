import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChargesService } from '@core/services/charges/charges.service';
import { Study } from '@core/data/database/interfaces/study';
import { SelectWithButtonsComponent } from '@ui/shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { Section } from '@core/data/database/interfaces/section';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';

@Component({
  selector: 'app-studio-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss',
  imports: [
    FormsModule,
    RouterLink,
    SelectButtonModule,
    DividerModule,
    ToggleSwitchModule,
    SelectModule,
    SelectWithButtonsComponent,
    ButtonComponent,
    IconComponent
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
  selectedChargeCaseUuid = computed(() => {
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
  staffIsPresent = computed(() => {
    const section = this.section();
    const selectedChargeUuid = this.selectedChargeCaseUuid();
    if (!section || !selectedChargeUuid) {
      return false;
    }
    const charge = section.charges?.find((c) => c.uuid === selectedChargeUuid);
    return charge?.personnelPresence;
  });
  constructor(
    public readonly plotService: PlotService,
    private readonly chargesService: ChargesService
  ) {}

  launchChargeFunction(
    functionToLaunch: (
      studyUuid: string,
      sectionUuid: string,
      value: string
    ) => void,
    value: string
  ) {
    if (value) {
      functionToLaunch(
        this.study()?.uuid ?? '',
        this.section()?.uuid ?? '',
        value
      );
    }
  }

  selectChargeCase(chargeCase?: { label: string; value: string }) {
    this.launchChargeFunction(
      this.chargesService.setSelectedCharge.bind(this.chargesService),
      chargeCase?.value ?? ''
    );
  }

  deleteChargeCase(chargeCase?: { label: string; value: string }) {
    this.launchChargeFunction(
      this.chargesService.deleteCharge.bind(this.chargesService),
      chargeCase?.value ?? ''
    );
  }

  duplicateChargeCase(chargeCase?: { label: string; value: string }) {
    this.launchChargeFunction(
      this.chargesService.duplicateCharge.bind(this.chargesService),
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
