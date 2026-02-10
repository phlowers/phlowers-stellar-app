import { Component, computed, DestroyRef, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotService } from '../../services/plot.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { debounce } from 'lodash';
import { ObstaclesService } from '../obstacles.service';
import { ObstacleFormService } from './obstaclesForm.service';
import { DEBOUNCED_UPDATE_POINT_DELAY } from './constants';

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
  styleUrl: './obstaclesForm.component.scss'
})
export class ObstaclesFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly plotService = inject(PlotService);
  public readonly obstaclesService = inject(ObstaclesService);
  public readonly obstacleFormService = inject(ObstacleFormService);

  readonly obstacleTypeOptions = [
    { label: $localize`House`, value: 'Maison' },
    { label: $localize`Building`, value: 'Batiment' },
    { label: $localize`Tree`, value: 'Arbre' },
    { label: $localize`Other`, value: 'Autre' }
  ];

  readonly altitudeTypeOptions = [
    { label: $localize`Absolute (NGF)`, value: 'absolute' },
    { label: $localize`Relative to support`, value: 'relative' }
  ];

  readonly lateralDistanceTypeOptions = [
    { label: $localize`Span axis`, value: 'span_axis' },
    { label: $localize`Line axis`, value: 'line_axis' }
  ];

  readonly spansOptions = computed(() => {
    return this.plotService.getSpanOptions();
  });

  private readonly debouncedUpdatePoint = debounce(
    (key: 'x' | 'y' | 'z', value: number) => {
      const currentIndex = this.obstaclesService.currentPointIndex();
      const positionGroup = this.obstacleFormService.positions.at(currentIndex);
      if (positionGroup) {
        positionGroup.get(key)?.setValue(value);
      }
    },
    DEBOUNCED_UPDATE_POINT_DELAY
  );

  constructor() {
    this.obstacleFormService.form
      .get('supportUuid')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) =>
        this.obstacleFormService.resetFormForNewObstacle(value)
      );

    toObservable(this.obstaclesService.currentPointIndex).subscribe((index) => {
      console.log('currentPointIndex in obstaclesForm is', index);
    });
  }

  onPositionInput(event: Event, key: 'x' | 'y' | 'z') {
    const targetValue = (event.target as HTMLInputElement).value;
    const numericValue = parseFloat(targetValue);
    if (!isNaN(numericValue)) {
      this.debouncedUpdatePoint(key, numericValue);
    }
  }

  freePositioningChange(event: { checked: boolean }) {
    this.plotService.isFreePositioningMode.set(event.checked);
  }

  setCurrentObstaclePoint(index: number) {
    this.obstaclesService.setCurrentPointIndex(index);
  }
}
