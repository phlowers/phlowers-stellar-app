/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FloorFormService } from './floor-form.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { TranslocoService } from '@jsverse/transloco';
import { Section } from '@shared/domain';
import { Floor } from '@shared/domain/models/floor.model';

const floor: Floor = {
  uuid: 'floor-1',
  supportUuid: 's0',
  referenceSupport: 'LEFT',
  points: [
    { distanceToRefSupport: 0, altitude: 10 },
    { distanceToRefSupport: 50, altitude: 11 },
    { distanceToRefSupport: 100, altitude: 12 }
  ]
};

const section = {
  supports: [
    { uuid: 's0', spanLength: 100, supportFootAltitude: 10 },
    { uuid: 's1', spanLength: null, supportFootAltitude: 12 }
  ],
  floors: [floor]
} as unknown as Section;

describe('FloorFormService — plot/form point selection', () => {
  let service: FloorFormService;
  const sectionSignal = signal<Section | null>(section);

  beforeEach(() => {
    sectionSignal.set(section);
    const spanServiceMock = {
      section: sectionSignal,
      getSpanOptions: vi.fn(() => []),
      getSupportOptions: vi.fn(() => []),
      getSupportIndex: vi.fn(() => 0),
      spanAmountChoice: signal<'single' | 'multiple'>('single')
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        FloorFormService,
        { provide: PlotSpanService, useValue: spanServiceMock },
        {
          provide: PlotService,
          useValue: { plotOptionsChange: vi.fn(), study: signal(null), refreshProjection: vi.fn() }
        },
        { provide: PlotOptionsService, useValue: { camera: signal(null), plotOptions: signal({}) } },
        { provide: SectionService, useValue: { createOrUpdateSection: vi.fn() } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: LoggerService, useValue: { warn: vi.fn() } },
        { provide: ObstacleStateService, useValue: { distances: signal([]), distanceType: signal(null) } },
        {
          provide: ObstaclesService,
          useValue: {
            selectedMeasureUuid: signal<string | null>(null),
            activePointIndex: signal<number | null>(null),
            setSelectedMeasure: vi.fn()
          }
        },
        { provide: TranslocoService, useValue: { translate: vi.fn((key: string) => key) } }
      ]
    });

    service = TestBed.inject(FloorFormService);
    TestBed.flushEffects();
  });

  it('should expose the saved floor uuid once its span/reference support is selected', () => {
    expect(service.savedFloorUuid()).toBeNull();

    service.form.controls.span.setValue('s0');
    service.form.controls.referenceSupport.enable();
    service.form.controls.referenceSupport.setValue('LEFT');
    TestBed.flushEffects();

    expect(service.savedFloorUuid()).toBe('floor-1');
  });

  it('should ignore a selection for an unknown floor uuid', () => {
    service.selectFloorPoint('missing', 1);

    expect(service.activePointIndex()).toBeNull();
    expect(service.form.controls.span.value).toBeNull();
  });

  it('should activate the point directly when its floor is already open', () => {
    service.form.controls.span.setValue('s0');
    service.form.controls.referenceSupport.enable();
    service.form.controls.referenceSupport.setValue('LEFT');
    TestBed.flushEffects();

    service.selectFloorPoint('floor-1', 2);

    expect(service.activePointIndex()).toBe(2);
  });

  it('should mirror a point selected from the form into quick-measures and the plot', () => {
    service.form.controls.span.setValue('s0');
    service.form.controls.referenceSupport.enable();
    service.form.controls.referenceSupport.setValue('LEFT');
    TestBed.flushEffects();

    service.setActivePoint(1);

    const obstaclesService = TestBed.inject(ObstaclesService);
    expect(obstaclesService.setSelectedMeasure).toHaveBeenCalledWith('floor-1', 1);
    expect(TestBed.inject(ObstacleStateService).distanceType()).toBe('vertical');
  });

  it('should switch span/reference support then activate the point for a floor not yet open', () => {
    expect(service.form.controls.span.value).toBeNull();

    service.selectFloorPoint('floor-1', 1);
    TestBed.flushEffects();

    expect(service.form.controls.span.value).toBe('s0');
    expect(service.form.controls.referenceSupport.value).toBe('LEFT');
    expect(service.activePointIndex()).toBe(1);
  });
});
