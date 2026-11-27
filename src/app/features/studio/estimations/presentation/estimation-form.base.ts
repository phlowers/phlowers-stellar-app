/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { computed, Directive, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { TaskInputs } from '@services/worker_python/tasks/types';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { EstimationFormValue, EstimationTask } from '@features/studio/estimations/domain/estimations.interfaces';
import { EstimationCalculationBase } from '@features/studio/estimations/presentation/estimation-calculation.base';
import {
  getDefaultPointIndex,
  getEstimableObstacles,
  getPreselectedObstacleUuid,
  toObstacleOptions,
  toPointOptions
} from '@features/studio/estimations/presentation/estimations.helpers';

/** Form of an estimation on an obstacle point: the obstacle point and the numeric controls specific to the estimation. */
type EstimationObstacleForm<TValueKey extends string> = FormGroup<
  {
    obstacleUuid: FormControl<string | null>;
    pointIndex: FormControl<number | null>;
  } & Record<TValueKey, FormControl<number | null>>
>;

/**
 * Logic shared by the estimation tabs targeting an obstacle point: its choice among the obstacles of the section.
 * Each tab provides its numeric controls, its engine task and the mapping of its form value to the task inputs.
 */
@Directive()
export abstract class EstimationFormBase<
  TTask extends EstimationTask,
  TValueKey extends string
> extends EstimationCalculationBase<TTask, EstimationObstacleForm<TValueKey>, EstimationFormValue<TValueKey>> {
  private readonly obstaclesService = inject(ObstaclesService);

  // the controls exist once the form is built by the base constructor; the generic value keys widen their type
  private get obstacleUuidControl(): FormControl<string | null> {
    return this.form.controls.obstacleUuid as FormControl<string | null>;
  }
  private get pointIndexControl(): FormControl<number | null> {
    return this.form.controls.pointIndex as FormControl<number | null>;
  }

  /** The hint asking to choose an obstacle is only shown while none is selected. */
  readonly hasObstacle = computed(() => this.formValue().obstacleUuid !== null);

  private readonly obstacles = computed(() => getEstimableObstacles(this.spanService.section()?.obstacles));
  readonly obstacleOptions = computed(() => toObstacleOptions(this.obstacles()));
  private readonly selectedObstacle = computed(
    () => this.obstacles().find((obstacle) => obstacle.uuid === this.formValue().obstacleUuid) ?? null
  );
  readonly pointOptions = computed(() =>
    toPointOptions(this.selectedObstacle(), (index) =>
      this.translocoService.translate('common.point-index-label', { index: index + 1 })
    )
  );

  constructor() {
    super();
    // the point list follows the selected obstacle, starting on its first point
    this.obstacleUuidControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((uuid) => {
      const obstacle = this.obstacles().find((candidate) => candidate.uuid === uuid) ?? null;
      this.pointIndexControl.setValue(getDefaultPointIndex(obstacle));
    });

    // the obstacle selected in the Studio is preselected, once the point list follows it
    this.obstacleUuidControl.setValue(
      getPreselectedObstacleUuid(this.obstacles(), this.obstaclesService.selectedMeasureUuid())
    );
  }

  /** Numeric controls specific to the estimation. Called while the base is built: must not use subclass fields. */
  protected abstract createValueControls(): Record<TValueKey, FormControl<number | null>>;

  /** Engine inputs of the form value, or null while a value is missing. */
  protected abstract toObstacleInputs(
    value: EstimationFormValue<TValueKey>,
    obstacle: Obstacle | null
  ): TaskInputs[TTask] | null;

  protected createForm(): EstimationObstacleForm<TValueKey> {
    return new FormGroup({
      obstacleUuid: new FormControl<string | null>(null, Validators.required),
      pointIndex: new FormControl<number | null>(null, Validators.required),
      ...this.createValueControls()
    });
  }

  protected toInputs(value: EstimationFormValue<TValueKey>): TaskInputs[TTask] | null {
    return this.toObstacleInputs(value, this.selectedObstacle());
  }
}
