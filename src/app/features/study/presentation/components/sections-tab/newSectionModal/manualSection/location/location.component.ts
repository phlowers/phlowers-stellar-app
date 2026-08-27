import { ChangeDetectionStrategy, Component, computed, effect, input, linkedSignal, output } from '@angular/core';
import { truncateOneDecimalValue } from '@shared/helpers/truncateDecimals';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { LOCATION_CONFIG, LOCATION_ERROR_IDS } from './location.constantes';
import { LocationData } from './location.interfaces';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-location',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, MessageModule, InputGroupModule, InputGroupAddonModule, TranslocoModule],
  templateUrl: './location.component.html',
  styleUrl: './location.component.scss'
})
export class LocationComponent {
  readonly initialLatitude = input<number | null>(null);
  readonly initialLongitude = input<number | null>(null);
  readonly initialAzimuth = input<number | null>(null);

  readonly locationChange = output<LocationData>();

  protected readonly config = LOCATION_CONFIG;

  // Mirrors exactly what is in the DOM, so re-rendering `[value]` never fights an in-progress keystroke.
  protected readonly latitudeText = linkedSignal<string>(() =>
    String(this.initialLatitude() ?? LOCATION_CONFIG.latitude.default)
  );
  protected readonly longitudeText = linkedSignal<string>(() =>
    String(this.initialLongitude() ?? LOCATION_CONFIG.longitude.default)
  );
  protected readonly azimuthText = linkedSignal<string>(() =>
    String(this.initialAzimuth() ?? LOCATION_CONFIG.azimuth.default)
  );

  protected readonly latitudeValue = computed<number | null>(() => this.parseInputValue(this.latitudeText()));
  protected readonly longitudeValue = computed<number | null>(() => this.parseInputValue(this.longitudeText()));
  protected readonly azimuthValue = computed<number | null>(() => this.parseInputValue(this.azimuthText()));

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

  constructor() {
    effect(() => {
      this.emitChange();
    });
  }

  private parseInputValue(raw: string): number | null {
    if (raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private emitChange(): void {
    this.locationChange.emit({
      latitude: this.latitudeValue(),
      longitude: this.longitudeValue(),
      azimuth: this.azimuthValue(),
      isValid: this.isValid()
    });
  }

  onLatitudeInput(event: Event): void {
    this.latitudeText.set((event.target as HTMLInputElement).value);
  }

  onLongitudeInput(event: Event): void {
    this.longitudeText.set((event.target as HTMLInputElement).value);
  }

  onAzimuthInput(event: Event): void {
    this.azimuthText.set(truncateOneDecimalValue((event.target as HTMLInputElement).value));
  }
}
