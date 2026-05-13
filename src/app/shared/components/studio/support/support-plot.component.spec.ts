import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportPlotComponent } from '@shared/components/studio/support/support-plot.component';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';

const plotlyMocks = vi.hoisted(() => ({
  newPlot: vi.fn(),
  react: vi.fn(),
  purge: vi.fn()
}));

vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    newPlot: plotlyMocks.newPlot,
    react: plotlyMocks.react,
    purge: plotlyMocks.purge
  }
}));

describe('SupportPlotComponent', () => {
  let fixture: ComponentFixture<SupportPlotComponent>;
  let component: SupportPlotComponent;
  let workerPythonServiceMock: {
    ready: boolean;
    runTask: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    plotlyMocks.newPlot.mockReset();
    plotlyMocks.react.mockReset();
    plotlyMocks.purge.mockReset();

    workerPythonServiceMock = {
      ready: true,
      runTask: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SupportPlotComponent],
      providers: [{ provide: WorkerPythonService, useValue: workerPythonServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(SupportPlotComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should clear plot when inputs are missing', () => {
    fixture.detectChanges();

    expect(plotlyMocks.purge).toHaveBeenCalledWith('plotly-output-support');
  });

  it('should call worker and render grouped text plus selected marker when inputs are valid', async () => {
    workerPythonServiceMock.runTask.mockResolvedValue({
      result: {
        shape_points: [
          [0, 0, 0],
          [1, 1, 1]
        ],
        text_display_points: [
          [10, 20, 30],
          [10, 20, 30],
          [40, 50, 60]
        ],
        text_to_display: [1, 2, 3]
      }
    });

    fixture.componentRef.setInput('coordinates', [
      [0, 0, 0],
      [1, 1, 1]
    ]);
    fixture.componentRef.setInput('attachmentSetNumbers', [1, 2, 3]);
    fixture.componentRef.setInput('selectedAttachmentSetNumber', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(workerPythonServiceMock.runTask).toHaveBeenCalledWith(Task.getSupportCoordinates, {
      coordinates: [
        [0, 0, 0],
        [1, 1, 1]
      ],
      attachmentSetNumbers: [1, 2, 3]
    });
    expect(plotlyMocks.react).toHaveBeenCalledTimes(1);

    const [plotId, plotData, layout] = plotlyMocks.react.mock.calls[0];
    expect(plotId).toBe('plotly-output-support');
    expect(layout).toEqual({
      autosize: true,
      showlegend: false,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      width: 550
    });
    expect(plotData).toHaveLength(3);
    expect(plotData[0]).toEqual({
      x: [0, 1],
      y: [0, 1],
      z: [0, 1],
      type: 'scatter3d',
      mode: 'lines',
      line: { color: 'blue', width: 2 }
    });
    expect(plotData[1]).toEqual({
      x: [10, 40],
      y: [20, 50],
      z: [30, 60],
      type: 'scatter3d',
      mode: 'text',
      text: ['1, 2', '3'],
      textfont: { size: 15 },
      insidetextanchor: 'start',
      textposition: 'middle center'
    });
    expect(plotData[2]).toEqual({
      x: [10],
      y: [20],
      z: [30],
      type: 'scatter3d',
      mode: 'markers',
      marker: { color: 'red', opacity: 0.5, size: 10 }
    });
  });

  it('should clear plot when worker returns no result', async () => {
    workerPythonServiceMock.runTask.mockResolvedValue({ result: null });

    await component.refreshPlot(
      [
        [0, 0, 0],
        [1, 1, 1]
      ],
      [1, 2],
      1
    );

    expect(plotlyMocks.purge).toHaveBeenCalledWith('plotly-output-support');
    expect(plotlyMocks.newPlot).not.toHaveBeenCalled();
  });

  it('should render without selected marker when selected attachment set is undefined', async () => {
    workerPythonServiceMock.runTask.mockResolvedValue({
      result: {
        shape_points: [
          [0, 0, 0],
          [1, 1, 1]
        ],
        text_display_points: [[10, 20, 30]],
        text_to_display: [1]
      }
    });

    await component.refreshPlot(
      [
        [0, 0, 0],
        [1, 1, 1]
      ],
      [1],
      undefined
    );

    const [, plotData] = plotlyMocks.react.mock.calls[0];
    expect(plotData).toHaveLength(2);
  });

  it('should clear plot when worker throws an error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    workerPythonServiceMock.runTask.mockRejectedValue(new Error('worker failure'));

    await component.refreshPlot(
      [
        [0, 0, 0],
        [1, 1, 1]
      ],
      [1],
      1
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error refreshing plot:', expect.any(Error));
    expect(plotlyMocks.purge).toHaveBeenCalledWith('plotly-output-support');
    expect(plotlyMocks.react).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  describe('ngOnDestroy', () => {
    it('should purge the plot on component destroy', () => {
      fixture.detectChanges();
      plotlyMocks.purge.mockReset();

      fixture.destroy();

      expect(plotlyMocks.purge).toHaveBeenCalledWith('plotly-output-support');
    });
  });
});
