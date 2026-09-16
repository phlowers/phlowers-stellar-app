/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';

import { DistanceMeasuringService } from '@features/studio/distance-measuring/distance-measuring.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { Section } from '@shared/domain';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';
import { FreePositioningDataService } from './free-positioning-data.service';

describe('FreePositioningDataService', () => {
  let service: FreePositioningDataService;
  let fb: FormBuilder;

  const mockSection: Section = {
    uuid: 'sec-1',
    name: 'Section 1',
    supports: [
      { uuid: 'sup-0', number: '0' },
      { uuid: 'sup-1', number: '1' },
      { uuid: 'sup-2', number: '2' }
    ] as Section['supports'],
    obstacles: [
      {
        uuid: 'obs-saved-1',
        name: 'Tree',
        supportUuid: 'sup-0',
        supportIndex: 0,
        type: 'tree',
        altitudeType: 'absolute',
        referenceSupport: 0 as unknown as never,
        lateralDistanceType: 0 as unknown as never,
        positions: [{ x: 50, y: 10, z: 120 }]
      }
    ],
    floors: [
      {
        uuid: 'floor-saved-1',
        supportUuid: 'sup-0',
        referenceSupport: 'LEFT',
        points: [{ distanceToRefSupport: 25, altitude: 95 }]
      }
    ],
    charges: [],
    selected_charge_uuid: undefined
  } as unknown as Section;

  const mockLitData: GetSectionOutput = {
    coords: {
      spans: [],
      supports: [
        [[0, 0, 100]],
        [[200, 0, 105]],
        [[400, 0, 110]]
      ],
      insulators: []
    },
    obstacles: [
      {
        uuid: 'obs-saved-1',
        points: [[50, 10, 120]]
      }
    ],
    output_parameters: {
      span_length: [200, 200],
      loads_coords: {
        0: [30, 0, 130]
      }
    }
  } as unknown as GetSectionOutput;

  const mockPlotSpanService = {
    section: signal<Section | null>(mockSection),
    getSupportIndex: vi.fn((uuid: string) => (uuid === 'sup-1' ? 1 : 0))
  };

  const mockPlotService = {
    litData: signal<GetSectionOutput | null>(mockLitData),
    temporaryLoadData: null as unknown as { spanLoads: { loadPosition: number; type: string; supportUuid: string }[] } | null
  };

  let mockObstacleForm: ReturnType<FormBuilder['group']>;
  const mockObstacleFormService = {
    form: null as unknown as ReturnType<FormBuilder['group']>
  };

  const mockObstaclesService = {
    activePointIndex: signal<number | null>(0)
  };

  const mockFloorFormService = {
    pointsView: vi.fn(),
    activePointIndex: signal<number | null>(1),
    spanValue: signal<string | null>('sup-0')
  };

  const mockDistanceMeasuringService = {
    positions: signal([{ x: 75, y: 5, z: 115 }]),
    activePointIndex: signal<number | null>(0),
    selectedSupportUuid: signal<string | null>('sup-0')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fb = new FormBuilder();

    mockObstacleForm = fb.group({
      positions: fb.array([
        fb.group({ x: [50], y: [10], z: [120] }),
        fb.group({ x: [80], y: [15], z: [125] })
      ]),
      supportUuid: ['sup-0'],
      altitudeType: ['absolute'],
      referenceSupport: ['LEFT']
    });
    mockObstacleFormService.form = mockObstacleForm;

    mockFloorFormService.pointsView.mockReturnValue([
      {
        group: fb.group({ distanceToRefSupport: [0], altitude: [100] }),
        meta: { removable: false }
      },
      {
        group: fb.group({ distanceToRefSupport: [45], altitude: [98] }),
        meta: { removable: true }
      },
      {
        group: fb.group({ distanceToRefSupport: [200], altitude: [105] }),
        meta: { removable: false }
      }
    ]);

    mockPlotService.temporaryLoadData = {
      spanLoads: [{ loadPosition: 30, type: 'punctual', supportUuid: 'sup-0' }]
    };

    TestBed.configureTestingModule({
      providers: [
        FreePositioningDataService,
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: ObstaclesService, useValue: mockObstaclesService },
        { provide: FloorFormService, useValue: mockFloorFormService },
        { provide: DistanceMeasuringService, useValue: mockDistanceMeasuringService },
        { provide: TranslocoService, useValue: { translate: vi.fn((key: string) => key) } }
      ]
    });

    service = TestBed.inject(FreePositioningDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('buildAggregateParams', () => {
    it('should aggregate state from all injected services', () => {
      const params = service.buildAggregateParams(0, 'obstacle');

      expect(params.frozenSpan).toBe(0);
      expect(params.editableCategory).toBe('obstacle');
      expect(params.section).toBe(mockSection);
      expect(params.litData).toBe(mockLitData);
      expect(params.supports).toHaveLength(3);
      expect(params.activeObstaclePositions).toHaveLength(2);
      expect(params.activeObstacleIndex).toBe(0);
      expect(params.activeFloorPoints).toHaveLength(3);
      expect(params.distancePositions).toHaveLength(1);
      expect(params.loadPosition).toBe(30);
      expect(params.loadType).toBe('punctual');
    });

    it('should respect overrides passed to buildAggregateParams', () => {
      const params = service.buildAggregateParams(0, 'obstacle', {
        loadPosition: 99,
        activeObstacleIndex: 1
      });

      expect(params.loadPosition).toBe(99);
      expect(params.activeObstacleIndex).toBe(1);
    });
  });

  describe('getPoints', () => {
    it('should return aggregated points for obstacle category', () => {
      const points = service.getPoints(0, 'obstacle');

      const obstaclePoints = points.filter((p) => p.category === 'obstacle');
      expect(obstaclePoints.length).toBeGreaterThan(0);
      expect(obstaclePoints[0].editable).toBe(true); // active index 0
      expect(obstaclePoints[1].editable).toBe(false);

      const floorPoints = points.filter((p) => p.category === 'floor');
      expect(floorPoints.length).toBeGreaterThan(0);
      expect(floorPoints.every((p) => !p.editable)).toBe(true);

      const distancePoints = points.filter((p) => p.category === 'distance');
      expect(distancePoints.length).toBeGreaterThan(0);
      expect(distancePoints.every((p) => !p.editable)).toBe(true);

      const loadPoints = points.filter((p) => p.category === 'loads');
      expect(loadPoints.length).toBeGreaterThan(0);
      expect(loadPoints[0].editable).toBe(false);
    });

    it('should mark floor point as editable when editableCategory is floor', () => {
      const points = service.getPoints(0, 'floor');

      const floorPoints = points.filter((p) => p.category === 'floor');
      // activeFloorIndex is 1, removable is true
      expect(floorPoints[1].editable).toBe(true);
      expect(floorPoints[0].editable).toBe(false);

      const obstaclePoints = points.filter((p) => p.category === 'obstacle');
      expect(obstaclePoints.every((p) => !p.editable)).toBe(true);
    });

    it('should mark distance point as editable when editableCategory is distance', () => {
      const points = service.getPoints(0, 'distance');

      const distancePoints = points.filter((p) => p.category === 'distance');
      expect(distancePoints[0].editable).toBe(true);
    });

    it('should mark load point as editable when editableCategory is loads', () => {
      const points = service.getPoints(0, 'loads');

      const loadPoints = points.filter((p) => p.category === 'loads');
      expect(loadPoints[0].editable).toBe(true);
    });
  });
});
