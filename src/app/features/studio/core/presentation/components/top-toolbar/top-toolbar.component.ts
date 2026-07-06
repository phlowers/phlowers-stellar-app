import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { SpeedDialModule } from 'primeng/speeddial';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { ScaleViewComponent } from './scale-view/scale-view.component';
import { LoggerService } from '@core/services/logger/logger.service';

@Component({
  selector: 'app-studio-top-toolbar',
  templateUrl: './top-toolbar.component.html',
  styleUrl: './top-toolbar.component.scss',
  imports: [
    SelectButtonModule,
    FormsModule,
    DividerModule,
    ToggleSwitchModule,
    MultiSelectModule,
    IconComponent,
    SpeedDialModule,
    DialogModule,
    CheckboxModule,
    ButtonComponent,
    ScaleViewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Top toolbar component providing view controls, display options, and tool/table menus. */
export class StudioTopToolbarComponent implements OnInit {
  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly logger = inject(LoggerService);

  items = signal<MenuItem[] | null>(null);
  toolsDropdown = signal<MenuItem[] | null>(null);

  private readonly spanService = inject(PlotSpanService);
  readonly plotOptionsService = inject(PlotOptionsService);

  private readonly hasCharges = computed(() => !!this.spanService.section()?.charges?.length);

  tablesDropdown = computed<MenuItem[]>(() => [
    {
      label: $localize`Loads table`, // Tableau de charges
      disabled: !this.hasCharges(),
      command: () => {
        this.toolbarDialogService.openTool('load-table');
      }
    },
    {
      label: $localize`L0 table`, // Tableau L0
      disabled: false,
      command: () => {
        this.toolbarDialogService.openTool('l0-sum');
      }
    },
    {
      label: $localize`Pose table`, // Tableau de pose
      disabled: false,
      command: () => {
        this.toolbarDialogService.openTool('pose-table');
      }
    },
    {
      label: $localize`Obstacles table`, // Tableau d'obstacles
      disabled: true,
      command: () => {
        this.logger.log('Add action triggered');
      }
    },
    {
      label: $localize`Grounds table`, // Tableau de sols
      disabled: true,
      command: () => {
        this.logger.log('Add action triggered');
      }
    }
  ]);

  shortcutsModal = signal<boolean>(false);
  shortcutsCount = signal<number>(0);
  readonly plotService = inject(PlotService);

  ngOnInit(): void {
    this.loadToolsItemsState();

    this.toolsDropdown.set(
      this.toolsItems().map((item) => ({
        label: item.label,
        disabled: item.disabled,
        command: () => {
          item.action();
        }
      }))
    );
  }

  threeDOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: '3D', value: '3d' },
    { label: '2D', value: '2d' }
  ]);

  sideOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: $localize`Profile`, value: 'profile' },
    { label: $localize`Face`, value: 'face' }
  ]);

  displayOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: $localize`Loads`, value: 'loads' },
    { label: $localize`Base`, value: 'baseState' },
    { label: $localize`Transparent background`, value: 'transparentBackground' },
    { label: $localize`Measurement points`, value: 'measurePoints' }
    // { label: $localize`Obstacles`, value: 'mesh' },
    // { label: $localize`Ground`, value: 'ground' },
    // { label: $localize`In line angle`, value: 'angleInLine' },
    // { label: $localize`Measure`, value: 'measure' }
  ]);

  selectedDisplayOptions = computed(() =>
    Object.keys(this.plotOptionsService.selectedDisplayOptions()).map((key) => ({
      label: key,
      value: key
    }))
  );

  selectedDisplayValues = computed(() => {
    const values = [];
    const options = this.plotOptionsService.selectedDisplayOptions();
    for (const key in options) {
      if (options[key as keyof typeof options]) {
        values.push(key);
      }
    }
    return values;
  });

  setSelectedDisplayOptions(selectedDisplayOptions: string[]): void {
    this.plotOptionsService.selectedDisplayOptions.set({
      loads: selectedDisplayOptions.includes('loads'),
      baseState: selectedDisplayOptions.includes('baseState'),
      transparentBackground: selectedDisplayOptions.includes('transparentBackground'),
      measurePoints: selectedDisplayOptions.includes('measurePoints')
    });
  }

  displayOptionsStatus = signal<boolean>(false);

  toolsItems = signal<
    {
      id: number;
      label: string;
      checked: boolean;
      disabled: boolean;
      action: () => void;
    }[]
  >([
    {
      id: 1,
      label: $localize`Field measurements`, // Mesures terrain
      checked: false,
      disabled: false,
      action: () => {
        this.toolbarDialogService.openTool('field-measuring');
      }
    },
    {
      id: 3,
      label: $localize`VTL & Guying`, // VTL & haubanage
      checked: false,
      disabled: false,
      action: () => {
        this.toolbarDialogService.openTool('vtl-and-guying');
      }
    },
    {
      id: 4,
      label: $localize`Cable marking`, // Marquage câble
      checked: false,
      disabled: true,
      action: () => {
        alert('click Cable marking');
      }
    },
    {
      id: 5,
      label: $localize`Strand RRTS`, // CRR de brin
      checked: false,
      disabled: true,
      action: () => {
        alert('click Strand RRTS');
      }
    },
    {
      id: 6,
      label: $localize`Forest trenches`, // Rapport Vegeo
      checked: false,
      disabled: true,
      action: () => {
        alert('click Forest trenches');
      }
    },
    {
      id: 7,
      label: $localize`Height & lateral distance`, // Hauteur libre & distance latérale
      checked: false,
      disabled: true,
      action: () => {
        alert('click Height & lateral distance');
      }
    },
    {
      id: 8,
      label: $localize`Cable adjustment`, // Réglage câble
      checked: false,
      disabled: true,
      action: () => {
        alert('click Cable adjustment');
      }
    }
  ]);

  checkedCount = computed(() => this.toolsItems().filter((item) => item.checked).length);

  updateCheckedCount(): void {
    this.toolsItems.set([...this.toolsItems()]);
    this.saveToolsItemsState();
  }

  private saveToolsItemsState(): void {
    const state = this.toolsItems().map((item) => ({
      id: item.id,
      checked: item.checked
    }));
    localStorage.setItem('toolsItemsState', JSON.stringify(state));
  }

  private loadToolsItemsState(): void {
    const savedState = localStorage.getItem('toolsItemsState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState) as {
          id: number;
          checked: boolean;
        }[];
        const currentItems = this.toolsItems();

        const updatedItems = currentItems.map((item) => {
          const savedItem = state.find((s) => s.id === item.id);
          return savedItem ? { ...item, checked: savedItem.checked } : item;
        });

        this.toolsItems.set(updatedItems);
      } catch (error) {
        this.logger.error('Error loading tools items state:', error);
      }
    }
  }
}
