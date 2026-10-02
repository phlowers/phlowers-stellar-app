import { inject, Injectable } from '@angular/core';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs, TaskOutputs } from '@services/worker_python/tasks/types';
import { PlotService } from '@services/plot/plot.service';
import { maxOf } from '@shared/helpers/maxOf';
import { RrtsResults } from './strand-rrts.interfaces';

// Runs the RRTS tasks of the Python engine, which keeps the cut strands it is given until it is given others
@Injectable({
  providedIn: 'root'
})
export class StrandRrtsService {
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly plotService = inject(PlotService);

  // One value per catalog layer, 0 for the layers without strands. The engine study holds the saved cut strands, which
  // the studio shows: they go back once the results are read
  async calculate(cutStrands: number[]): Promise<RrtsResults> {
    try {
      await this.runTask(Task.setCutStrands, { cutStrands });
      const { rrts } = await this.runTask(Task.getRrts, undefined);
      const { utilizationRate } = await this.runTask(Task.getUtilizationRate, undefined);
      // One rate per support: the last support starts no span, its rate is NaN
      return { rrts, newWorkLoad: maxOf(utilizationRate.filter(Number.isFinite)) };
    } finally {
      await this.plotService.restoreCutStrands(cutStrands);
    }
  }

  // Engine errors come back with the task result: throw them to stop at the failing step
  private async runTask<T extends Task>(task: T, inputs: TaskInputs[T]): Promise<TaskOutputs[T]> {
    const { result, error } = await this.workerPythonService.runTask(task, inputs);
    if (error) throw new Error(error);
    return result;
  }
}
