import { Component, computed, input, signal } from '@angular/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { SelectModule } from 'primeng/select';
import { RouterLink } from '@angular/router';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { SelectWithButtonsComponent } from '../../atoms/select-with-buttons/select-with-buttons.component';

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
  chargeCases = signal<{ label: string; value: string }[]>([
    {
      label: 'Charge case 1',
      value: 'charge-case-1'
    },
    {
      label: 'Charge case 2',
      value: 'charge-case-2'
    },
    {
      label: 'Charge case 3',
      value: 'charge-case-3'
    }
  ]);
  selectedChargeCase = signal<string | null>(null);
  initialCondition = computed(() =>
    this.section()?.initial_conditions.find(
      (ic) => ic.uuid === this.section()?.selected_initial_condition_uuid
    )
  );
  staffIsPresent = signal(false);
  constructor(public readonly plotService: PlotService) {}

  selectChargeCase(chargeCase?: { label: string; value: string }) {
    this.selectedChargeCase.set(chargeCase?.value ?? null);
  }
}
