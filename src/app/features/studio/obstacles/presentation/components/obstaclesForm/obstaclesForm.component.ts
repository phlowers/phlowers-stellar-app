import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotService } from '@features/studio/core/services/plot.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchChangeEvent, ToggleSwitchModule } from 'primeng/toggleswitch';
import { debounce } from 'lodash';
import { ObstaclesService } from '@features/studio/obstacles/infrastructure/services/obstacles.service';
import { ObstacleFormService } from '../../services/obstaclesForm.service';
import { DEBOUNCED_UPDATE_POINT_DELAY } from './constants';
import { distinctUntilChanged, filter } from 'rxjs';

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
    FormsModule
  ],
  templateUrl: './obstaclesForm.component.html',
  styleUrl: './obstaclesForm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObstaclesFormComponent {
  public readonly plotService = inject(PlotService);
  public readonly obstaclesService = inject(ObstaclesService);
  public readonly obstacleFormService = inject(ObstacleFormService);
  private readonly destroyRef = inject(DestroyRef);

  readonly obstacleTypeOptions = signal<{ label: string; value: string }[]>([]);

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
    { label: $localize`Relative to support`, value: 'relative' }
  ];

  readonly lateralDistanceTypeOptions = [
    { label: $localize`Span axis`, value: 'SPAN_AXIS' },
    { label: $localize`Line axis`, value: 'LINE_AXIS' }
  ];

  readonly spansOptions = computed(() => {
    return this.plotService.getSpanOptions();
  });

  readonly supportUuidValue = toSignal(
    this.obstacleFormService.form.get('supportUuid')!.valueChanges.pipe(distinctUntilChanged()),
    {
      initialValue: this.obstacleFormService.form.get('supportUuid')?.value ?? null
    }
  );

  private readonly debouncedUpdatePoint = debounce((key: 'x' | 'y' | 'z', value: number) => {
    const currentIndex = this.obstaclesService.currentPointIndex();
    const positionGroup = this.obstacleFormService.positions.at(currentIndex);
    if (positionGroup) {
      positionGroup.get(key)?.setValue(value);
    }
  }, DEBOUNCED_UPDATE_POINT_DELAY);

  private readonly supportUuidEffect = effect(() => {
    const supportUuid = this.supportUuidValue();
    if (!supportUuid) {
      this.plotService.isFreePositioningMode.set(false);
    }
    this.obstacleFormService.resetFormForNewObstacle(supportUuid);
  });

  onPositionInput(event: Event, key: 'x' | 'y' | 'z') {
    const targetValue = (event.target as HTMLInputElement).value;
    const numericValue = parseFloat(targetValue);
    this.debouncedUpdatePoint(key, isNaN(numericValue) ? 0 : numericValue);
  }

  setCurrentObstaclePoint(index: number) {
    this.obstaclesService.setCurrentPointIndex(index);
  }

  freePositioningChange(event: ToggleSwitchChangeEvent) {
    this.plotService.isFreePositioningMode.set(event.checked);
  }
}
