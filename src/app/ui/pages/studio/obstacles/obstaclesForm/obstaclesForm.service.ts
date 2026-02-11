import { inject, Injectable, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { PlotService } from '../../services/plot.service';
import {
  LateralDistanceType,
  Obstacle,
  Position3D,
  ReferenceSupport
} from '@core/domain/models/obstacle.model';
import { SectionService } from '@core/services/sections/section.service';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';
import { ObstaclesService } from '../obstacles.service';
import { defaultObstacleForm } from './constants';
import { ObstacleFormGroupData } from './interfaces';

@Injectable({
  providedIn: 'root'
})
export class ObstacleFormService {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly sectionService = inject(SectionService);
  private readonly messageService = inject(MessageService);

  form: FormGroup<ObstacleFormGroupData> = this.fb.group({
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
    position: Position3D = { x: null, y: null, z: null }
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

  addPosition(position?: Position3D): void {
    this.positions.push(this.createPositionGroup(position));
    this.obstaclesService.setCurrentPointIndex(this.positions.length - 1);
  }

  removePosition(index: number): void {
    this.positions.removeAt(index);
  }

  clearPositions(): void {
    this.positions.clear();
  }

  setPositions(positions: Position3D[]): void {
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
    this.focusPlotOnSupport(supportUuid);
    this.resetForm(supportUuid);
    this.resetResults();
    return this.form.value as Obstacle;
  }

  private focusPlotOnSupport(supportUuid: string | null) {
    if (!supportUuid) {
      return;
    }
    const supportIndex = this.plotService.getSupportIndex(supportUuid);
    if (supportIndex >= 0) {
      this.plotService.plotOptionsChange({
        startSupport: supportIndex,
        endSupport: supportIndex + 1
      });
      this.plotService.spanAmountChoice.set('single');
    }
    const supports = this.plotService.getSupportOptions(supportUuid);
    this.supportsOptions.set(
      supports.map((s) => ({
        label: s.label,
        value: s.label
      }))
    );
  }

  private resetForm(supportUuid: string | null) {
    this.form.reset(
      {
        ...defaultObstacleForm,
        uuid: uuidv4(),
        supportUuid: supportUuid ?? null
      },
      { emitEvent: false }
    );
    this.clearPositions();
  }

  private resetResults() {
    this.results.set({ oblique: null, verticale: null, horizontale: null });
  }

  loadObstacle(uuid: string): void {
    const obstacle = this.findObstacle(uuid);
    if (!obstacle) {
      return;
    }
    this.patchFormFromObstacle(uuid, obstacle);
  }

  private findObstacle(uuid: string): Obstacle | undefined {
    return this.plotService.section()?.obstacles?.find((o) => o.uuid === uuid);
  }

  private patchFormFromObstacle(uuid: string, obstacle: Obstacle): void {
    const support = this.findSupportForObstacle(obstacle);
    if (!support) {
      return;
    }
    const isInSpanOptions = this.plotService
      .getSpanOptions()
      .some((s) => s.value === obstacle.supportUuid);
    if (!isInSpanOptions) {
      return;
    }
    this.form.patchValue({
      supportUuid: obstacle.supportUuid,
      referenceSupport:
        support.uuid === obstacle.supportUuid
          ? ReferenceSupport.LEFT
          : ReferenceSupport.RIGHT,
      name: `Obstacle ${uuid.substring(0, 8)}`
    });
  }

  private findSupportForObstacle(obstacle: Obstacle) {
    return this.plotService
      .section()
      ?.supports?.find((s) => s.uuid === obstacle.supportUuid);
  }

  deletePoint(index?: number): void {
    const pointIndex = index ?? this.obstaclesService.currentPointIndex();
    this.removePosition(pointIndex);
    const newIndex = Math.max(0, this.positions.length - 1);
    this.obstaclesService.setCurrentPointIndex(newIndex);
  }

  async deleteObstacle(): Promise<void> {
    const obstacleUuid = this.form.value.uuid;
    if (!obstacleUuid) {
      return;
    }
    await this.removeObstacleFromSection(obstacleUuid);
    this.resetFormForNewObstacle(null);
    this.obstaclesService.resetCurrentPointIndex();
  }

  private async removeObstacleFromSection(obstacleUuid: string): Promise<void> {
    const study = this.plotService.study();
    const section = this.plotService.section();
    if (!study || !section) {
      return;
    }
    const obstacles = section.obstacles ?? [];
    const obstacleIndex = obstacles.findIndex((o) => o.uuid === obstacleUuid);
    if (obstacleIndex === -1) {
      return;
    }
    obstacles.splice(obstacleIndex, 1);
    section.obstacles = obstacles;
    await this.sectionService.createOrUpdateSection(study, section);
    this.messageService.add({
      severity: 'success',
      summary: $localize`Success`,
      detail: $localize`Obstacle deleted`
    });
  }

  async saveObstacle(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    // TODO: Implement save logic
  }

  async calculateAndSave(): Promise<void> {
    if (this.form.invalid || !this.form.value?.supportUuid) {
      return;
    }
    const obstacle = this.buildObstacleFromForm();
    this.upsertObstacleInSection(obstacle);
    await this.saveSection();
    // TODO: Implement calculation logic
    // For now, set mock results
    this.results.set({
      oblique: 123,
      verticale: 123,
      horizontale: 123
    });
  }

  private buildObstacleFromForm(): Obstacle {
    const formValue = this.form.value;
    return {
      uuid: formValue.uuid ?? uuidv4(),
      supportUuid: formValue.supportUuid!,
      name: formValue.name ?? '',
      type: formValue.type ?? '',
      altitudeType: formValue.altitudeType ?? '',
      lateralDistanceType:
        formValue.lateralDistanceType ?? LateralDistanceType.SPAN_AXIS,
      referenceSupport: formValue.referenceSupport ?? ReferenceSupport.LEFT,
      positions: this.positions.value as Position3D[]
    };
  }

  private upsertObstacleInSection(obstacle: Obstacle): void {
    const obstacles = this.plotService.section()?.obstacles ?? [];
    const existingObstacle = obstacles.find((o) => o.uuid === obstacle.uuid);
    if (existingObstacle) {
      Object.assign(existingObstacle, obstacle);
    } else {
      obstacles.push(obstacle);
    }
  }

  private async saveSection(): Promise<void> {
    const study = this.plotService.study();
    const section = this.plotService.section();
    if (!study || !section) {
      return;
    }
    await this.sectionService.createOrUpdateSection(study, section);
    this.messageService.add({
      severity: 'success',
      summary: $localize`Success`,
      detail: $localize`Obstacle saved`
    });
  }

  isFormValid(): boolean {
    return this.form.valid;
  }

  canCalculateAndSave(): boolean {
    return (
      this.form.valid &&
      this.positions.length > 0 &&
      this.positions.value.every(
        (position: Position3D) =>
          position.x !== null && position.y !== null && position.z !== null
      )
    );
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
    if (supportIndex >= 0) {
      this.plotService.plotOptionsChange({
        startSupport: supportIndex,
        endSupport: supportIndex + 1
      });
      this.plotService.spanAmountChoice.set('single');
    }
  }
}
