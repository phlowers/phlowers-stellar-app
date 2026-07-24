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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

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
    ScaleViewComponent,
    TranslocoModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Top toolbar component providing view controls, display options, and tool/table menus. */
export class StudioTopToolbarComponent implements OnInit {
  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly logger = inject(LoggerService);
  private readonly translocoService = inject(TranslocoService);

  items = signal<MenuItem[] | null>(null);
  toolsDropdown = signal<MenuItem[] | null>(null);

  private readonly spanService = inject(PlotSpanService);
  readonly plotOptionsService = inject(PlotOptionsService);

  private readonly hasCharges = computed(() => !!this.spanService.section()?.charges?.length);

  tablesDropdown = computed<MenuItem[]>(() => [
    {
      label: this.translocoService.translate('studio.topToolbar.loadsTableLabel'),
      disabled: !this.hasCharges(),
      command: () => {
        this.toolbarDialogService.openTool('load-table');
      }
    },
    {
      label: this.translocoService.translate('studio.topToolbar.l0TableLabel'),
      disabled: false,
      command: () => {
        this.toolbarDialogService.openTool('l0-sum');
      }
    },
    {
      label: this.translocoService.translate('studio.topToolbar.poseTableLabel'),
      disabled: false,
      command: () => {
        this.toolbarDialogService.openTool('pose-table');
      }
    },
    {
      label: this.translocoService.translate('studio.topToolbar.obstaclesTableLabel'),
      disabled: true,
      command: () => {
        this.logger.log('Add action triggered');
      }
    },
    {
      label: this.translocoService.translate('studio.topToolbar.groundsTableLabel'),
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
    { label: this.translocoService.translate('studio.topToolbar.profileOption'), value: 'profile' },
    { label: this.translocoService.translate('studio.topToolbar.faceOption'), value: 'face' }
  ]);

  displayOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: this.translocoService.translate('studio.topToolbar.loadsOption'), value: 'loads' },
    { label: this.translocoService.translate('studio.topToolbar.baseOption'), value: 'baseState' },
    {
      label: this.translocoService.translate('studio.topToolbar.transparentBackgroundOption'),
      value: 'transparentBackground'
    },
    { label: this.translocoService.translate('studio.topToolbar.measurementPointsOption'), value: 'measurePoints' }
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
      label: this.translocoService.translate('studio.topToolbar.fieldMeasurementsTool'),
      checked: false,
      disabled: false,
      action: () => {
        this.toolbarDialogService.openTool('field-measuring');
      }
    },
    {
      id: 3,
      label: this.translocoService.translate('studio.topToolbar.vtlAndGuyingTool'),
      checked: false,
      disabled: false,
      action: () => {
        this.toolbarDialogService.openTool('vtl-and-guying');
      }
    },
    {
      id: 4,
      label: this.translocoService.translate('studio.topToolbar.cableMarkingTool'),
      checked: false,
      disabled: true,
      action: () => {
        alert('click Cable marking');
      }
    },
    {
      id: 5,
      label: this.translocoService.translate('studio.topToolbar.strandRrtsTool'),
      checked: false,
      disabled: true,
      action: () => {
        alert('click Strand RRTS');
      }
    },
    {
      id: 6,
      label: this.translocoService.translate('studio.topToolbar.forestTrenchesTool'),
      checked: false,
      disabled: true,
      action: () => {
        alert('click Forest trenches');
      }
    },
    {
      id: 7,
      label: this.translocoService.translate('studio.topToolbar.heightAndLateralDistanceTool'),
      checked: false,
      disabled: true,
      action: () => {
        alert('click Height & lateral distance');
      }
    },
    {
      id: 8,
      label: this.translocoService.translate('studio.topToolbar.cableAdjustmentTool'),
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
