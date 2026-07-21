/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { PopoverModule } from 'primeng/popover';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SpeedDialModule } from 'primeng/speeddial';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { SelectWithButtonsComponent } from '@shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { PrimeDebugRowComponent } from './prime-debug-row/prime-debug-row.component';
import { DEMO_OPTIONS, TABLE_ROWS, TOOLS_MENU_ITEMS } from './prime-debug.constantes';

/**
 * Dev-only showcase of every PrimeNG component that has a style override in
 * src/styles/vendor-extension/primeng, including every contextual variant of
 * those overrides used across the app. Meant to catch visual regressions
 * after PrimeNG/Angular upgrades. Never bundled in production (see dev-routes.ts).
 */
@Component({
  selector: 'app-prime-debug',
  standalone: true,
  imports: [
    FormsModule,
    AccordionModule,
    CheckboxModule,
    TableModule,
    DialogModule,
    DividerModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    PaginatorModule,
    PanelModule,
    PopoverModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    SelectModule,
    SelectButtonModule,
    SpeedDialModule,
    TabsModule,
    TextareaModule,
    ToastModule,
    ToggleButtonModule,
    ToggleSwitchModule,
    IconComponent,
    ButtonComponent,
    SelectWithButtonsComponent,
    PrimeDebugRowComponent
  ],
  providers: [MessageService],
  templateUrl: './prime-debug.component.html',
  styleUrl: './prime-debug.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrimeDebugComponent {
  private readonly messageService = inject(MessageService);

  readonly demoOptions = DEMO_OPTIONS;
  readonly toolsMenuItems = TOOLS_MENU_ITEMS;
  readonly tableRows = TABLE_ROWS;

  readonly accordionValue = signal('0');
  readonly studyHeaderAccordionValue = signal('0');

  readonly checkboxValue = signal(false);
  readonly radioValue = signal('plan');
  readonly toggleSwitchValue = signal(false);
  readonly toggleButtonValue = signal(false);
  readonly selectButtonValue = signal('a');

  readonly inputTextValue = signal('');
  readonly invalidInputTextValue = signal('');
  readonly inputNumberValue = signal(5);
  readonly inputNumberHorizontalValue = signal(2);
  readonly textareaValue = signal('');

  readonly selectValue = signal<string | null>(null);
  readonly selectWithButtonsValue = signal<string | null | undefined>('a');
  readonly menubarSelectValue = signal<string | null | undefined>('b');

  readonly multiSelectValues = signal<string[]>(['a']);
  readonly toolbarMultiSelectValues = signal<string[]>(['a']);

  readonly dialogVisible = signal(false);

  showToast(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Toast',
      detail: 'This is a p-toast message with the app override applied.'
    });
  }
}
