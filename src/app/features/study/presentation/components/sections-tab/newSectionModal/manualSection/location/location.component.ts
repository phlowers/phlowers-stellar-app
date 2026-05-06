import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { truncateOneDecimalValue } from '@shared/helpers/truncateDecimals';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { LOCATION_CONFIG, LOCATION_ERROR_IDS } from './location.constantes';
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
  readonly initialLatitude = input<number | null>(null);
  readonly initialLongitude = input<number | null>(null);
  readonly initialAzimuth = input<number | null>(null);
  readonly useDefaults = input<boolean>(false);

  readonly locationChange = output<LocationData>();
  readonly isValidChange = output<boolean>();

  protected readonly config = LOCATION_CONFIG;

  protected readonly latitudeValue = linkedSignal<number | null>(() => this.initialLatitude() ?? (this.useDefaults() ? LOCATION_CONFIG.latitude.default : null));
  protected readonly longitudeValue = linkedSignal<number | null>(() => this.initialLongitude() ?? (this.useDefaults() ? LOCATION_CONFIG.longitude.default : null));
  protected readonly azimuthValue = linkedSignal<number | null>(() => this.initialAzimuth() ?? (this.useDefaults() ? LOCATION_CONFIG.azimuth.default : null));

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

  protected readonly errorIds = LOCATION_ERROR_IDS;

  protected readonly isValid = computed(
    () =>
      !this.isLatitudeOverMax() &&
      !this.isLatitudeUnderMin() &&
      !this.isLongitudeOverMax() &&
      !this.isLongitudeUnderMin() &&
      !this.isAzimuthOverMax() &&
      !this.isAzimuthUnderMin()
  );

  protected readonly latitudeErrorId = computed<string | null>(() => {
    if (this.isLatitudeOverMax()) return LOCATION_ERROR_IDS.latitude.max;
    if (this.isLatitudeUnderMin()) return LOCATION_ERROR_IDS.latitude.min;
    return null;
  });

  protected readonly longitudeErrorId = computed<string | null>(() => {
    if (this.isLongitudeOverMax()) return LOCATION_ERROR_IDS.longitude.max;
    if (this.isLongitudeUnderMin()) return LOCATION_ERROR_IDS.longitude.min;
    return null;
  });

  protected readonly azimuthErrorId = computed<string | null>(() => {
    if (this.isAzimuthOverMax()) return LOCATION_ERROR_IDS.azimuth.max;
    if (this.isAzimuthUnderMin()) return LOCATION_ERROR_IDS.azimuth.min;
    return null;
  });

  private parseInputValue(raw: string): number | null {
    if (raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private emitChange(): void {
    this.locationChange.emit({
      latitude: this.latitudeValue(),
      longitude: this.longitudeValue(),
      azimuth: this.azimuthValue()
    });
    this.isValidChange.emit(this.isValid());
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
    const input = event.target as HTMLInputElement;
    const truncated = truncateOneDecimalValue(input.value);
    input.value = truncated;
    this.azimuthValue.set(this.parseInputValue(truncated));
    this.emitChange();
  }
}
