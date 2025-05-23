import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalViewComponent } from './global-view.component';
import { WorkerService } from '../../engine/worker/worker.service';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { of } from 'rxjs';
// import { input, model } from '@angular/core';

// Mock Plotly properly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({})
}));

// Import the mocked module
import * as Plotly from 'plotly.js-dist-min';

// Add mock data for tests at the top level
const mockLitData = {
  x: { 0: 0, 1: 1, 2: 2, 3: 3 },
  y: { 0: 0, 1: 1, 2: 2, 3: 3 },
  z: { 0: 0, 1: 1, 2: 2, 3: 3 },
  type: { 0: 'span', 1: 'support', 2: 'insulator', 3: 'span' },
  canton: { 0: 'phase_1', 1: 'phase_2', 2: 'phase_3', 3: 'garde' },
  support: { 0: 'Support 1', 1: 'Support 2', 2: 'Support 3', 3: 'Support 1' }
};

describe('GlobalViewComponent', () => {
  let component: GlobalViewComponent;
  let fixture: ComponentFixture<GlobalViewComponent>;
  let workerService: jest.Mocked<WorkerService>;

  beforeEach(async () => {
    // Create mock for WorkerService
    const mockWorkerService = {
      runTask: jest.fn(),
      ready$: of(true)
    };

    // Configure testing module
    await TestBed.configureTestingModule({
      imports: [
        GlobalViewComponent,
        FormsModule,
        NoopAnimationsModule,
        ButtonModule,
        InputNumberModule,
        ProgressSpinnerModule,
        TableModule,
        InputTextModule,
        CheckboxModule,
        NgxSliderModule,
        AutoCompleteModule,
        SelectModule
      ],
      providers: [{ provide: WorkerService, useValue: mockWorkerService }]
    }).compileComponents();

    // Create component and prepare for tests
    fixture = TestBed.createComponent(GlobalViewComponent);
    component = fixture.componentInstance;
    workerService = TestBed.inject(WorkerService) as jest.Mocked<WorkerService>;

    // Mock the DOM element for the plot
    const mockElement = document.createElement('div');
    mockElement.id = 'plotly-output';
    mockElement.style.width = '500px';
    mockElement.style.height = '500px';
    document.body.appendChild(mockElement);

    fixture.detectChanges();
  });

  afterEach(() => {
    const element = document.getElementById('plotly-output');
    if (element) {
      element.remove();
    }
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.selectedPhase()).toBe('all');
    expect(component.showOtherAsDashed()).toBe(false);
    expect(component.selectedView()).toBe('3d');
    expect(component.minValue()).toBe(0);
    expect(component.maxValue()).toBe(0);
  });

  it('should have correct phases options', () => {
    const phases = component.phases();
    expect(phases).toEqual(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
  });

  it('should have correct views options', () => {
    const views = component.views();
    expect(views).toEqual(['3d', '2d']);
  });

  it('should update phases on search', () => {
    const setPhaseSpy = jest.spyOn(component.phases, 'set');
    component.search();
    expect(setPhaseSpy).toHaveBeenCalledWith([
      'all',
      'phase_1',
      'phase_2',
      'phase_3',
      'garde'
    ]);
  });

  it('should call runTask when runPython is called', () => {
    component.runPython();
    expect(workerService.runTask).toHaveBeenCalled();
  });

  // Add tests for createPlot function
  describe('createPlot function', () => {
    beforeEach(() => {
      // Provide litData to the component
      // component.litData.set(mockLitData);
      fixture.componentRef.setInput('litData', mockLitData);
      jest.clearAllMocks();
    });

    it('should create a plot with correct data for all phases', async () => {
      // Spy on the data processing methods
      const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');
      const getAllSupportsSpy = jest.spyOn(component, 'getAllSupports');
      const getAllInsulatorsSpy = jest.spyOn(component, 'getAllInsulators');

      await component.createPlot(0, 3, 'all', false, undefined, '3d');

      // Check that data processing methods were called with correct params
      expect(getAllPhasesSpy).toHaveBeenCalledTimes(4); // Once for each phase
      expect(getAllSupportsSpy).toHaveBeenCalledTimes(1);
      expect(getAllInsulatorsSpy).toHaveBeenCalledTimes(1);

      // Check that Plotly.newPlot was called - use the imported Plotly instead of global
      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'plotly-output',
        expect.any(Array),
        expect.objectContaining({
          showlegend: false,
          scene: expect.objectContaining({
            aspectmode: 'manual'
          })
        }),
        expect.any(Object)
      );

      // Check that plot signal is set
      expect(component.plot()).not.toBeNull();
    });

    it('should only include selected phase when not showing others as dashed', async () => {
      const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');

      await component.createPlot(0, 3, 'phase_1', false, undefined, '3d');

      // Should only call getAllPhases for phase_1
      expect(getAllPhasesSpy).toHaveBeenCalledWith({
        litCanton: ['phase_1', 'phase_2', 'phase_3', 'garde'],
        litSupports: ['Support 1', 'Support 2', 'Support 3', 'Support 1'],
        litType: ['span', 'support', 'insulator', 'span'],
        litXs: [0, 1, 2, 3],
        litYs: [0, 1, 2, 3],
        litZs: [0, 1, 2, 3],
        name: 'phase_1',
        uniqueSupports: ['Support 1', 'Support 2', 'Support 3'],
        view: '3d'
      });

      // Check it wasn't called for other phases
      const calls = getAllPhasesSpy.mock.calls;
      const phase2Calls = calls.filter((call) => call[0].name === 'phase_2');
      const phase3Calls = calls.filter((call) => call[0].name === 'phase_3');

      // Only one call should be for phase_1
      const phase1Calls = calls.filter((call) => call[0].name === 'phase_1');
      expect(phase1Calls.length).toBe(1);

      // No calls for phase_2, phase_3 and garde if not showing as dashed
      expect(phase2Calls.length).toBe(0);
      expect(phase3Calls.length).toBe(0);
    });

    it('should show other phases as dashed when showOtherAsDashed is true', async () => {
      const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');

      await component.createPlot(0, 3, 'phase_1', true, undefined, '3d');

      // Should call getAllPhases for all phases
      expect(getAllPhasesSpy).toHaveBeenCalledTimes(4);

      // The dash parameter in getAllPhases is handled inside the method
      // We'd need to check the result of getAllPhases, which creates the traces
    });

    it('should switch between 3d and 2d views', async () => {
      // First test 3D view
      await component.createPlot(0, 3, 'all', false, undefined, '3d');

      // Check that 3D plot was created - use imported Plotly
      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'plotly-output',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'scatter3d'
          })
        ]),
        expect.any(Object),
        expect.any(Object)
      );

      // Clear mocks and test 2D view
      jest.clearAllMocks();

      await component.createPlot(0, 3, 'all', false, undefined, '2d');

      // Check that 2D plot was created - use imported Plotly
      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'plotly-output',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'scatter'
          })
        ]),
        expect.any(Object),
        expect.any(Object)
      );
    });

    // it('should not create plot if litData is not available', async () => {
    //   component.litData.set(null);

    //   await component.createPlot(0, 3, 'all', false, undefined, '3d');
    //   expect(Plotly.newPlot).not.toHaveBeenCalled();
    // });

    // it('should respect min and max value filters for support display', async () => {
    //   // Test with a range that only includes the first support
    //   await component.createPlot(0, 1, 'all', false, undefined, '3d');

    //   // Get the call arguments to Plotly.newPlot
    //   const callArgs = (Plotly.newPlot as jest.Mock).mock.calls[0];
    //   const plotData = callArgs[1];

    //   // Get traces that include 'Support 2'
    //   const support2Traces = plotData.filter(
    //     (trace: any) =>
    //       trace.text &&
    //       (Array.isArray(trace.text)
    //         ? trace.text.includes('Support 2')
    //         : trace.text === 'Support 2')
    //   );

    //   // Since maxValue is 1, Support 2 should not be included
    //   expect(support2Traces.length).toBe(0);
    // });
  });
});
