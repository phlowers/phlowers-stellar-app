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
import { Distance } from '@services/worker_python/tasks/types';

const floor: Floor = {
  uuid: 'floor-1',
  supportUuid: 's0',
  referenceSupport: 'LEFT',
  points: [
    { distanceToRefSupport: 0, altitude: 10 },
    { distanceToRefSupport: 50, altitude: 20 },
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

/** Builds a worker distance payload for the saved floor, one entry per [pointIndex, verticalDistance]. */
const distancesFor = (...points: [number, number][]): Distance[] => [
  {
    obstacleUuid: 'floor-1',
    points: points.map(([pointIndex, distanceVertical]) => ({
      pointIndex,
      distanceVertical,
      distanceHorizontal: 0,
      distanceDiagonal: Math.abs(distanceVertical),
      linePoint: [0, 0, 0],
      virtualPointHorizontal: [0, 0, 0],
      virtualPointVertical: [0, 0, 0]
    }))
  } as unknown as Distance
];

describe('FloorFormService', () => {
  let service: FloorFormService;
  let distancesSignal: ReturnType<typeof signal<Distance[]>>;
  let sectionSignal: ReturnType<typeof signal<Section | null>>;
  let distanceTypeSignal: ReturnType<typeof signal<string | null>>;
  let obstaclesServiceMock: {
    selectedMeasureUuid: ReturnType<typeof signal<string | null>>;
    activePointIndex: ReturnType<typeof signal<number | null>>;
    setSelectedMeasure: ReturnType<typeof vi.fn>;
  };

  /** Opens the saved floor in the form (span + reference support), as selecting it in the UI would. */
  const openSavedFloor = () => {
    service.form.controls.span.setValue('s0');
    service.form.controls.referenceSupport.enable();
    service.form.controls.referenceSupport.setValue('LEFT');
    TestBed.flushEffects();
  };

  beforeEach(() => {
    sectionSignal = signal<Section | null>(section);
    distancesSignal = signal<Distance[]>([]);
    distanceTypeSignal = signal<string | null>(null);
    obstaclesServiceMock = {
      selectedMeasureUuid: signal<string | null>(null),
      activePointIndex: signal<number | null>(null),
      setSelectedMeasure: vi.fn((uuid: string | null, pointIndex: number | null) => {
        obstaclesServiceMock.selectedMeasureUuid.set(uuid);
        obstaclesServiceMock.activePointIndex.set(pointIndex);
      })
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        FloorFormService,
        {
          provide: PlotSpanService,
          useValue: {
            section: sectionSignal,
            getSpanOptions: vi.fn(() => []),
            getSupportOptions: vi.fn(() => []),
            getSupportIndex: vi.fn(() => 0),
            spanAmountChoice: signal<'single' | 'multiple'>('single')
          }
        },
        {
          provide: PlotService,
          useValue: { plotOptionsChange: vi.fn(), study: signal(null), refreshProjection: vi.fn() }
        },
        { provide: PlotOptionsService, useValue: { camera: signal(null), plotOptions: signal({}) } },
        { provide: SectionService, useValue: { createOrUpdateSection: vi.fn() } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: LoggerService, useValue: { warn: vi.fn() } },
        { provide: ObstacleStateService, useValue: { distances: distancesSignal, distanceType: distanceTypeSignal } },
        { provide: ObstaclesService, useValue: obstaclesServiceMock },
        { provide: TranslocoService, useValue: { translate: vi.fn((key: string) => key) } }
      ]
    });

    service = TestBed.inject(FloorFormService);
    TestBed.flushEffects();
  });

  describe('results', () => {
    it('should be empty while no floor is open', () => {
      expect(service.results()).toEqual({ minVerticalDistance: null, floorAltitude: null, cableAltitude: null });
    });

    it('should be empty when the worker has no distances for the saved floor', () => {
      openSavedFloor();
      distancesSignal.set(distancesFor());

      expect(service.results()).toEqual({ minVerticalDistance: null, floorAltitude: null, cableAltitude: null });
    });

    it('should report the narrowest point and the cable altitude above it', () => {
      openSavedFloor();
      distancesSignal.set(distancesFor([0, 8], [1, 3], [2, 6]));

      // Point 1 is the closest to the cable; its floor altitude is 20, so the cable sits at 23.
      expect(service.results()).toEqual({ minVerticalDistance: 3, floorAltitude: 20, cableAltitude: 23 });
    });

    it('should keep the negative distance and a cable altitude below the floor when the cable dips under it', () => {
      openSavedFloor();
      distancesSignal.set(distancesFor([0, 8], [1, -2.5], [2, 6]));

      // Signed distances: the worst case is the most negative one, not the smallest magnitude.
      expect(service.results()).toEqual({ minVerticalDistance: -2.5, floorAltitude: 20, cableAltitude: 17.5 });
    });

    it('should ignore distances belonging to other obstacles', () => {
      openSavedFloor();
      distancesSignal.set([
        ...distancesFor([0, 8]),
        { obstacleUuid: 'other', points: [{ pointIndex: 0, distanceVertical: -99 }] } as unknown as Distance
      ]);

      expect(service.results().minVerticalDistance).toBe(8);
    });
  });

  describe('selectFloorPoint — quick-measures sync', () => {
    it('should select the floor and its point in quick-measures, like clicking an obstacle does', () => {
      service.selectFloorPoint('floor-1', 2);

      expect(obstaclesServiceMock.setSelectedMeasure).toHaveBeenCalledWith('floor-1', 2);
      expect(obstaclesServiceMock.selectedMeasureUuid()).toBe('floor-1');
      expect(obstaclesServiceMock.activePointIndex()).toBe(2);
    });

    it('should show the floor vertical distance, since floors have no distance-type radios', () => {
      service.selectFloorPoint('floor-1', 0);

      expect(distanceTypeSignal()).toBe('vertical');
    });

    it('should sync a floor that is not open in the form yet', () => {
      expect(service.form.controls.span.value).toBeNull();

      service.selectFloorPoint('floor-1', 1);
      TestBed.flushEffects();

      expect(obstaclesServiceMock.selectedMeasureUuid()).toBe('floor-1');
      expect(service.activePointIndex()).toBe(1);
    });

    it('should leave the current selection untouched for an unknown floor uuid', () => {
      obstaclesServiceMock.setSelectedMeasure('obs-1', 0);
      vi.clearAllMocks();

      service.selectFloorPoint('missing', 1);

      expect(obstaclesServiceMock.setSelectedMeasure).not.toHaveBeenCalled();
      expect(obstaclesServiceMock.selectedMeasureUuid()).toBe('obs-1');
      expect(distanceTypeSignal()).toBeNull();
    });
  });

  describe('points loaded from the saved floor', () => {
    it('should rebuild one form point per saved floor point', () => {
      openSavedFloor();

      expect(service.points.value).toEqual([
        { altitude: 10, distanceToRefSupport: 0 },
        { altitude: 20, distanceToRefSupport: 50 },
        { altitude: 12, distanceToRefSupport: 100 }
      ]);
    });

    it('should mark only the middle points as removable', () => {
      openSavedFloor();

      expect(service.pointsView().map(({ meta }) => meta.removable)).toEqual([false, true, false]);
    });

    it('should pin the reference point to 0 and the closing point to the span length', () => {
      openSavedFloor();

      expect(service.points.at(0).controls.distanceToRefSupport.value).toBe(0);
      expect(service.points.at(-1).controls.distanceToRefSupport.value).toBe(100);
    });
  });

  describe('addPoint / deletePoint', () => {
    it('should add an empty free point and make it the active one', () => {
      openSavedFloor();

      service.addPoint();

      // An empty point sorts as distance 0, so it lands right after the reference support until placed.
      expect(service.points).toHaveLength(4);
      expect(service.activePointIndex()).toBe(1);
      expect(service.points.at(1).value).toEqual({ altitude: null, distanceToRefSupport: null });
    });

    it('should not add a point while no span is selected', () => {
      service.addPoint();

      expect(service.points).toHaveLength(2);
    });

    it('should remove a free point', () => {
      openSavedFloor();

      service.deletePoint(1);

      expect(service.points.value).toEqual([
        { altitude: 10, distanceToRefSupport: 0 },
        { altitude: 12, distanceToRefSupport: 100 }
      ]);
    });

    it('should refuse to remove the reference or closing point', () => {
      openSavedFloor();

      service.deletePoint(0);
      service.deletePoint(service.points.length - 1);

      expect(service.points).toHaveLength(3);
    });

    it('should clear the active point when it is the one removed', () => {
      openSavedFloor();
      service.setActivePoint(1);

      service.deletePoint(1);

      expect(service.activePointIndex()).toBeNull();
    });

    it('should shift the active index down when an earlier point is removed', () => {
      openSavedFloor();
      service.addPoint();
      service.setActivePoint(2);

      service.deletePoint(1);

      expect(service.activePointIndex()).toBe(1);
    });
  });

  describe('setFreePointPosition', () => {
    it('should move a free point to the clicked distance and altitude', () => {
      openSavedFloor();

      service.setFreePointPosition(1, { distanceToRefSupport: 70, altitude: 15 });

      expect(service.points.at(1).value).toEqual({ altitude: 15, distanceToRefSupport: 70 });
    });

    it('should clamp a distance beyond the closing support back to the span length', () => {
      openSavedFloor();

      service.setFreePointPosition(1, { distanceToRefSupport: 250 });

      expect(service.points.at(1).controls.distanceToRefSupport.value).toBe(100);
    });

    it('should clamp a negative distance back to the reference support', () => {
      openSavedFloor();

      service.setFreePointPosition(1, { distanceToRefSupport: -30 });

      expect(service.points.at(1).controls.distanceToRefSupport.value).toBe(0);
    });

    it('should ignore a move targeting the reference or closing point', () => {
      openSavedFloor();

      service.setFreePointPosition(0, { distanceToRefSupport: 40 });
      service.setFreePointPosition(2, { distanceToRefSupport: 40 });

      expect(service.points.at(0).controls.distanceToRefSupport.value).toBe(0);
      expect(service.points.at(2).controls.distanceToRefSupport.value).toBe(100);
    });

    it('should re-sort free points by distance and follow the active one to its new index', () => {
      openSavedFloor();
      service.addPoint();
      // Points are [ref(0), new(empty), 50, closing(100)]; placing the new one past 50 must re-sort.
      expect(service.activePointIndex()).toBe(1);

      service.setFreePointPosition(1, { distanceToRefSupport: 70, altitude: 14 });

      expect(service.points.value.map((point) => point.distanceToRefSupport)).toEqual([0, 50, 70, 100]);
      expect(service.activePointIndex()).toBe(2);
    });
  });

  describe('canCalculateAndSave', () => {
    it('should be false while no span is selected', () => {
      expect(service.canCalculateAndSave()).toBe(false);
    });

    it('should be true once every point of an open floor is filled in', () => {
      openSavedFloor();

      expect(service.canCalculateAndSave()).toBe(true);
    });

    it('should be false while a point is still missing its altitude', () => {
      openSavedFloor();
      service.addPoint();

      expect(service.canCalculateAndSave()).toBe(false);
    });
  });

  describe('hasEditablePoints', () => {
    it('should be false for a floor holding only its reference and closing points', () => {
      expect(service.hasEditablePoints()).toBe(false);
    });

    it('should be true once a free point exists', () => {
      openSavedFloor();

      expect(service.hasEditablePoints()).toBe(true);
    });
  });

  describe('formatDistance', () => {
    it('should render a distance with two decimals', () => {
      expect(service.formatDistance(12.3456)).toBe('12.35');
    });

    it('should render an empty string when there is no distance yet', () => {
      expect(service.formatDistance(null)).toBe('');
    });
  });
});
