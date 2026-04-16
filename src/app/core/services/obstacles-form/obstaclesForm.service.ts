import { computed, inject, Injectable, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { LateralDistanceType, Obstacle, Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { SectionService } from '@services/section/section.service';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { DEBOUNCED_UPDATE_POINT_DELAY, defaultObstacleForm } from '@shared/domain/obstacles/obstacle-form.constants';
import { ObstacleFormGroupData, PositionFormGroup } from '@shared/domain/obstacles/obstacle-form.interfaces';
import { debounce } from 'lodash';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ObstacleOutput } from '@services/worker_python/tasks/types';

/** Service managing the obstacle reactive form, including CRUD operations, position management, and calculations. */
@Injectable({
  providedIn: 'root'
})
export class ObstacleFormService {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly obstacleStateService = inject(ObstacleStateService);
  private readonly sectionService = inject(SectionService);
  private readonly messageService = inject(MessageService);

  private readonly defaultPosition = { x: null, y: null, z: null } as const satisfies Position3D;

  form: FormGroup<ObstacleFormGroupData> = this.fb.group({
    uuid: [defaultObstacleForm.uuid],
    name: [defaultObstacleForm.name, Validators.required],
    type: [defaultObstacleForm.type, Validators.required],
    supportUuid: [defaultObstacleForm.supportUuid, Validators.required],
    referenceSupport: [defaultObstacleForm.referenceSupport, Validators.required],
    altitudeType: [defaultObstacleForm.altitudeType, Validators.required],
    lateralDistanceType: [defaultObstacleForm.lateralDistanceType, Validators.required],
    positions: this.fb.array<PositionFormGroup>(
      this.fb.array(this.buildPositionControls(defaultObstacleForm.positions)).controls
    )
  });

  private buildPositionControls(positions: Position3D[]): PositionFormGroup[] {
    return positions.map((position) => this.createPositionGroup(position));
  }

  get positions(): FormArray {
    return this.form.get('positions') as FormArray;
  }

  private readonly positionsSnapshot = toSignal(this.positions.valueChanges as Observable<Position3D[]>, {
    initialValue: this.positions.value as Position3D[]
  });

  createPositionGroup(position: Position3D = this.defaultPosition): PositionFormGroup {
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
    // Refresh the reference support options for the obstacle's span.
    this.refreshSupportsOptions(obstacle.supportUuid);
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

  readonly supportsOptions = signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([]);

  /**
   * Distance results for the currently selected obstacle and point, derived reactively
   * from the plotService distances. Updates automatically when distances are recalculated
   * (after calculateAndSave) or restored (after refreshSection on re-open).
   */
  readonly results = computed(() => {
    const distances = this.obstacleStateService.distances();
    const obstacleUuid = this.formValue().uuid;
    const pointIndex = this.obstaclesService.activePointIndex();

    if (!distances.length || !obstacleUuid || pointIndex === null) {
      return { oblique: null, vertical: null, horizontal: null };
    }

    const obstacleDistances = distances.find((d) => d.obstacleUuid === obstacleUuid);
    const pointDistances = obstacleDistances?.points?.find((p) => p.pointIndex === pointIndex);

    return {
      oblique: pointDistances?.distanceDiagonal ?? null,
      vertical: pointDistances?.distanceVertical ?? null,
      horizontal: pointDistances?.distanceHorizontal ?? null
    };
  });

  readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  readonly isFormValid = computed(() => {
    this.formValue(); // to recalculate
    return this.form.valid;
  });

  readonly canCalculateAndSave = computed(() => {
    const positions = this.positionsSnapshot();
    return (
      this.isFormValid() &&
      positions.length > 0 &&
      positions.every((position: Position3D) => position.x !== null && position.y !== null && position.z !== null)
    );
  });

  private readonly debouncedResetForm = debounce((supportUuid: string | null) => {
    this.resetForm(supportUuid);
  }, DEBOUNCED_UPDATE_POINT_DELAY);

  resetFormForNewObstacle(supportUuid: string | null): Obstacle {
    if (supportUuid) {
      const supports = this.spanService.getSupportOptions(supportUuid);
      this.supportsOptions.set(supports.map((s) => ({ label: String(s.label), value: s.value })));
    } else {
      this.supportsOptions.set([]);
      // Clear supportUuid and emit value to ensure the re-slection of the same span won't block support selection.
      this.form.get('supportUuid')?.setValue(null, { emitEvent: true });
    }
    this.debouncedResetForm(supportUuid);
    return this.form.value as Obstacle;
  }

  private refreshSupportsOptions(supportUuid: string | null) {
    if (!supportUuid) {
      return;
    }
    const supports = this.spanService.getSupportOptions(supportUuid);
    this.supportsOptions.set(
      supports.map((s) => ({
        label: String(s.label),
        value: s.value
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

  loadObstacle(uuid: string): void {
    const obstacle = this.findObstacle(uuid);
    if (!obstacle) {
      return;
    }
    this.patchFormFromObstacle(uuid, obstacle);
  }

  private findObstacle(uuid: string): Obstacle | undefined {
    return this.spanService.section()?.obstacles?.find((o) => o.uuid === uuid);
  }

  private patchFormFromObstacle(uuid: string, obstacle: Obstacle): void {
    const support = this.findSupportForObstacle(obstacle);
    if (!support) {
      return;
    }
    const isInSpanOptions = this.spanService.getSpanOptions().some((s) => s.value === obstacle.supportUuid);
    if (!isInSpanOptions) {
      return;
    }
    this.form.patchValue({
      supportUuid: obstacle.supportUuid,
      referenceSupport: support.uuid === obstacle.supportUuid ? ReferenceSupport.LEFT : ReferenceSupport.RIGHT,
      name: `Obstacle ${uuid.substring(0, 8)}`
    });
  }

  private findSupportForObstacle(obstacle: Obstacle) {
    return this.spanService.section()?.supports?.find((s) => s.uuid === obstacle.supportUuid);
  }

  deletePoint(index?: number): void {
    const pointIndex = index ?? this.obstaclesService.activePointIndex() ?? 0;
    this.removePosition(pointIndex);
    this.removePointFromLitData(pointIndex);
    const newIndex = Math.max(0, this.positions.length - 1);
    this.obstaclesService.setCurrentPointIndex(newIndex);
  }

  /** Remove a point from litData.obstacles so Plotly stays in sync with the form. */
  private removePointFromLitData(pointIndex: number): void {
    const currentLitData = this.plotService.litData();
    const obstacleUuid = this.form.value.uuid;
    if (!currentLitData?.obstacles?.length || !obstacleUuid) {
      return;
    }
    const updatedObstacles = currentLitData.obstacles.map((litObstacle) => {
      if (litObstacle.uuid !== obstacleUuid) {
        return litObstacle;
      }
      return {
        ...litObstacle,
        points: litObstacle.points.filter((_, i) => i !== pointIndex)
      };
    });
    this.plotService.litData.set({ ...currentLitData, obstacles: updatedObstacles });
  }

  async deleteObstacle(): Promise<void> {
    const obstacleUuid = this.form.value.uuid;
    if (!obstacleUuid) {
      return;
    }
    await this.removeObstacleFromSection(obstacleUuid);
    this.resetFormForNewObstacle(null);
    this.obstaclesService.setSelectedObstacle(null, null);
  }

  private async removeObstacleFromSection(obstacleUuid: string): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
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

    await this.obstacleStateService.deleteObstacle(obstacleUuid, this.plotOptionsService.plotOptions());

    // Re-register remaining obstacles to get accurate render positions
    const obstacleOutput = await this.obstacleStateService.addObstacle(
      obstacles,
      this.plotOptionsService.plotOptions()
    );
    this.applyObstacleOutputToLitData(obstacleOutput);
    await this.obstacleStateService.calculateDistances(obstacles, this.plotOptionsService.plotOptions());

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
    const obstacle = this.buildObstacleFromForm();
    this.upsertObstacleInSection(obstacle);
    await this.saveSection();
  }

  async calculateAndSave(): Promise<void> {
    if (this.form.invalid || !this.form.value?.supportUuid) {
      return;
    }
    const obstacle = this.buildObstacleFromForm();

    // 1. Merge new/updated obstacle into the in-memory section
    this.upsertObstacleInSection(obstacle);
    const allObstacles = this.spanService.section()?.obstacles ?? [obstacle];

    // 2. Register all obstacles in Python worker — get computed render positions for current span
    const obstacleOutput = await this.obstacleStateService.addObstacle(
      allObstacles,
      this.plotOptionsService.plotOptions()
    );

    // 3. Update rendering (litData.obstacles)
    this.applyObstacleOutputToLitData(obstacleOutput);

    // 4. Persist domain object to IndexedDB
    await this.saveSection();

    // 5. Recalculate distances
    await this.obstacleStateService.calculateDistances(allObstacles, this.plotOptionsService.plotOptions());

    // 5. Update UI selection
    const lastPointIndex = obstacle.positions.length > 0 ? obstacle.positions.length - 1 : null;
    this.obstaclesService.setSelectedObstacle(obstacle.uuid, lastPointIndex);
    this.plotService.loading.set(false);
  }

  private applyObstacleOutputToLitData(obstacleOutput: ObstacleOutput | null): void {
    const current = this.plotService.litData();
    if (!current) return;
    this.plotService.litData.set({
      ...current,
      obstacles: obstacleOutput?.obstacles ?? []
    });
  }

  buildObstacleFromForm(): Obstacle {
    const formValue = this.form.value;
    // Use || so empty string also triggers UUID generation (defaultObstacleForm.uuid = '')
    const uuid = formValue.uuid || uuidv4();
    // Persist generated UUID back to the form so repeated calls use the same obstacle
    if (!formValue.uuid) {
      this.form.get('uuid')?.setValue(uuid, { emitEvent: false });
    }
    const supportUuid = formValue.supportUuid!;
    return {
      uuid,
      supportUuid,
      supportIndex: this.spanService.getSupportIndex(supportUuid),
      name: formValue.name ?? '',
      type: formValue.type ?? '',
      altitudeType: formValue.altitudeType ?? '',
      lateralDistanceType: formValue.lateralDistanceType ?? LateralDistanceType.SPAN_AXIS,
      referenceSupport: formValue.referenceSupport ?? ReferenceSupport.LEFT,
      positions: this.positions.value as Position3D[]
    };
  }

  private upsertObstacleInSection(obstacle: Obstacle): void {
    const section = this.spanService.section();
    if (!section) {
      return;
    }
    if (!section.obstacles) {
      section.obstacles = [];
    }
    const existingIndex = section.obstacles.findIndex((o) => o.uuid === obstacle.uuid);
    if (existingIndex !== -1) {
      section.obstacles[existingIndex] = obstacle;
    } else {
      section.obstacles.push(obstacle);
    }
  }

  private async saveSection(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
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

  getErrorIds(controlName: string, errorTypes: string[]): string | null {
    const control = this.form.get(controlName);
    if (!control?.errors) {
      return null;
    }
    const ids = errorTypes.filter((type) => control.errors?.[type]).map((type) => `${controlName}-error-${type}`);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  returnToSpan(): void {
    const supportUuid = this.form.get('supportUuid')?.value;
    if (!supportUuid) {
      return;
    }
    const supportIndex = this.spanService.getSupportIndex(supportUuid);
    if (supportIndex >= 0) {
      this.plotOptionsService.camera.set(null);
      this.plotService.plotOptionsChange({
        startSupport: supportIndex,
        endSupport: supportIndex + 1
      });
      this.spanService.spanAmountChoice.set('single');
    }
  }
}
