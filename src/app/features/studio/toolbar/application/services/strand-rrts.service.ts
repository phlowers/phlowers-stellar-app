import { inject, Injectable } from '@angular/core';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs, TaskOutputs } from '@services/worker_python/tasks/types';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { NO_CUT_STRANDS } from '@features/studio/toolbar/presentation/components/strand-rrts/strand-rrts.constantes';
import { RrtsResults } from '@features/studio/toolbar/presentation/components/strand-rrts/strand-rrts.interfaces';
import { maxOf } from '@features/studio/toolbar/presentation/services/section-state-report/section-state-report.helpers';

// Runs the RRTS tasks of the Python engine, which keeps the cut strands it is given until it is given others
@Injectable({
  providedIn: 'root'
})
export class StrandRrtsService {
  private readonly workerPythonService = inject(WorkerPythonService);

  // One value per catalog layer, 0 for the layers without strands
  async setCutStrands(cutStrands: number[]): Promise<void> {
    await this.runTask(Task.setCutStrands, { cutStrands });
  }

  // The engine holds the saved cut strands, none on any layer without saved entry: what the studio shows
  async applySaved(entry: RrtsCutStrandsData | null): Promise<void> {
    await this.setCutStrands(entry?.cutStrands ?? NO_CUT_STRANDS);
  }

  // Leaves the given cut strands in the engine
  async calculate(cutStrands: number[]): Promise<RrtsResults> {
    await this.setCutStrands(cutStrands);
    const { rrts } = await this.runTask(Task.getRrts, undefined);
    const { utilizationRate } = await this.runTask(Task.getUtilizationRate, undefined);
    // One rate per support: the last support starts no span, its rate is NaN
    return { rrts, newWorkLoad: maxOf(utilizationRate.filter(Number.isFinite)) };
  }

  // Engine errors come back with the task result: throw them to stop at the failing step
  private async runTask<T extends Task>(task: T, inputs: TaskInputs[T]): Promise<TaskOutputs[T]> {
    const { result, error } = await this.workerPythonService.runTask(task, inputs);
    if (error) throw new Error(error);
    return result;
  }
}
