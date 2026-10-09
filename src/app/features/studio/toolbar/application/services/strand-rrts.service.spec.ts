import { TestBed } from '@angular/core/testing';
import { StrandRrtsService } from './strand-rrts.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { PlotService } from '@services/plot/plot.service';

const ENGINE_RESULTS: Partial<Record<Task, unknown>> = {
  [Task.getRrts]: { rrts: 23114 },
  // One rate per support: the last support starts no span
  [Task.getUtilizationRate]: { utilizationRate: [30, 49.21, 12, Number.NaN] }
};

const engineAnswer = (task: Task, error: TaskError | null = null) => ({
  result: error ? null : (ENGINE_RESULTS[task] ?? { success: true }),
  error,
  diagnostics: []
});

describe('StrandRrtsService', () => {
  let service: StrandRrtsService;
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockPlotService: { restoreCutStrands: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockWorkerPythonService = { runTask: vi.fn((task: Task) => Promise.resolve(engineAnswer(task))) };
    mockPlotService = { restoreCutStrands: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: PlotService, useValue: mockPlotService }
      ]
    });
    service = TestBed.inject(StrandRrtsService);
  });

  describe('calculate', () => {
    it('should set the cut strands, then read the RRTS and the utilization rates', async () => {
      await service.calculate([1, 3, 0, 0, 0, 0, 0, 0]);

      expect(mockWorkerPythonService.runTask.mock.calls).toEqual([
        [Task.setCutStrands, { cutStrands: [1, 3, 0, 0, 0, 0, 0, 0] }],
        [Task.getRrts, undefined],
        [Task.getUtilizationRate, undefined]
      ]);
    });

    it('should give the engine study its saved cut strands back once the results are read', async () => {
      await service.calculate([1, 3, 0, 0, 0, 0, 0, 0]);

      expect(mockPlotService.restoreCutStrands).toHaveBeenCalledExactlyOnceWith([1, 3, 0, 0, 0, 0, 0, 0]);
      expect(mockPlotService.restoreCutStrands.mock.invocationCallOrder[0]).toBeGreaterThan(
        mockWorkerPythonService.runTask.mock.invocationCallOrder.at(-1)!
      );
    });

    it('should return the RRTS and the highest utilization rate, ignoring the last support', async () => {
      await expect(service.calculate([1, 3, 0, 0, 0, 0, 0, 0])).resolves.toEqual({ rrts: 23114, newWorkLoad: 49.21 });
    });

    it('should return no new working load when no rate is finite', async () => {
      mockWorkerPythonService.runTask.mockImplementation((task: Task) =>
        Promise.resolve(
          task === Task.getUtilizationRate
            ? { result: { utilizationRate: [Number.NaN] }, error: null, diagnostics: [] }
            : engineAnswer(task)
        )
      );

      await expect(service.calculate([0])).resolves.toEqual({ rrts: 23114, newWorkLoad: null });
    });

    it.each([Task.setCutStrands, Task.getRrts, Task.getUtilizationRate])(
      'should stop at the failing %s task',
      async (failingTask) => {
        mockWorkerPythonService.runTask.mockImplementation((task: Task) =>
          Promise.resolve(engineAnswer(task, task === failingTask ? TaskError.CALCULATION_ERROR : null))
        );

        await expect(service.calculate([0])).rejects.toThrow(TaskError.CALCULATION_ERROR);

        const tasks = mockWorkerPythonService.runTask.mock.calls.map(([task]) => task);
        expect(tasks.at(-1)).toBe(failingTask);
        expect(mockPlotService.restoreCutStrands).toHaveBeenCalledExactlyOnceWith([0]);
      }
    );
  });
});
