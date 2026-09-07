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
import { Distance, GetSectionOutput } from '@services/worker_python/tasks/types';

const floor: Floor = {
  uuid: 'floor-1',
  supportUuid: 's0',
  referenceSupport: 'LEFT',
  points: [
    { distanceToRefSupport: 0, altitude: 10 },
    { distanceToRefSupport: 30, altitude: 20 },
    { distanceToRefSupport: 100, altitude: 12 }
  ]
};

// The saved floor as the engine projects it: [x, y, z] along the span axis.
const floorPolyline = [
  [0, 0, 10],
  [30, 0, 20],
  [100, 0, 12]
];

const section = {
  supports: [
    { uuid: 's0', spanLength: 100, supportFootAltitude: 10 },
    { uuid: 's1', spanLength: null, supportFootAltitude: 12 }
  ],
  floors: [floor]
} as unknown as Section;

/** Builds the engine's rendered geometry: the floor polyline and the span's cable polyline. */
const litDataFor = (cablePoints: number[][], floorPoints = floorPolyline): GetSectionOutput =>
  ({
    coords: { spans: [cablePoints] },
    obstacles: [{ uuid: 'floor-1', points: floorPoints }]
  }) as unknown as GetSectionOutput;

describe('FloorFormService', () => {
  let service: FloorFormService;
  let distancesSignal: ReturnType<typeof signal<Distance[]>>;
  let litDataSignal: ReturnType<typeof signal<GetSectionOutput | null>>;
  let sectionSignal: ReturnType<typeof signal<Section | null>>;
  let distanceTypeSignal: ReturnType<typeof signal<string | null>>;
  let obstaclesServiceMock: {
    selectedMeasureUuid: ReturnType<typeof signal<string | null>>;
    activePointIndex: ReturnType<typeof signal<number | null>>;
    setSelectedMeasure: (uuid: string | null, pointIndex: number | null) => void;
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
    litDataSignal = signal<GetSectionOutput | null>(null);
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
          useValue: {
            plotOptionsChange: vi.fn(),
            study: signal({ uuid: 'study-1' }),
            refreshProjection: vi.fn(),
            litData: litDataSignal
          }
        },
        { provide: PlotOptionsService, useValue: { camera: signal(null), plotOptions: signal({}) } },
        { provide: SectionService, useValue: { createOrUpdateSection: vi.fn() } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: LoggerService, useValue: { warn: vi.fn() } },
        {
          provide: ObstacleStateService,
          useValue: {
            distances: distancesSignal,
            distanceType: distanceTypeSignal,
            addSingleObstacle: vi.fn(),
            deleteObstacle: vi.fn()
          }
        },
        { provide: ObstaclesService, useValue: obstaclesServiceMock },
        { provide: TranslocoService, useValue: { translate: vi.fn((key: string) => key) } }
      ]
    });

    service = TestBed.inject(FloorFormService);
    TestBed.flushEffects();
  });

  describe('results', () => {
    // Cable hanging from 40 m at both supports down to its lowest point at mid-span (x = 65).
    const saggingCable = [
      [0, 0, 40],
      [65, 0, 20],
      [100, 0, 40]
    ];

    it('should be empty while no floor is open', () => {
      litDataSignal.set(litDataFor(saggingCable));

      expect(service.results()).toEqual({
        minVerticalDistance: null,
        floorAltitude: null,
        cableAltitude: null,
        minVerticalPosition: null
      });
    });

    it('should be empty while the section is not projected yet', () => {
      openSavedFloor();

      expect(service.results()).toEqual({
        minVerticalDistance: null,
        floorAltitude: null,
        cableAltitude: null,
        minVerticalPosition: null
      });
    });

    it('should be empty when the projection carries no geometry for the saved floor', () => {
      openSavedFloor();
      litDataSignal.set({ coords: { spans: [saggingCable] }, obstacles: [] } as unknown as GetSectionOutput);

      expect(service.results()).toEqual({
        minVerticalDistance: null,
        floorAltitude: null,
        cableAltitude: null,
        minVerticalPosition: null
      });
    });

    it('should report the narrowest clearance even when it falls between two floor points', () => {
      openSavedFloor();
      litDataSignal.set(litDataFor(saggingCable));

      // The cable is 10.77 m above the nearest floor point (x = 30) but only 4 m above the floor
      // where it sags lowest (x = 65), halfway between that point and the closing support.
      expect(service.results()).toEqual({
        minVerticalDistance: 4,
        floorAltitude: 16,
        cableAltitude: 20,
        minVerticalPosition: 65
      });
    });

    it('should keep the negative distance and a cable altitude below the floor when the cable dips under it', () => {
      openSavedFloor();
      litDataSignal.set(
        litDataFor([
          [0, 0, 40],
          [65, 0, 14],
          [100, 0, 40]
        ])
      );

      expect(service.results()).toEqual({
        minVerticalDistance: -2,
        floorAltitude: 16,
        cableAltitude: 14,
        minVerticalPosition: 65
      });
    });

    it('should mirror the position, and only it, when the floor is read from the other support', () => {
      openSavedFloor();
      litDataSignal.set(litDataFor(saggingCable));
      service.form.controls.referenceSupport.setValue('RIGHT');
      TestBed.flushEffects();

      // Same geometry seen from the closing support: the narrowest point is 35 m away from it.
      expect(service.results()).toEqual({
        minVerticalDistance: 4,
        floorAltitude: 16,
        cableAltitude: 20,
        minVerticalPosition: 35
      });
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
        { altitude: 20, distanceToRefSupport: 30 },
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

    it('should keep the saved endpoint altitudes when the supports carry no foot altitude', () => {
      // Without a foot altitude the endpoint stays editable (see `pointsMeta`), so the saved value
      // must survive instead of being wiped to null.
      sectionSignal.set({
        ...section,
        supports: [
          { uuid: 's0', spanLength: 100, supportFootAltitude: null },
          { uuid: 's1', spanLength: null, supportFootAltitude: null }
        ]
      } as unknown as Section);
      openSavedFloor();

      expect(service.points.at(0).controls.altitude.value).toBe(10);
      expect(service.points.at(-1).controls.altitude.value).toBe(12);
    });
  });

  describe('reference support flip', () => {
    // A span holds a single floor profile, so flipping the side must re-read the saved one from the
    // other end, not hide it and let a save create a second floor for the same span.
    const flipToRight = () => {
      openSavedFloor();
      service.form.controls.referenceSupport.setValue('RIGHT');
      TestBed.flushEffects();
    };

    it('should keep the saved floor open', () => {
      flipToRight();

      expect(service.isFloorSaved()).toBe(true);
      expect(service.savedFloorUuid()).toBe('floor-1');
    });

    it('should mirror the saved point distances and reverse their order', () => {
      flipToRight();

      expect(service.points.value).toEqual([
        { altitude: 12, distanceToRefSupport: 0 },
        { altitude: 20, distanceToRefSupport: 70 },
        { altitude: 10, distanceToRefSupport: 100 }
      ]);
    });

    it('should report the active point at its index in the saved point order', () => {
      flipToRight();

      service.setActivePoint(0);

      expect(service.activeSavedPointIndex()).toBe(2);
      expect(obstaclesServiceMock.setSelectedMeasure).toHaveBeenCalledWith('floor-1', 2);
    });

    it('should replace the saved floor on save instead of adding a second one for the span', async () => {
      flipToRight();

      await service.calculateAndSave();

      expect(sectionSignal()?.floors).toEqual([
        {
          uuid: 'floor-1',
          supportUuid: 's0',
          referenceSupport: 'RIGHT',
          points: [
            { altitude: 12, distanceToRefSupport: 0 },
            { altitude: 20, distanceToRefSupport: 70 },
            { altitude: 10, distanceToRefSupport: 100 }
          ]
        }
      ]);
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
      // Points are [ref(0), new(empty), 30, closing(100)]; placing the new one past 30 must re-sort.
      expect(service.activePointIndex()).toBe(1);

      service.setFreePointPosition(1, { distanceToRefSupport: 70, altitude: 14 });

      expect(service.points.value.map((point) => point.distanceToRefSupport)).toEqual([0, 30, 70, 100]);
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

  describe('eraseFloor', () => {
    it('should remove the floor from the section', async () => {
      openSavedFloor();

      await service.eraseFloor();

      expect(sectionSignal()?.floors).toEqual([]);
    });

    it('should drop the quick-measures selection pointing at the erased floor', async () => {
      openSavedFloor();
      service.setActivePoint(1);

      await service.eraseFloor();

      // A dangling uuid would stop reading as a floor while staying truthy, leaving the obstacle
      // distance-type radios enabled on a measure that no longer exists.
      expect(obstaclesServiceMock.selectedMeasureUuid()).toBeNull();
      expect(obstaclesServiceMock.activePointIndex()).toBeNull();
      expect(distanceTypeSignal()).toBeNull();
    });

    it('should do nothing while a calculate-and-save is in flight', async () => {
      openSavedFloor();
      service.isCalculating.set(true);

      await service.eraseFloor();

      // The erase button is disabled meanwhile, so this only guards the race the disabled state hides.
      expect(sectionSignal()?.floors).toEqual([floor]);
      const obstacleState = TestBed.inject(ObstacleStateService) as unknown as {
        deleteObstacle: ReturnType<typeof vi.fn>;
      };
      expect(obstacleState.deleteObstacle).not.toHaveBeenCalled();
    });

    it('should leave a selection pointing at another measure untouched', async () => {
      openSavedFloor();
      obstaclesServiceMock.setSelectedMeasure('obstacle-1', 0);

      await service.eraseFloor();

      expect(obstaclesServiceMock.selectedMeasureUuid()).toBe('obstacle-1');
      expect(obstaclesServiceMock.activePointIndex()).toBe(0);
    });
  });

  describe('rollback on failure', () => {
    const failPersistence = () => {
      const sectionService = TestBed.inject(SectionService) as unknown as {
        createOrUpdateSection: ReturnType<typeof vi.fn>;
      };
      sectionService.createOrUpdateSection.mockRejectedValue(new Error('persistence down'));
      return TestBed.inject(ObstacleStateService) as unknown as {
        addSingleObstacle: ReturnType<typeof vi.fn>;
      };
    };

    it('should keep the previously saved floor when the save fails', async () => {
      openSavedFloor();
      const obstacleState = failPersistence();
      service.points.at(0).controls.altitude.setValue(99);

      await service.calculateAndSave();

      // A section already holding the new floor would report an unsaved floor as saved.
      expect(sectionSignal()?.floors).toEqual([floor]);
      // The worker keeps the floor the failed save registered: re-register the previous one over it.
      expect(obstacleState.addSingleObstacle).toHaveBeenLastCalledWith(
        expect.objectContaining({
          uuid: 'floor-1',
          positions: [
            { x: 0, y: 0, z: 10 },
            { x: 30, y: 0, z: 20 },
            { x: 100, y: 0, z: 12 }
          ]
        }),
        expect.anything()
      );
    });

    it('should keep the floor when the erase fails', async () => {
      openSavedFloor();
      const obstacleState = failPersistence();

      await service.eraseFloor();

      expect(sectionSignal()?.floors).toEqual([floor]);
      expect(obstacleState.addSingleObstacle).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: 'floor-1' }),
        expect.anything()
      );
    });
  });
});
