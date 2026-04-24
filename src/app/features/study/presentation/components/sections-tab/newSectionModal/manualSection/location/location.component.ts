import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { truncateOneDecimal } from '@shared/helpers/truncateDecimals';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { LOCATION_CONFIG } from './location.constantes';
import { LocationData } from './location.interfaces';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-location',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, MessageModule, InputGroupModule, InputGroupAddonModule],
  templateUrl: './location.component.html',
  styleUrl: './location.component.scss'
})
export class LocationComponent {
  readonly initialLatitude = input<number>(LOCATION_CONFIG.latitude.default);
  readonly initialLongitude = input<number>(LOCATION_CONFIG.longitude.default);
  readonly initialAzimuth = input<string>(LOCATION_CONFIG.azimuth.default.toFixed(1)); // To ensure the display of "0.0" as a default value.

  readonly locationChange = output<LocationData>();

  protected readonly config = LOCATION_CONFIG;

  private readonly latitudeValue = signal<number>(LOCATION_CONFIG.latitude.default);
  private readonly longitudeValue = signal<number>(LOCATION_CONFIG.longitude.default);
  private readonly azimuthValue = signal<number>(LOCATION_CONFIG.azimuth.default);

  protected readonly isLatitudeOverMax = computed(() => this.latitudeValue() > this.config.latitude.max);
  protected readonly isLatitudeUnderMin = computed(() => this.latitudeValue() < this.config.latitude.min);
  protected readonly isLongitudeOverMax = computed(() => this.longitudeValue() > this.config.longitude.max);
  protected readonly isLongitudeUnderMin = computed(() => this.longitudeValue() < this.config.longitude.min);
  protected readonly isAzimuthOverMax = computed(() => this.azimuthValue() > this.config.azimuth.max);
  protected readonly isAzimuthUnderMin = computed(() => this.azimuthValue() < this.config.azimuth.min);

  private emitChange(): void {
    this.locationChange.emit({
      latitude: this.latitudeValue(),
      longitude: this.longitudeValue(),
      azimuth: this.azimuthValue()
    });
  }

  onLatitudeInput(event: Event): void {
    this.latitudeValue.set(+(event.target as HTMLInputElement).value);
    this.emitChange();
  }

  onLongitudeInput(event: Event): void {
    this.longitudeValue.set(+(event.target as HTMLInputElement).value);
    this.emitChange();
  }

  onAzimuthInput(event: Event): void {
    truncateOneDecimal(event);
    this.azimuthValue.set(+(event.target as HTMLInputElement).value);
    console.log((event.target as HTMLInputElement).value);
    this.emitChange();
  }
}
