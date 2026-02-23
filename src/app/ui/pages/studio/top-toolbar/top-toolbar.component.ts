import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolbarDialogService } from '../toolbar-dialog/toolbar-dialog.service';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { SpeedDialModule } from 'primeng/speeddial';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';

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
    ButtonComponent
  ]
})
/** Top toolbar component providing view controls, display options, and tool/table menus. */
export class StudioTopToolbarComponent implements OnInit {
  private readonly toolbarDialogService = inject(ToolbarDialogService);

  items = signal<MenuItem[] | null>(null);
  toolsDropdown = signal<MenuItem[] | null>(null);

  private readonly hasCharges = computed(() => !!this.plotService.section()?.charges?.length);

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
      disabled: true,
      command: () => {
        console.log('Add action triggered');
      }
    },
    {
      label: $localize`Obstacles table`, // Tableau d'obstacles
      disabled: true,
      command: () => {
        console.log('Add action triggered');
      }
    },
    {
      label: $localize`Grounds table`, // Tableau de sols
      disabled: true,
      command: () => {
        console.log('Add action triggered');
      }
    }
  ]);

  shortcutsModal = signal<boolean>(false);
  shortcutsCount = signal<number>(0);

  constructor(public readonly plotService: PlotService) {}

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
    { label: $localize`Base`, value: 'baseState' }
    // { label: $localize`Obstacles`, value: 'mesh' },
    // { label: $localize`Ground`, value: 'ground' },
    // { label: $localize`In line angle`, value: 'angleInLine' },
    // { label: $localize`Measure`, value: 'measure' }
  ]);

  selectedDisplayOptions = computed(() =>
    Object.keys(this.plotService.selectedDisplayOptions()).map((key) => ({
      label: key,
      value: key
    }))
  );

  selectedDisplayValues = computed(() => {
    const values = [];
    for (const key in this.plotService.selectedDisplayOptions()) {
      if ((this.plotService.selectedDisplayOptions() as any)[key]) {
        values.push(key);
      }
    }
    return values;
  });

  setSelectedDisplayOptions(selectedDisplayOptions: string[]): void {
    this.plotService.selectedDisplayOptions.set({
      loads: selectedDisplayOptions.includes('loads'),
      baseState: selectedDisplayOptions.includes('baseState')
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
        console.error('Error loading tools items state:', error);
      }
    }
  }
}
