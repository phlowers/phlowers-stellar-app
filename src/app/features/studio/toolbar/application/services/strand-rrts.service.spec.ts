import { TestBed } from '@angular/core/testing';
import { StrandRrtsService } from './strand-rrts.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';

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

  beforeEach(() => {
    mockWorkerPythonService = { runTask: vi.fn((task: Task) => Promise.resolve(engineAnswer(task))) };
    TestBed.configureTestingModule({
      providers: [{ provide: WorkerPythonService, useValue: mockWorkerPythonService }]
    });
    service = TestBed.inject(StrandRrtsService);
  });

  describe('setCutStrands', () => {
    it('should send the cut strands of every layer to the engine', async () => {
      await service.setCutStrands([0, 4, 0, 0, 0, 0, 0, 0]);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledExactlyOnceWith(Task.setCutStrands, {
        cutStrands: [0, 4, 0, 0, 0, 0, 0, 0]
      });
    });

    it('should throw the engine error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue(engineAnswer(Task.setCutStrands, TaskError.CALCULATION_ERROR));

      await expect(service.setCutStrands([0])).rejects.toThrow(TaskError.CALCULATION_ERROR);
    });
  });

  describe('applySaved', () => {
    it('should send the saved cut strands to the engine', async () => {
      await service.applySaved({
        spanUuid: 's2',
        supportRef: 'RIGHT',
        distanceSupportRef: 12.5,
        cutStrands: [1, 3, 0, 0, 0, 0, 0, 0],
        addMarking: false
      });

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledExactlyOnceWith(Task.setCutStrands, {
        cutStrands: [1, 3, 0, 0, 0, 0, 0, 0]
      });
    });

    it('should clear the cut strands of every layer without saved entry', async () => {
      await service.applySaved(null);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledExactlyOnceWith(Task.setCutStrands, {
        cutStrands: [0, 0, 0, 0, 0, 0, 0, 0]
      });
    });

    it('should throw the engine error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue(engineAnswer(Task.setCutStrands, TaskError.CALCULATION_ERROR));

      await expect(service.applySaved(null)).rejects.toThrow(TaskError.CALCULATION_ERROR);
    });
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
      }
    );
  });
});
