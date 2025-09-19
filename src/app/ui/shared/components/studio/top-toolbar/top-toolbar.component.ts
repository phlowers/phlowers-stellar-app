import { Component, signal } from '@angular/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-studio-top-toolbar',
  templateUrl: './top-toolbar.component.html',
  styleUrl: './top-toolbar.component.scss',
  imports: [SelectButtonModule, FormsModule, DividerModule, ToggleSwitchModule]
})
export class StudioTopToolbarComponent {
  threeDOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: '2D', value: '2d' },
    { label: '3D', value: '3d' }
  ]);
  threeDChecked = signal<string>('2d');
  sideOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: 'Profile', value: 'profile' },
    { label: 'Face', value: 'face' }
  ]);
  sideChecked = signal<string>('profile');
  toggleInvert = signal<boolean>(false);
}
