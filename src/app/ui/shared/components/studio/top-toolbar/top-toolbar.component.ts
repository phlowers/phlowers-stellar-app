import { Component, signal } from '@angular/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

@Component({
  selector: 'app-studio-top-toolbar',
  templateUrl: './top-toolbar.component.html',
  styleUrl: './top-toolbar.component.scss',
  imports: [SelectButtonModule, FormsModule, DividerModule, ToggleSwitchModule]
})
export class StudioTopToolbarComponent {
  constructor(public readonly plotService: PlotService) {}
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
}
