import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { distinctUntilChanged, filter } from 'rxjs';
import { PlotService } from '@services/plot/plot.service';
import { DialogModule } from 'primeng/dialog';
import { ConformityComponent } from '../conformity/conformity.component';
import { NotificationService } from '@services/notification/notification.service';
import { StorageService } from '@services/storage/storage.service';

/** Component providing the obstacle creation and editing form in the studio sidebar. */
@Component({
  selector: 'app-obstacles-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    MessageModule,
    ButtonComponent,
    IconComponent,
    ToggleSwitchModule,
    FormsModule,
    DecimalPipe,
    DialogModule,
    ConformityComponent
  ],
  templateUrl: './obstaclesForm.component.html',
  styleUrl: './obstaclesForm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObstaclesFormComponent {
  private readonly spanService = inject(PlotSpanService);
  public readonly plotOptionsService = inject(PlotOptionsService);
  public readonly obstaclesService = inject(ObstaclesService);
  public readonly obstacleFormService = inject(ObstacleFormService);
  private readonly plotService = inject(PlotService);
  private readonly notificationService = inject(NotificationService);
  private readonly storageService = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isConformityModalOpen = signal(false);
  readonly conformityRef = viewChild(ConformityComponent);
  readonly obstacleTypeOptions = signal<{ label: string; value: string }[]>([]);
  readonly isCalculating = computed(
    () => this.obstacleFormService.isCalculatingObstacle() || this.plotService.loading()
  );

  constructor() {
    this.obstaclesService.ready
      .pipe(
        filter((ready) => ready),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(async () => {
        const obstacleTypes = await this.obstaclesService.getObstacleTypes();
        if (obstacleTypes) {
          this.obstacleTypeOptions.set(
            obstacleTypes.map((type) => ({
              label: type.obstacle_type_name,
              value: type.obstacle_type
            }))
          );
        }
      });
  }

  readonly altitudeTypeOptions = [
    { label: $localize`Absolute (NGF)`, value: 'absolute' },
    { label: $localize`Relative to support`, value: 'relative' },
    { label: $localize`Relative to cable attachment`, value: 'relative_cable' }
  ];

  readonly lateralDistanceTypeOptions = [{ label: $localize`Span axis`, value: 'SPAN_AXIS' }];

  readonly spansOptions = computed(() => {
    return this.spanService.getSpanOptions();
  });

  readonly supportUuidValue = toSignal(
    this.obstacleFormService.form.get('supportUuid')!.valueChanges.pipe(distinctUntilChanged()),
    {
      initialValue: this.obstacleFormService.form.get('supportUuid')?.value ?? null
    }
  );

  private firstSupportUuidEffectRun = true;

  private readonly supportUuidEffect = effect(() => {
    const supportUuid = this.supportUuidValue();
    if (this.firstSupportUuidEffectRun) {
      this.firstSupportUuidEffectRun = false;
      return;
    }
    if (!supportUuid) {
      this.plotOptionsService.isFreePositioningMode.set(false);
    }
    // Skip reset when editing an existing saved obstacle — the span dropdown re-emitting
    // (e.g. after PrimeNG refreshes its options following a section save) must not wipe the form.
    const currentFormUuid = untracked(() => this.obstacleFormService.form.value.uuid);
    const isEditingExisting =
      !!currentFormUuid &&
      untracked(() => !!this.spanService.section()?.obstacles?.some((o) => o.uuid === currentFormUuid));
    if (isEditingExisting) {
      return;
    }
    this.obstacleFormService.resetFormForNewObstacle(supportUuid);
    if (supportUuid) {
      untracked(() => this.obstacleFormService.returnToSpan());
    }
  });

  onPositionInput(event: Event, key: 'x' | 'y' | 'z') {
    const targetValue = (event.target as HTMLInputElement).value;
    const numericValue = Number.parseFloat(targetValue);
    const currentIndex = this.obstaclesService.activePointIndex() ?? 0;
    const positionGroup = this.obstacleFormService.positions.at(currentIndex);
    if (positionGroup) {
      positionGroup.get(key)?.setValue(Number.isNaN(numericValue) ? 0 : numericValue);
    }
  }

  setCurrentObstaclePoint(index: number) {
    this.obstaclesService.setCurrentPointIndex(index);
  }

  async openConformityModal(): Promise<void> {
    const warnings: string[] = [];

    const uuid = this.obstacleFormService.form.value.uuid;
    const isSaved = !!uuid;
    if (!isSaved) {
      warnings.push($localize`obstacle must be saved`);
    }

    const obstacleType = this.obstacleFormService.form.value.type;
    if (isSaved && obstacleType) {
      const db = this.storageService.db;
      const distanceCount = db ? await db.catObstacleDistances.where('obstacle_type').equals(obstacleType).count() : 0;
      if (distanceCount === 0) {
        const typeLabel = this.obstacleTypeOptions().find((o) => o.value === obstacleType)?.label ?? obstacleType;
        warnings.push($localize`obstacle type '${typeLabel}' is not eligible for conformity control`);
      }
    }

    if (!this.spanService.section()?.voltage_idr) {
      warnings.push($localize`study must have an electric tension level`);
    }

    if (warnings.length > 0) {
      const summary =
        warnings.length === 1
          ? $localize`You cannot open conformity control because this condition is not met:`
          : $localize`You cannot open conformity control because these conditions are not met:`;
      this.notificationService.warningList(warnings, summary);
      return;
    }

    this.isConformityModalOpen.set(true);
  }
}
