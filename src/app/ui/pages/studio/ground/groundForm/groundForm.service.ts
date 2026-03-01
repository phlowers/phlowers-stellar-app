import { computed, inject, Injectable, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { PlotService } from '../../services/plot.service';
import { Ground, GroundPosition, GroundReferenceSupport } from '@core/domain/models/ground.model';
import { SectionService } from '@core/services/sections/section.service';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';
import { GroundsService } from '../grounds.service';
import { DEBOUNCED_UPDATE_POINT_DELAY, defaultGroundForm } from './constants';
import { GroundFormGroupData } from './interfaces';
import { debounce } from 'lodash';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class GroundFormService {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly groundsService = inject(GroundsService);
  private readonly sectionService = inject(SectionService);
  private readonly messageService = inject(MessageService);

  form: FormGroup<GroundFormGroupData> = this.fb.group({
    uuid: [defaultGroundForm.uuid],
    supportUuid: [defaultGroundForm.supportUuid, Validators.required],
    referenceSupport: [defaultGroundForm.referenceSupport, Validators.required],
    altitudeType: [defaultGroundForm.altitudeType, Validators.required],
    positions: this.fb.array<
      FormGroup<{
        x: FormControl<number | null>;
        z: FormControl<number | null>;
      }>
    >(this.fb.array(this.buildPositionControls(defaultGroundForm.positions)).controls)
  });

  private readonly positionsSnapshot = signal<GroundPosition[]>([]);

  constructor() {
    this.positions.valueChanges.subscribe((positions) => {
      this.positionsSnapshot.set(positions as GroundPosition[]);
    });
    this.positionsSnapshot.set(this.positions.value as GroundPosition[]);
  }

  private buildPositionControls(positions: GroundPosition[]): FormGroup<{
    x: FormControl<number | null>;
    z: FormControl<number | null>;
  }>[] {
    const controls: FormGroup<{
      x: FormControl<number | null>;
      z: FormControl<number | null>;
    }>[] = [];
    for (const position of positions) {
      controls.push(this.createPositionGroup(position));
    }
    return controls;
  }

  get positions(): FormArray {
    return this.form.get('positions') as FormArray;
  }

  createPositionGroup(position: GroundPosition = { x: null, z: null }): FormGroup<{
    x: FormControl<number | null>;
    z: FormControl<number | null>;
  }> {
    return this.fb.group({
      x: [position.x],
      z: [position.z]
    });
  }

  addPosition(position?: GroundPosition): void {
    this.positions.push(this.createPositionGroup(position));
    this.groundsService.setCurrentPointIndex(this.positions.length - 1);
  }

  removePosition(index: number): void {
    this.positions.removeAt(index);
  }

  clearPositions(): void {
    this.positions.clear();
  }

  setPositions(positions: GroundPosition[]): void {
    this.clearPositions();
    positions.forEach((position) => this.addPosition(position));
  }

  setExistingGround(ground: Ground, index: number): void {
    this.form.patchValue(
      {
        uuid: ground.uuid,
        supportUuid: ground.supportUuid,
        referenceSupport: ground.referenceSupport,
        altitudeType: ground.altitudeType
      },
      { emitEvent: false }
    );
    this.setPositions(ground.positions);
    this.groundsService.setCurrentPointIndex(index);
  }

  readonly supportsOptions = signal<{ label: number; value: string }[]>([]);

  readonly results = signal<{
    oblique: number | null;
    verticale: number | null;
    horizontale: number | null;
  }>({
    oblique: null,
    verticale: null,
    horizontale: null
  });

  readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  readonly isFormValidSignal = computed(() => {
    this.formValue();
    return this.form.valid;
  });

  readonly canCalculateAndSaveSignal = computed(() => {
    const positions = this.positionsSnapshot();
    return (
      this.isFormValidSignal() &&
      positions.length > 0 &&
      positions.every((position: GroundPosition) => position.x !== null && position.z !== null)
    );
  });

  loadOrResetForSpan(supportUuid: string | null): void {
    this.focusPlotOnSupport(supportUuid);
    debounce(() => {
      if (supportUuid) {
        const existingGround = this.findGroundBySupport(supportUuid);
        if (existingGround) {
          this.setExistingGround(existingGround, 0);
          return;
        }
      }
      this.resetForm(supportUuid);
      this.resetResults();
    }, DEBOUNCED_UPDATE_POINT_DELAY)();
  }

  resetFormForNewGround(): void {
    this.form.reset(
      {
        ...defaultGroundForm,
        uuid: uuidv4(),
        supportUuid: null
      },
      { emitEvent: false }
    );
    this.clearPositions();
    this.resetResults();
    this.groundsService.resetCurrentPointIndex();
  }

  private findGroundBySupport(supportUuid: string): Ground | undefined {
    return this.plotService.section()?.grounds?.find((g) => g.supportUuid === supportUuid);
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
        value: s.value
      }))
    );
  }

  private resetForm(supportUuid: string | null) {
    this.form.reset(
      {
        ...defaultGroundForm,
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

  loadGround(uuid: string): void {
    const ground = this.findGround(uuid);
    if (!ground) {
      return;
    }
    this.patchFormFromGround(uuid, ground);
  }

  private findGround(uuid: string): Ground | undefined {
    return this.plotService.section()?.grounds?.find((g) => g.uuid === uuid);
  }

  private patchFormFromGround(uuid: string, ground: Ground): void {
    const support = this.findSupportForGround(ground);
    if (!support) {
      return;
    }
    const isInSpanOptions = this.plotService.getSpanOptions().some((s) => s.value === ground.supportUuid);
    if (!isInSpanOptions) {
      return;
    }
    this.form.patchValue({
      supportUuid: ground.supportUuid,
      referenceSupport: support.uuid === ground.supportUuid ? GroundReferenceSupport.LEFT : GroundReferenceSupport.RIGHT
    });
  }

  private findSupportForGround(ground: Ground) {
    return this.plotService.section()?.supports?.find((s) => s.uuid === ground.supportUuid);
  }

  deletePoint(index?: number): void {
    const pointIndex = index ?? this.groundsService.currentPointIndex();
    this.removePosition(pointIndex);
    const newIndex = Math.max(0, this.positions.length - 1);
    this.groundsService.setCurrentPointIndex(newIndex);
  }

  async deleteGround(): Promise<void> {
    const groundUuid = this.form.value.uuid;
    if (!groundUuid) {
      return;
    }
    await this.removeGroundFromSection(groundUuid);
    this.resetFormForNewGround();
  }

  private async removeGroundFromSection(groundUuid: string): Promise<void> {
    const study = this.plotService.study();
    const section = this.plotService.section();
    if (!study || !section) {
      return;
    }
    const grounds = section.grounds ?? [];
    const groundIndex = grounds.findIndex((g) => g.uuid === groundUuid);
    if (groundIndex === -1) {
      return;
    }
    grounds.splice(groundIndex, 1);
    section.grounds = grounds;
    await this.sectionService.createOrUpdateSection(study, section);
    this.messageService.add({
      severity: 'success',
      summary: $localize`Success`,
      detail: $localize`Ground deleted`
    });
  }

  async saveGround(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    // TODO: Implement save logic
  }

  async calculateAndSave(): Promise<void> {
    if (this.form.invalid || !this.form.value?.supportUuid) {
      return;
    }
    const ground = this.buildGroundFromForm();
    this.upsertGroundInSection(ground);
    await this.saveSection();
    this.results.set({
      oblique: 123,
      verticale: 123,
      horizontale: 123
    });
  }

  private buildGroundFromForm(): Ground {
    const formValue = this.form.value;
    return {
      uuid: formValue.uuid ?? uuidv4(),
      supportUuid: formValue.supportUuid!,
      altitudeType: formValue.altitudeType ?? '',
      referenceSupport: formValue.referenceSupport ?? GroundReferenceSupport.LEFT,
      positions: this.positions.value as GroundPosition[]
    };
  }

  private upsertGroundInSection(ground: Ground): void {
    const section = this.plotService.section();
    if (!section) return;
    if (!section.grounds) {
      section.grounds = [];
    }
    const existingIndex = section.grounds.findIndex((g) => g.uuid === ground.uuid);
    if (existingIndex >= 0) {
      section.grounds[existingIndex] = ground;
    } else {
      section.grounds.push(ground);
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
      detail: $localize`Ground saved`
    });
  }

  isFormValid(): boolean {
    return this.isFormValidSignal();
  }

  canCalculateAndSave(): boolean {
    return this.canCalculateAndSaveSignal();
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
