import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
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
  readonly initialAzimuth = input<number>(LOCATION_CONFIG.azimuth.default);

  readonly locationChange = output<LocationData>();

  protected readonly config = LOCATION_CONFIG;

  protected readonly latitudeValue = linkedSignal<number | null>(() => this.initialLatitude());
  protected readonly longitudeValue = linkedSignal<number | null>(() => this.initialLongitude());
  protected readonly azimuthValue = linkedSignal<number | null>(() => this.initialAzimuth());

  /** Formats the azimuth for display: integers show one decimal (e.g. 0 → "0.0"). */
  protected readonly azimuthDisplay = computed(() => {
    const v = this.azimuthValue();
    if (v === null) return '';
    return Number.isInteger(v) ? v.toFixed(1) : v;
  });

  protected readonly isLatitudeOverMax = computed(() => {
    const v = this.latitudeValue();
    return v !== null && v > this.config.latitude.max;
  });
  protected readonly isLatitudeUnderMin = computed(() => {
    const v = this.latitudeValue();
    return v !== null && v < this.config.latitude.min;
  });
  protected readonly isLongitudeOverMax = computed(() => {
    const v = this.longitudeValue();
    return v !== null && v > this.config.longitude.max;
  });
  protected readonly isLongitudeUnderMin = computed(() => {
    const v = this.longitudeValue();
    return v !== null && v < this.config.longitude.min;
  });
  protected readonly isAzimuthOverMax = computed(() => {
    const v = this.azimuthValue();
    return v !== null && v > this.config.azimuth.max;
  });
  protected readonly isAzimuthUnderMin = computed(() => {
    const v = this.azimuthValue();
    return v !== null && v < this.config.azimuth.min;
  });

  private parseInputValue(raw: string): number | null {
    if (raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private emitChange(): void {
    const lat = this.latitudeValue();
    const lon = this.longitudeValue();
    const az = this.azimuthValue();
    if (lat === null || lon === null || az === null) return;
    this.locationChange.emit({ latitude: lat, longitude: lon, azimuth: az });
  }

  onLatitudeInput(event: Event): void {
    this.latitudeValue.set(this.parseInputValue((event.target as HTMLInputElement).value));
    this.emitChange();
  }

  onLongitudeInput(event: Event): void {
    this.longitudeValue.set(this.parseInputValue((event.target as HTMLInputElement).value));
    this.emitChange();
  }

  onAzimuthInput(event: Event): void {
    truncateOneDecimal(event);
    this.azimuthValue.set(this.parseInputValue((event.target as HTMLInputElement).value));
    this.emitChange();
  }
}
