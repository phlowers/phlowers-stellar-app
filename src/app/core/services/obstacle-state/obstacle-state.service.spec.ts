/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { ObstacleStateService } from './obstacle-state.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, Distance, ObstacleOutput } from '@services/worker_python/tasks/types';
import { Obstacle, LateralDistanceType, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { PlotOptions } from '@shared/types/plot.types';

const mockObstacleOutput: ObstacleOutput = {
  obstacles: [{ uuid: 'obs-1', points: [[10, 5, 8]] }]
};

const mockObstacle: Obstacle = {
  uuid: 'obs-1',
  supportUuid: 'sup-1',
  supportIndex: 0,
  name: 'Obstacle 1',
  type: 'building',
  altitudeType: 'absolute',
  referenceSupport: ReferenceSupport.LEFT,
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: [{ x: 10, y: 5, z: 8 }]
};

const mockPlotOptions: PlotOptions = {
  startSupport: 0,
  endSupport: 1,
  view: '3d',
  side: 'profile',
  invert: false
};

const mockDistance: Distance = {
  obstacleUuid: 'obs-1',
  points: [
    {
      pointIndex: 0,
      linePoint: [10, 0, 15],
      virtualPointHorizontal: [10, 5, 0],
      virtualPointVertical: [10, 0, 15],
      distanceDiagonal: 50,
      distanceHorizontal: 30,
      distanceVertical: 40
    }
  ]
};

describe('ObstacleStateService', () => {
  let service: ObstacleStateService;
  let mockWorkerPythonService: { runTaskWithTimeout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockWorkerPythonService = {
      runTaskWithTimeout: vi.fn().mockResolvedValue({ result: mockObstacleOutput, error: null })
    };

    TestBed.configureTestingModule({
      providers: [ObstacleStateService, { provide: WorkerPythonService, useValue: mockWorkerPythonService }]
    });

    service = TestBed.inject(ObstacleStateService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should initialize distances as empty array', () => {
      expect(service.distances()).toEqual([]);
    });

    it('should initialize distanceType as null', () => {
      expect(service.distanceType()).toBeNull();
    });
  });

  describe('addObstacle', () => {
    it('should dispatch Task.addObstacle with obstacles and plotOptions', async () => {
      await service.addObstacle([mockObstacle], mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.addObstacle, {
        obstacles: [mockObstacle],
        startSupport: 0,
        endSupport: 1,
        view: '3d'
      });
    });

    it('should dispatch Task.addObstacle with multiple obstacles and plotOptions', async () => {
      const secondObstacle = { ...mockObstacle, uuid: 'obs-2' };
      await service.addObstacle([mockObstacle, secondObstacle], mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.addObstacle, {
        obstacles: [mockObstacle, secondObstacle],
        startSupport: 0,
        endSupport: 1,
        view: '3d'
      });
    });

    it('should return the obstacle output on success', async () => {
      const result = await service.addObstacle([mockObstacle], mockPlotOptions);

      expect(result).toEqual(mockObstacleOutput);
    });

    it('should return null when task returns null result', async () => {
      mockWorkerPythonService.runTaskWithTimeout.mockResolvedValue({ result: null, error: null });

      const result = await service.addObstacle([mockObstacle], mockPlotOptions);

      expect(result).toBeNull();
    });
  });

  describe('deleteObstacle', () => {
    it('should dispatch Task.deleteObstacle with UUID and plotOptions', async () => {
      await service.deleteObstacle('obs-uuid-1', mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.deleteObstacle, {
        uuid: 'obs-uuid-1',
        startSupport: 0,
        endSupport: 1,
        view: '3d'
      });
    });

    it('should return the obstacle output on success', async () => {
      const result = await service.deleteObstacle('obs-uuid-1', mockPlotOptions);

      expect(result).toEqual(mockObstacleOutput);
    });

    it('should return null when task returns null result', async () => {
      mockWorkerPythonService.runTaskWithTimeout.mockResolvedValue({ result: null, error: null });

      const result = await service.deleteObstacle('obs-uuid-1', mockPlotOptions);

      expect(result).toBeNull();
    });
  });

  describe('clearAllObstacles', () => {
    it('should dispatch Task.clearObstacles with no inputs', async () => {
      await service.clearAllObstacles();

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.clearObstacles, undefined);
    });

    it('should reset distances signal', async () => {
      service.distances.set([mockDistance]);

      await service.clearAllObstacles();

      expect(service.distances()).toEqual([]);
    });

    it('should return the obstacle output on success', async () => {
      const result = await service.clearAllObstacles();

      expect(result).toEqual(mockObstacleOutput);
    });
  });

  describe('calculateDistances', () => {
    it('should dispatch Task.calculateObstaclesDistances with plot options', async () => {
      mockWorkerPythonService.runTaskWithTimeout.mockResolvedValue({ result: [mockDistance], error: null });
      const plotOptions = {
        startSupport: 0,
        endSupport: 2,
        view: '3d' as const,
        side: 'profile' as const,
        invert: false
      };

      await service.calculateDistances([mockObstacle], plotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.calculateObstaclesDistances, {
        obstacles: [mockObstacle],
        startSupport: 0,
        endSupport: 2,
        view: '3d'
      });
    });

    it('should update the distances signal with the result', async () => {
      mockWorkerPythonService.runTaskWithTimeout.mockResolvedValue({ result: [mockDistance], error: null });
      const plotOptions = {
        startSupport: 0,
        endSupport: 1,
        view: '3d' as const,
        side: 'profile' as const,
        invert: false
      };

      await service.calculateDistances([mockObstacle], plotOptions);

      expect(service.distances()).toEqual([mockDistance]);
    });

    it('should set distances to empty array when result is null', async () => {
      service.distances.set([mockDistance]);
      mockWorkerPythonService.runTaskWithTimeout.mockResolvedValue({ result: null, error: null });
      const plotOptions = {
        startSupport: 0,
        endSupport: 1,
        view: '3d' as const,
        side: 'profile' as const,
        invert: false
      };

      await service.calculateDistances([mockObstacle], plotOptions);

      expect(service.distances()).toEqual([]);
    });
  });

  describe('syncObstacles', () => {
    it('should call addObstacle once with all obstacles and plotOptions', async () => {
      const addSpy = vi.spyOn(service, 'addObstacle').mockResolvedValue(mockObstacleOutput);
      vi.spyOn(service, 'calculateDistances').mockResolvedValue(undefined);
      const secondObstacle = { ...mockObstacle, uuid: 'obs-2' };
      const plotOptions = {
        startSupport: 0,
        endSupport: 1,
        view: '3d' as const,
        side: 'profile' as const,
        invert: false
      };

      await service.syncObstacles([mockObstacle, secondObstacle], plotOptions);

      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith([mockObstacle, secondObstacle], plotOptions);
    });

    it('should call calculateDistances when obstacles are present', async () => {
      vi.spyOn(service, 'addObstacle').mockResolvedValue(mockObstacleOutput);
      const calcSpy = vi.spyOn(service, 'calculateDistances').mockResolvedValue(undefined);
      const plotOptions = {
        startSupport: 0,
        endSupport: 1,
        view: '3d' as const,
        side: 'profile' as const,
        invert: false
      };

      await service.syncObstacles([mockObstacle], plotOptions);

      expect(calcSpy).toHaveBeenCalledWith([mockObstacle], plotOptions);
    });

    it('should NOT call addObstacle or calculateDistances when obstacles array is empty', async () => {
      const addSpy = vi.spyOn(service, 'addObstacle').mockResolvedValue(mockObstacleOutput);
      const calcSpy = vi.spyOn(service, 'calculateDistances').mockResolvedValue(undefined);

      await service.syncObstacles([], { startSupport: 0, endSupport: 1, view: '3d', side: 'profile', invert: false });

      expect(addSpy).not.toHaveBeenCalled();
      expect(calcSpy).not.toHaveBeenCalled();
    });

    it('should return null when obstacles array is empty', async () => {
      vi.spyOn(service, 'calculateDistances').mockResolvedValue(undefined);

      const result = await service.syncObstacles([], {
        startSupport: 0,
        endSupport: 1,
        view: '3d',
        side: 'profile',
        invert: false
      });

      expect(result).toBeNull();
    });

    it('should return the addObstacle result', async () => {
      const allOutput: ObstacleOutput = {
        obstacles: [
          { uuid: 'obs-1', points: [[10, 5, 8]] },
          { uuid: 'obs-2', points: [[1, 2, 3]] }
        ]
      };
      vi.spyOn(service, 'addObstacle').mockResolvedValue(allOutput);
      vi.spyOn(service, 'calculateDistances').mockResolvedValue(undefined);

      const result = await service.syncObstacles([mockObstacle, { ...mockObstacle, uuid: 'obs-2' }], {
        startSupport: 0,
        endSupport: 1,
        view: '3d',
        side: 'profile',
        invert: false
      });

      expect(result).toEqual(allOutput);
    });
  });

  describe('reset', () => {
    it('should clear distances signal', () => {
      service.distances.set([mockDistance]);

      service.reset();

      expect(service.distances()).toEqual([]);
    });

    it('should set distanceType to null', () => {
      service.distanceType.set('oblique');

      service.reset();

      expect(service.distanceType()).toBeNull();
    });
  });

  describe('setDistances', () => {
    it('should update the distances signal', () => {
      service.setDistances([mockDistance]);

      expect(service.distances()).toEqual([mockDistance]);
    });

    it('should override previous distances', () => {
      service.distances.set([mockDistance]);
      service.setDistances([]);

      expect(service.distances()).toEqual([]);
    });
  });
});
