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

  describe('addBulkObstacles', () => {
    it('should dispatch Task.addBulkObstacles with obstacles and plotOptions', async () => {
      await service.addBulkObstacles([mockObstacle], mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.addBulkObstacles, {
        obstacles: [mockObstacle],
        startSupport: 0,
        endSupport: 1,
        view: '3d'
      });
    });

    it('should dispatch Task.addBulkObstacles with multiple obstacles and plotOptions', async () => {
      const secondObstacle = { ...mockObstacle, uuid: 'obs-2' };
      await service.addBulkObstacles([mockObstacle, secondObstacle], mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(Task.addBulkObstacles, {
        obstacles: [mockObstacle, secondObstacle],
        startSupport: 0,
        endSupport: 1,
        view: '3d'
      });
    });

    it('should not return a value', async () => {
      const result = await service.addBulkObstacles([mockObstacle], mockPlotOptions);

      expect(result).toBeUndefined();
    });

    it('should drop obstacles whose support no longer exists', async () => {
      const orphan = { ...mockObstacle, uuid: 'obs-orphan', supportIndex: -1 };
      await service.addBulkObstacles([mockObstacle, orphan], mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).toHaveBeenCalledWith(
        Task.addBulkObstacles,
        expect.objectContaining({ obstacles: [mockObstacle] })
      );
    });

    it('should not dispatch when every obstacle has an unknown support', async () => {
      await service.addBulkObstacles([{ ...mockObstacle, supportIndex: -1 }], mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).not.toHaveBeenCalled();
    });
  });

  describe('addSingleObstacle', () => {
    it('should not dispatch when the support no longer exists', async () => {
      await service.addSingleObstacle({ ...mockObstacle, supportIndex: -1 }, mockPlotOptions);

      expect(mockWorkerPythonService.runTaskWithTimeout).not.toHaveBeenCalled();
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

    it('should not return a value', async () => {
      const result = await service.deleteObstacle('obs-uuid-1', mockPlotOptions);

      expect(result).toBeUndefined();
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

    it('should not return a value', async () => {
      const result = await service.clearAllObstacles();

      expect(result).toBeUndefined();
    });
  });

  describe('syncObstacles', () => {
    it('should call addBulkObstacles once with all obstacles and plotOptions', async () => {
      const addSpy = vi.spyOn(service, 'addBulkObstacles').mockResolvedValue(undefined);
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

    it('should NOT call addBulkObstacles when obstacles array is empty', async () => {
      const addSpy = vi.spyOn(service, 'addBulkObstacles').mockResolvedValue(undefined);

      await service.syncObstacles([], { startSupport: 0, endSupport: 1, view: '3d', side: 'profile', invert: false });

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('should return undefined when obstacles array is empty', async () => {
      const result = await service.syncObstacles([], {
        startSupport: 0,
        endSupport: 1,
        view: '3d',
        side: 'profile',
        invert: false
      });

      expect(result).toBeUndefined();
    });

    it('should not return a value', async () => {
      vi.spyOn(service, 'addBulkObstacles').mockResolvedValue(undefined);

      const result = await service.syncObstacles([mockObstacle, { ...mockObstacle, uuid: 'obs-2' }], {
        startSupport: 0,
        endSupport: 1,
        view: '3d',
        side: 'profile',
        invert: false
      });

      expect(result).toBeUndefined();
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
