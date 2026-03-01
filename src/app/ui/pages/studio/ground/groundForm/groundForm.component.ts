import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotService } from '../../services/plot.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageModule } from 'primeng/message';
import { debounce } from 'lodash';
import { GroundsService } from '../grounds.service';
import { GroundFormService } from './groundForm.service';
import { DEBOUNCED_UPDATE_POINT_DELAY } from './constants';
import { distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-ground-form',
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
    FormsModule
  ],
  templateUrl: './groundForm.component.html',
  styleUrl: './groundForm.component.scss'
})
export class GroundFormComponent {
  private readonly plotService = inject(PlotService);
  public readonly groundsService = inject(GroundsService);
  public readonly groundFormService = inject(GroundFormService);

  readonly altitudeTypeOptions = [
    { label: $localize`Absolute (NGF)`, value: 'absolute' },
    { label: $localize`Relative to support`, value: 'relative' }
  ];

  readonly spansOptions = computed(() => {
    return this.plotService.getSpanOptions();
  });

  readonly supportUuidValue = toSignal(
    this.groundFormService.form.get('supportUuid')!.valueChanges.pipe(distinctUntilChanged()),
    {
      initialValue: this.groundFormService.form.get('supportUuid')?.value ?? null
    }
  );

  private readonly debouncedUpdatePoint = debounce((key: 'x' | 'z', value: number) => {
    const currentIndex = this.groundsService.currentPointIndex();
    const positionGroup = this.groundFormService.positions.at(currentIndex);
    if (positionGroup) {
      positionGroup.get(key)?.setValue(value);
    }
  }, DEBOUNCED_UPDATE_POINT_DELAY);

  private readonly supportUuidEffect = effect(() => {
    this.groundFormService.loadOrResetForSpan(this.supportUuidValue());
  });

  onPositionInput(event: Event, key: 'x' | 'z') {
    const targetValue = (event.target as HTMLInputElement).value;
    const numericValue = parseFloat(targetValue);
    this.debouncedUpdatePoint(key, isNaN(numericValue) ? 0 : numericValue);
  }

  setCurrentGroundPoint(index: number) {
    this.groundsService.setCurrentPointIndex(index);
  }
}
