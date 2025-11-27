import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { PlotlyComponent } from './plotly-comp.component';
import { PlotlyLine } from '../plotly.model';
import { ElementRef } from '@angular/core';

// Mock Plotly global object
const mockPlotly = {
  newPlot: jest.fn(),
  restyle: jest.fn()
};

// Make mockPlotly available globally
(global as any).Plotly = mockPlotly;

describe('PlotlyComponent', () => {
  let component: PlotlyComponent;
  let fixture: ComponentFixture<PlotlyComponent>;
  let mockElementRef: ElementRef;

  const mockLineTrace: PlotlyLine = {
    x: [1, 2, 3, 4, 5],
    y: [5, 4, 3, 2, 1],
    z: [10, 20, 30, 40, 50]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, SliderModule, PlotlyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlotlyComponent);
    component = fixture.componentInstance;

    // Create mock element for Plotly
    mockElementRef = new ElementRef(document.createElement('div'));

    // Handle input signal properly
    // Use TestBed reflection APIs or component property setter
    // We'll use the property setup approach
    Object.defineProperty(component, 'lineTrace', {
      get: () => () => mockLineTrace // Return a function that returns mockLineTrace
    });

    // Mock plotlyLineContainer viewChild
    Object.defineProperty(component, 'plotlyLineContainer', {
      get: () => () => mockElementRef
    });
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('ngAfterViewInit', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should initialize Plotly with correct data', () => {
      // Call the lifecycle hook
      component.ngAfterViewInit();

      // Verify Plotly.newPlot was called with expected parameters
      expect(mockPlotly.newPlot).toHaveBeenCalledTimes(1);
      expect(mockPlotly.newPlot.mock.calls[0][0]).toBe(
        mockElementRef.nativeElement
      );
      expect(mockPlotly.newPlot.mock.calls[0][1]).toEqual(component.data());
      expect(mockPlotly.newPlot.mock.calls[0][2]).toEqual(component.layout);
      expect(mockPlotly.newPlot.mock.calls[0][3]).toEqual(component.config);
    });

    it('should set initial line trace', () => {
      const initialLineTraceSpy = jest.spyOn(
        component['initialLineTrace'],
        'set'
      );

      component.ngAfterViewInit();

      expect(initialLineTraceSpy).toHaveBeenCalledWith(mockLineTrace);
    });

    it('should set min and max slider values correctly', () => {
      const minSliderSpy = jest.spyOn(component.minSliderValue, 'set');
      const maxSliderSpy = jest.spyOn(component.maxSliderValue, 'set');

      component.ngAfterViewInit();

      // Based on mock data and Z_VALUEPADDING and Z_VIEWPADDING
      // zMin = 10 - 20 = -10, zMax = 50 + 20 = 70
      // Range = zMax - zMin = 80
      // minSliderValue = -(80)/2 - 0 = -40
      // maxSliderValue = (80)/2 + 0 = 40
      expect(minSliderSpy).toHaveBeenCalledWith(-40);
      expect(maxSliderSpy).toHaveBeenCalledWith(40);
    });

    it('should set plot element', () => {
      const plotElementSpy = jest.spyOn(component.plotElement, 'set');

      component.ngAfterViewInit();

      expect(plotElementSpy).toHaveBeenCalledWith(mockElementRef.nativeElement);
    });

    it('should configure scene layout with correct aspect ratios', () => {
      component.ngAfterViewInit();

      // Check that scene layout was configured correctly based on data
      expect(component.layout.scene.xaxis.range).toEqual([1, 5]);
      expect(component.layout.scene.yaxis.range).toEqual([1, 5]);
      expect(component.layout.scene.zaxis.range).toEqual([-10, 70]); // 10-20 and 50+20

      // Check aspect ratio calculation
      expect(component.layout.scene.aspectratio.x).toBeCloseTo(0.25); // 5/2/10
      expect(component.layout.scene.aspectratio.y).toBe(0.3); // hardcoded value
      expect(component.layout.scene.aspectratio.z).toBeCloseTo(3.5); // 70/2/10
    });
  });

  describe('onSliderChange', () => {
    beforeEach(() => {
      // Setup component with initial state
      component.ngAfterViewInit();
      jest.clearAllMocks();
    });

    it('should update z values and emit line trace change', () => {
      // Spy on output emitter
      const lineTraceChangeSpy = jest.spyOn(component.lineTraceChange, 'emit');

      // Call method with test value
      component.onSliderChange(10);

      // Expected new z values (original + slider value)
      const expectedZValues = [20, 30, 40, 50, 60]; // 10+10, 20+10, etc.

      // Check that output was emitted with updated trace
      expect(lineTraceChangeSpy).toHaveBeenCalledTimes(1);
      expect(lineTraceChangeSpy).toHaveBeenCalledWith({
        ...mockLineTrace,
        z: expectedZValues
      });

      // Check that Plotly.restyle was called with correct parameters
      expect(mockPlotly.restyle).toHaveBeenCalledTimes(1);
      expect(mockPlotly.restyle.mock.calls[0][0]).toBe(
        mockElementRef.nativeElement
      );
      expect(mockPlotly.restyle.mock.calls[0][1]).toEqual({
        z: [expectedZValues]
      });
      expect(mockPlotly.restyle.mock.calls[0][2]).toEqual([0]);
    });

    it('should handle negative slider values', () => {
      // Call method with negative test value
      component.onSliderChange(-15);

      // Expected new z values (original - 15)
      const expectedZValues = [-5, 5, 15, 25, 35]; // 10-15, 20-15, etc.

      // Check that Plotly.restyle was called with correct parameters
      expect(mockPlotly.restyle).toHaveBeenCalledWith(
        mockElementRef.nativeElement,
        { z: [expectedZValues] },
        [0]
      );
    });
  });

  describe('computed properties', () => {
    it('should correctly compute trace1', () => {
      const trace = component.trace1();

      expect(trace).toEqual({
        x: mockLineTrace.x,
        y: mockLineTrace.y,
        z: mockLineTrace.z,
        line: { color: 'red', width: 3 },
        type: 'scatter3d',
        mode: 'lines'
      });
    });

    it('should correctly compute trace2', () => {
      // Set initialLineTrace
      component['initialLineTrace'].set(mockLineTrace);

      const trace = component.trace2();

      expect(trace).toEqual({
        x: mockLineTrace.x,
        y: mockLineTrace.y,
        z: mockLineTrace.z,
        line: { color: 'green', width: 4 },
        type: 'scatter3d',
        mode: 'lines'
      });
    });

    it('should correctly compute data array with both traces', () => {
      // Set initialLineTrace
      component['initialLineTrace'].set(mockLineTrace);

      const data = component.data();

      expect(data).toEqual([component.trace1(), component.trace2()]);
      expect(data.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle single point line trace', () => {
      const singlePointTrace: PlotlyLine = {
        x: [5],
        y: [5],
        z: [5]
      };

      // Mock the input signal with single point data
      Object.defineProperty(component, 'lineTrace', {
        get: () => () => singlePointTrace
      });

      component.ngAfterViewInit();

      // Check that aspect ratio calculations don't fail with single point
      expect(component.layout.scene.aspectratio.x).toBe(0.25); // 5/2/10
      expect(component.layout.scene.xaxis.range).toEqual([5, 5]);
    });
  });
});
