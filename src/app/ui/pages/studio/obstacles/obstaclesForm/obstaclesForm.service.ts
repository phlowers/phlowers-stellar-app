import { inject, Injectable, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { PlotService } from '../../services/plot.service';
import { Obstacle, ObstaclePosition } from '@core/domain/models/obstacle.model';
import { SectionService } from '@core/services/sections/section.service';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';
import { ObstaclesService } from '../obstacles.service';
import { defaultObstacleForm } from './constants';

@Injectable({
  providedIn: 'root'
})
export class ObstacleFormService {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly sectionService = inject(SectionService);
  private readonly messageService = inject(MessageService);

  form: FormGroup<{
    uuid: FormControl<string | null>;
    name: FormControl<string | null>;
    type: FormControl<string | null>;
    supportUuid: FormControl<string | null>;
    referenceSupport: FormControl<number | null>;
    altitudeType: FormControl<string | null>;
    lateralDistanceType: FormControl<string | null>;
    positions: FormArray<
      FormGroup<{
        x: FormControl<number | null>;
        y: FormControl<number | null>;
        z: FormControl<number | null>;
      }>
    >;
  }> = this.fb.group({
    uuid: [defaultObstacleForm.uuid],
    name: [defaultObstacleForm.name, Validators.required],
    type: [defaultObstacleForm.type, Validators.required],
    supportUuid: [defaultObstacleForm.supportUuid, Validators.required],
    referenceSupport: [
      defaultObstacleForm.referenceSupport,
      Validators.required
    ],
    altitudeType: [defaultObstacleForm.altitudeType, Validators.required],
    lateralDistanceType: [
      defaultObstacleForm.lateralDistanceType,
      Validators.required
    ],
    positions: this.fb.array<
      FormGroup<{
        x: FormControl<number | null>;
        y: FormControl<number | null>;
        z: FormControl<number | null>;
      }>
    >(
      this.fb.array(
        defaultObstacleForm.positions.map((position) =>
          this.createPositionGroup(position)
        )
      ).controls
    )
  });

  get positions(): FormArray {
    return this.form.get('positions') as FormArray;
  }

  createPositionGroup(
    position: ObstaclePosition = { x: null, y: null, z: null }
  ): FormGroup<{
    x: FormControl<number | null>;
    y: FormControl<number | null>;
    z: FormControl<number | null>;
  }> {
    return this.fb.group({
      x: [position.x],
      y: [position.y],
      z: [position.z]
    });
  }

  addPosition(position?: ObstaclePosition): void {
    this.positions.push(this.createPositionGroup(position));
  }

  removePosition(index: number): void {
    this.positions.removeAt(index);
  }

  clearPositions(): void {
    this.positions.clear();
  }

  setPositions(positions: ObstaclePosition[]): void {
    this.clearPositions();
    positions.forEach((position) => this.addPosition(position));
  }

  setExistingObstacle(obstacle: Obstacle, index: number): void {
    this.form.patchValue(
      {
        uuid: obstacle.uuid,
        name: obstacle.name,
        type: obstacle.type,
        supportUuid: obstacle.supportUuid,
        referenceSupport: obstacle.referenceSupport,
        altitudeType: obstacle.altitudeType,
        lateralDistanceType: obstacle.lateralDistanceType
      },
      { emitEvent: false }
    );
    this.setPositions(obstacle.positions);
    this.obstaclesService.setCurrentPointIndex(index);
  }

  readonly supportsOptions = signal<{ label: number; value: number }[]>([]);

  results = signal<{
    oblique: number | null;
    verticale: number | null;
    horizontale: number | null;
  }>({
    oblique: null,
    verticale: null,
    horizontale: null
  });

  resetFormForNewObstacle(supportUuid: string | null): Obstacle {
    if (supportUuid) {
      const supportIndex = this.plotService.getSupportIndex(supportUuid);
      if (supportIndex !== undefined && supportIndex >= 0) {
        this.plotService.plotOptionsChange({
          startSupport: supportIndex,
          endSupport: supportIndex + 1
        });
        this.plotService.spanAmountChoice.set('single');
      }
      const supports = this.plotService.getSupportOptions(supportUuid);
      console.log('supports are', supports);
      this.supportsOptions.set(
        supports.map((s) => ({
          label: s.label,
          value: s.label
        }))
      );
    }
    this.form.reset(
      {
        ...defaultObstacleForm,
        uuid: uuidv4(),
        supportUuid: supportUuid ?? null
      },
      { emitEvent: false }
    );
    this.clearPositions();
    this.results.set({ oblique: null, verticale: null, horizontale: null });
    // this.obstaclesService.resetCurrentPointIndex();
    return this.form.value as Obstacle;
  }

  loadObstacle(uuid: string): void {
    const obstacle = this.plotService
      .section()
      ?.obstacles?.find((o) => o.uuid === uuid);
    if (!obstacle) {
      return;
    }

    const supportIndex = this.plotService
      .section()
      ?.supports?.findIndex((s) => s.uuid === obstacle.supportUuid);
    if (supportIndex !== undefined && supportIndex >= 0) {
      const spanOptions = this.plotService.getSpanOptions();
      const supportUuid = spanOptions.find(
        (s) => s.value === obstacle.supportUuid
      );
      if (supportUuid) {
        this.form.patchValue({
          supportUuid: obstacle.supportUuid,
          referenceSupport: supportIndex + 1,
          name: `Obstacle ${uuid.substring(0, 8)}`
        });
      }
    }
  }

  deletePoint(index?: number): void {
    const pointIndex = index ?? this.obstaclesService.currentPointIndex();
    this.removePosition(pointIndex);
    const newIndex = Math.max(0, this.positions.length - 1);
    this.obstaclesService.setCurrentPointIndex(newIndex);
  }

  async deleteObstacle(): Promise<void> {
    const formValue = this.form.value;
    const obstacleUuid = formValue.uuid;
    console.log('deleteObstacle is', obstacleUuid);
    if (!obstacleUuid) {
      return;
    }

    const study = this.plotService.study();
    const section = this.plotService.section();
    if (!study || !section) {
      return;
    }

    const obstacles = section.obstacles ?? [];
    const obstacleIndex = obstacles.findIndex((o) => o.uuid === obstacleUuid);
    if (obstacleIndex !== -1) {
      obstacles.splice(obstacleIndex, 1);
      section.obstacles = obstacles;
      await this.sectionService.createOrUpdateSection(study, section);
      this.messageService.add({
        severity: 'success',
        summary: $localize`Success`,
        detail: $localize`Obstacle deleted`
      });
    }

    this.resetFormForNewObstacle(null);
    // this.clearPositions();
    this.obstaclesService.resetCurrentPointIndex();
  }

  async saveObstacle(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    // TODO: Implement save logic
  }

  async calculateAndSave(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    const formValue = this.form.value;
    if (!formValue) {
      return;
    }
    const obstaclePositions = this.positions.value as ObstaclePosition[];
    const supportUuid = formValue.supportUuid;
    if (!supportUuid) {
      return;
    }
    const obstacles = this.plotService.section()?.obstacles ?? [];
    let currentObstacle: Obstacle | undefined = obstacles.find(
      (o) => o.supportUuid === supportUuid
    );
    if (currentObstacle) {
      currentObstacle.name = formValue.name ?? '';
      currentObstacle.type = formValue.type ?? '';
      currentObstacle.altitudeType = formValue.altitudeType ?? '';
      currentObstacle.lateralDistanceType = formValue.lateralDistanceType ?? '';
      currentObstacle.referenceSupport = formValue.referenceSupport ?? null;
    } else {
      currentObstacle = this.resetFormForNewObstacle(supportUuid);
      if (currentObstacle) {
        obstacles.push(currentObstacle);
      }
    }
    currentObstacle.positions = obstaclePositions;
    currentObstacle.uuid = formValue.uuid ?? '';
    const study = this.plotService.study();
    const section = this.plotService.section();
    if (!study || !section) {
      return;
    }
    section.obstacles = obstacles;
    await this.sectionService.createOrUpdateSection(study, section);
    this.messageService.add({
      severity: 'success',
      summary: $localize`Success`,
      detail: $localize`Obstacle saved`
    });
    // TODO: Implement calculation logic
    // For now, set mock results
    this.results.set({
      oblique: 123,
      verticale: 123,
      horizontale: 123
    });
    await this.saveObstacle();
  }

  isFormValid(): boolean {
    return this.form.valid;
  }

  getErrorIds(controlName: string, errorTypes: string[]): string | null {
    const control = this.form.get(controlName);
    if (!control?.errors) {
      return null;
    }
    const ids = errorTypes
      .filter((type) => control.errors?.[type])
      .map((type) => `${controlName}-error-${type}`);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  returnToSpan(): void {
    const supportUuid = this.form.get('supportUuid')?.value;
    if (!supportUuid) {
      return;
    }
    const supportIndex = this.plotService.getSupportIndex(supportUuid);
    if (supportIndex !== undefined && supportIndex >= 0) {
      this.plotService.plotOptionsChange({
        startSupport: supportIndex,
        endSupport: supportIndex + 1
      });
      this.plotService.spanAmountChoice.set('single');
    }
  }
}
