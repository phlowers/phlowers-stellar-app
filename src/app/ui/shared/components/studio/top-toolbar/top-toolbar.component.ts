import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { SpeedDialModule } from 'primeng/speeddial';
import { MenuItem } from 'primeng/api';
import { PlotService } from '@ui/pages/studio/plot.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';

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
    SpeedDialModule
  ]
})
export class StudioTopToolbarComponent implements OnInit {
  items = signal<MenuItem[] | null>(null);
  tablesDropdown = signal<MenuItem[] | null>(null);
  toolsDropdown = signal<MenuItem[] | null>(null);

  constructor(public readonly plotService: PlotService) {}

  ngOnInit(): void {
    this.tablesDropdown.set([
      {
        label: $localize`Load table`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Pose table`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Obstacle table`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Ground table`,
        command: () => {
          console.log('Add action triggered');
        }
      }
    ]);

    this.toolsDropdown.set([
      {
        label: $localize`Field measurment`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`L0 sum`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Guying qqchose`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Cable marquing`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`CRR de brins coupés`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Vegeo report`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Free height & lateral distance`,
        command: () => {
          console.log('Add action triggered');
        }
      },
      {
        label: $localize`Cable setting`,
        command: () => {
          console.log('Add action triggered');
        }
      }
    ]);
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
    { label: $localize`Obstacles`, value: 'mesh' },
    { label: $localize`Ground`, value: 'ground' },
    { label: $localize`Angle en ligne`, value: 'angleInLine' },
    { label: $localize`Measure`, value: 'measure' }
  ]);

  displayOptionsStatus = signal<boolean>(false);
}
