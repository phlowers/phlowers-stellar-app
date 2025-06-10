import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SingleSpanComponent } from './single-span.component';
import { WorkerService } from '@core/services/worker_python/worker_python.service';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { of } from 'rxjs';

// Mock Plotly properly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({}),
  relayout: jest.fn().mockResolvedValue({})
}));

// Import the mocked module
import * as Plotly from 'plotly.js-dist-min';

// Add mock data for tests
const mockLitData = {
  x: { 0: 0, 1: 1, 2: 2, 3: 3 },
  y: { 0: 0, 1: 1, 2: 2, 3: 3 },
  z: { 0: 0, 1: 1, 2: 2, 3: 3 },
  type: { 0: 'span', 1: 'support', 2: 'insulator', 3: 'span' },
  canton: { 0: 'phase_1', 1: 'phase_2', 2: 'phase_3', 3: 'garde' },
  support: { 0: 'Support 1', 1: 'Support 2', 2: 'Support 3', 3: 'Support 1' }
};

describe('SingleSpanComponent', () => {
  let component: SingleSpanComponent;
  let fixture: ComponentFixture<SingleSpanComponent>;
  // let workerService: jest.Mocked<WorkerService>;

  beforeEach(async () => {
    // Create mock for WorkerService
    const mockWorkerService = {
      runTask: jest.fn(),
      ready$: of(true)
    };

    // Configure testing module
    await TestBed.configureTestingModule({
      imports: [
        SingleSpanComponent,
        FormsModule,
        NoopAnimationsModule,
        ButtonModule,
        InputNumberModule,
        ProgressSpinnerModule,
        TableModule,
        InputTextModule,
        CheckboxModule,
        NgxSliderModule,
        AutoCompleteModule
      ],
      providers: [{ provide: WorkerService, useValue: mockWorkerService }]
    }).compileComponents();

    // Create component and prepare for tests
    fixture = TestBed.createComponent(SingleSpanComponent);
    component = fixture.componentInstance;
    // const workerService = TestBed.inject(WorkerService) as jest.Mocked<WorkerService>;

    // Set required input
    fixture.componentRef.setInput('obstacleMode', false);

    // Mock the DOM elements for the plots
    const mockElement1 = document.createElement('div');
    mockElement1.id = 'plotly-output-single-span';
    mockElement1.style.width = '500px';
    document.body.appendChild(mockElement1);

    const mockElement2 = document.createElement('div');
    mockElement2.id = 'plotly-output-single-span-y';
    mockElement2.style.width = '300px';
    document.body.appendChild(mockElement2);

    fixture.detectChanges();
  });

  afterEach(() => {
    const element1 = document.getElementById('plotly-output-single-span');
    if (element1) {
      element1.remove();
    }

    const element2 = document.getElementById('plotly-output-single-span-y');
    if (element2) {
      element2.remove();
    }

    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.selectedSpan()).toBe(0);
    expect(component.obstacleMode()).toBe(false);
    expect(component.currentPosition).toBeNull();
    expect(component.currentPosition2).toBeNull();
  });

  it('should have correct phases', () => {
    const phases = component.phases();
    expect(phases).toEqual(['all', 'phase_1', 'phase_2', 'phase_3', 'garde']);
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

  describe('createPlot function', () => {
    beforeEach(() => {
      // Provide litData to the component
      fixture.componentRef.setInput('litData', mockLitData);
      jest.clearAllMocks();
    });

    it('should create plots for both face and profile views', async () => {
      // Spy on the data processing methods
      const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');
      const getAllSupportsSpy = jest.spyOn(component, 'getAllSupports');
      const getAllInsulatorsSpy = jest.spyOn(component, 'getAllInsulators');

      await component.createPlot(0, 'face');
      await component.createPlot(0, 'profile');

      // Each method should be called twice (once for face, once for profile)
      expect(getAllPhasesSpy).toHaveBeenCalledTimes(8); // Four phases x two views
      expect(getAllSupportsSpy).toHaveBeenCalledTimes(2);
      expect(getAllInsulatorsSpy).toHaveBeenCalledTimes(2);

      // Check that Plotly.newPlot was called for both plots
      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'plotly-output-single-span-y',
        expect.any(Array),
        expect.objectContaining({
          showlegend: false,
          scene: expect.objectContaining({
            aspectmode: 'manual'
          })
        }),
        expect.any(Object)
      );

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'plotly-output-single-span',
        expect.any(Array),
        expect.objectContaining({
          showlegend: false,
          scene: expect.objectContaining({
            aspectmode: 'manual'
          })
        }),
        expect.any(Object)
      );

      // Check that plot signals are set
      expect(component.plotFace()).not.toBeNull();
      expect(component.plotProfile()).not.toBeNull();
    });

    it('should not create plot if litData is not available', async () => {
      fixture.componentRef.setInput('litData', null);

      await component.createPlot(0, 'face');
      expect(Plotly.newPlot).not.toHaveBeenCalled();
    });
  });

  describe('obstacle mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('litData', mockLitData);
      fixture.componentRef.setInput('obstacleMode', true);
      jest.clearAllMocks();
    });

    it('should emit obstacle changes on click in profile view', async () => {
      // Setup
      const emitSpy = jest.spyOn(component.obstacleChange, 'emit');

      // Mock the layout for plotly
      const mockLayout = {
        margin: { l: 10, t: 10 },
        xaxis: { p2c: jest.fn().mockReturnValue(100) },
        yaxis: { p2c: jest.fn().mockReturnValue(200) }
      };

      // Create event and element
      const event = new MouseEvent('click', {
        clientX: 20,
        clientY: 30
      });

      // Create mock element with _fullLayout property
      const plotElement = document.getElementById('plotly-output-single-span');
      if (plotElement) {
        // @ts-expect-error - Mock the private _fullLayout property
        plotElement._fullLayout = mockLayout;

        // Trigger createPlot to add event listeners
        await component.createPlot(0, 'profile');

        // Simulate click event
        plotElement.dispatchEvent(event);

        // Verify the emit was called with expected values
        expect(emitSpy).toHaveBeenCalledWith({
          x: 100,
          y: component.obstacle()?.y,
          z: 200
        });
      }
    });

    it('should emit obstacle changes on click in face view', async () => {
      // Setup
      const emitSpy = jest.spyOn(component.obstacleChange, 'emit');

      // Mock the layout for plotly
      const mockLayout = {
        margin: { l: 10, t: 10 },
        xaxis: { p2c: jest.fn().mockReturnValue(100) },
        yaxis: { p2c: jest.fn().mockReturnValue(200) }
      };

      // Create event
      const event = new MouseEvent('click', {
        clientX: 20,
        clientY: 30
      });

      // Create mock element with _fullLayout property
      const plotElement = document.getElementById(
        'plotly-output-single-span-y'
      );
      if (plotElement) {
        // @ts-expect-error - Mock the private _fullLayout property
        plotElement._fullLayout = mockLayout;

        // Trigger createPlot to add event listeners
        await component.createPlot(0, 'face');

        // Simulate click event
        plotElement.dispatchEvent(event);

        // Verify the emit was called with expected values
        expect(emitSpy).toHaveBeenCalledWith({
          x: component.obstacle()?.x,
          y: 200,
          z: component.obstacle()?.z
        });
      }
    });
  });

  // describe('data transformation methods', () => {
  //   // it('should correctly transform phase data', () => {
  //   //   const litXs = [0, 1, 2];
  //   //   const litYs = [0, 1, 2];
  //   //   const litZs = [0, 1, 2];
  //   //   const litCanton = ['phase_1', 'phase_1', 'phase_2'];
  //   //   const litType = ['span', 'span', 'span'];
  //   //   const litSupports = ['Support 1', 'Support 1', 'Support 2'];
  //   //   const uniqueSupports = ['Support 1'];
  //   //   const result = component.getAllPhases(
  //   //     litXs,
  //   //     litYs,
  //   //     litZs,
  //   //     litCanton,
  //   //     litType,
  //   //     litSupports,
  //   //     uniqueSupports,
  //   //     'phase_1',
  //   //     'face'
  //   //   );
  //   //   expect(result.length).toBe(1); // One support
  //   //   expect(result[0].text).toBe('phase_1');
  //   //   expect(result[0].line.color).toBe('red');
  //   //   expect(result[0].line.dash).toBe('solid');
  //   // });
  //   // it('should correctly transform support data', () => {
  //   //   const litXs = [0, 1, 2];
  //   //   const litYs = [0, 1, 2];
  //   //   const litZs = [0, 1, 2];
  //   //   const litTypes = ['support', 'support', 'span'];
  //   //   const litSupports = ['Support 1', 'Support 1', 'Support 2'];
  //   //   const uniqueSupports = ['Support 1'];
  //   //   const result = component.getAllSupports(
  //   //     litXs,
  //   //     litYs,
  //   //     litZs,
  //   //     litTypes,
  //   //     litSupports,
  //   //     uniqueSupports,
  //   //     'face'
  //   //   );
  //   //   expect(result.length).toBe(1); // One support
  //   //   expect(result[0].text[0]).toBe('1');
  //   //   expect(result[0].line.color).toBe('blue');
  //   // });
  //   // it('should correctly transform insulator data', () => {
  //   //   const litXs = [0, 1, 2];
  //   //   const litYs = [0, 1, 2];
  //   //   const litZs = [0, 1, 2];
  //   //   const litTypes = ['insulator', 'insulator', 'span'];
  //   //   const litSupports = ['Support 1', 'Support 1', 'Support 2'];
  //   //   const uniqueSupports = ['Support 1'];
  //   //   const result = component.getAllInsulators(
  //   //     litXs,
  //   //     litYs,
  //   //     litZs,
  //   //     litTypes,
  //   //     litSupports,
  //   //     uniqueSupports,
  //   //     'face'
  //   //   );
  //   //   expect(result.length).toBe(1); // One support
  //   //   expect(result[0].line.color).toBe('green');
  //   // });
  // });

  // describe('effects', () => {
  //   // it('should create plots when selectedSpan changes', async () => {
  //   //   // Provide data and setup spies
  //   //   fixture.componentRef.setInput('litData', mockLitData);
  //   //   const createPlotSpy = jest.spyOn(component, 'createPlot');

  //   //   // Change selectedSpan
  //   //   component.selectedSpan.set(1);

  //   //   // Verify createPlot was called for both views
  //   //   expect(createPlotSpy).toHaveBeenCalledWith(1, 'face');
  //   //   expect(createPlotSpy).toHaveBeenCalledWith(1, 'profile');
  //   // });

  //   // it('should create plots when litData changes', async () => {
  //   //   // Setup spy
  //   //   const createPlotSpy = jest.spyOn(component, 'createPlot');

  //   //   // Set litData
  //   //   fixture.componentRef.setInput('litData', mockLitData);

  //   //   // Verify createPlot was called for both views
  //   //   expect(createPlotSpy).toHaveBeenCalledWith(0, 'face');
  //   //   expect(createPlotSpy).toHaveBeenCalledWith(0, 'profile');
  //   // });
  // });
});
