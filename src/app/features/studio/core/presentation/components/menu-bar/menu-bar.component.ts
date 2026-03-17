import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChargesService } from '@services/charges/charges.service';
import { Section, Study } from '@shared/domain';
import { SelectWithButtonsComponent } from '@shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PlotService } from '@services/plot/plot.service';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Menu bar component for the studio page, handling charge case selection and actions. */
export class StudioMenuBarComponent {
  /** Current section data. */
  section = input.required<Section | null>();
  /** Current study data. */
  study = input.required<Study | null>();
  /** Emits when the user requests to open the new charge modal. */
  openNewChargeModal = output<void>();
  charges = computed(
    () =>
      this.section()?.charges?.map((c) => ({
        label: c.name,
        value: c.uuid
      })) ?? []
  );
  selectedChargeCaseUuid = computed(() => {
    return this.study()?.sections.find((s) => s?.uuid === this.section()?.uuid)?.selected_charge_uuid ?? null;
  });
  initialCondition = computed(() =>
    this.section()?.initial_conditions.find((ic) => ic.uuid === this.section()?.selected_initial_condition_uuid)
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
  private readonly toolbarDialogService = inject(ToolbarDialogService);
  readonly plotService = inject(PlotService);
  private readonly chargesService = inject(ChargesService);

  launchChargeFunction(
    functionToLaunch: (studyUuid: string, sectionUuid: string, value: string) => void,
    value: string
  ) {
    if (value) {
      functionToLaunch(this.study()?.uuid ?? '', this.section()?.uuid ?? '', value);
    }
  }

  selectChargeCase(charge?: { label: string; value: string }) {
    this.launchChargeFunction(this.chargesService.setSelectedCharge.bind(this.chargesService), charge?.value ?? '');
  }

  deleteChargeCase(charge?: { label: string; value: string }) {
    this.launchChargeFunction(this.chargesService.deleteCharge.bind(this.chargesService), charge?.value ?? '');
  }

  duplicateChargeCase(charge?: { label: string; value: string }) {
    this.launchChargeFunction(this.chargesService.duplicateCharge.bind(this.chargesService), charge?.value ?? '');
  }

  viewOrEditChargeCase(charge: { label: string; value: string }, mode: 'view' | 'edit') {
    if (charge?.value) {
      this.toolbarDialogService.openTool('load-table', {
        mode,
        chargeUuid: charge.value
      });
    }
  }
}
