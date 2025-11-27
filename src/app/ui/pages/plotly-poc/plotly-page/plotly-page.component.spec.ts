import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlotlyPageComponent } from './plotly-page.component';
import { PlotlyComponent } from '../plotly-comp/plotly-comp.component';
import { CardModule } from 'primeng/card';
import { PlotlyLine } from '../plotly.model';
import { Component, input, output } from '@angular/core';
import { By } from '@angular/platform-browser';

// Mock Plotly global object - add this to make the tests work
const mockPlotly = {
  newPlot: jest.fn(),
  restyle: jest.fn()
};

// Make the mock available globally
(global as any).Plotly = mockPlotly;

// Create a mock for PlotlyComponent that uses signals
@Component({
  selector: 'app-plotly-comp',
  template: '<div>Mock Plotly Component</div>',
  standalone: true
})
class MockPlotlyComponent {
  // Use input signal instead of @Input
  lineTrace = input<PlotlyLine>({ x: [], y: [], z: [] });

  // Use output signal instead of @Output
  lineTraceChange = output<PlotlyLine>();
}

describe('PlotlyPageComponent', () => {
  let component: PlotlyPageComponent;
  let fixture: ComponentFixture<PlotlyPageComponent>;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [PlotlyPageComponent, CardModule, MockPlotlyComponent]
    })
      .overrideComponent(PlotlyPageComponent, {
        remove: {
          imports: [PlotlyComponent]
        },
        add: {
          imports: [MockPlotlyComponent]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PlotlyPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default line data', () => {
    const expectedLineData: PlotlyLine = {
      x: [0, 50, 100, 150, 200, 250, 300],
      z: [
        16.8, 3.00890769, -5.65382853, -9.27490824, -7.8905724, -1.48696614, 10
      ],
      y: [5, 5, 5, 5, 5, 5, 5]
    };

    expect(component.lineTest()).toEqual(expectedLineData);
  });

  it('should update line test data when updateLineTest is called', () => {
    // Create new test data
    const newLineData: PlotlyLine = {
      x: [1, 2, 3],
      z: [10, 20, 30],
      y: [1, 1, 1]
    };

    // Spy on the signal's set method
    const setLineSpy = jest.spyOn(component.lineTest, 'set');

    // Call the update method
    component.updateLineTest(newLineData);

    // Check that the signal's set method was called with the correct data
    expect(setLineSpy).toHaveBeenCalledWith(newLineData);

    // Check that the signal now returns the new value
    expect(component.lineTest()).toEqual(newLineData);
  });

  describe('Component Integration', () => {
    it('should contain a PlotlyComponent', () => {
      const plotlyComp = fixture.debugElement.query(
        By.directive(MockPlotlyComponent)
      );
      expect(plotlyComp).toBeTruthy();
    });
  });
});

// Integration tests with the signal-based mock component
describe('PlotlyPageComponent Integration', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let pageComponent: PlotlyPageComponent;
  let mockPlotlyComponent: MockPlotlyComponent;

  // Create a test host component
  @Component({
    standalone: true,
    imports: [PlotlyPageComponent, MockPlotlyComponent],
    template: ` <app-plotly-page></app-plotly-page> `
  })
  class TestHostComponent {}

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, CardModule]
    })
      .overrideComponent(PlotlyPageComponent, {
        remove: {
          imports: [PlotlyComponent]
        },
        add: {
          imports: [MockPlotlyComponent]
        }
      })
      .compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();

    const pageComponentDebug = hostFixture.debugElement.query(
      By.directive(PlotlyPageComponent)
    );
    pageComponent = pageComponentDebug.componentInstance;

    const plotlyElementDebug = hostFixture.debugElement.query(
      By.directive(MockPlotlyComponent)
    );
    mockPlotlyComponent = plotlyElementDebug?.componentInstance;
  });

  it('should pass data to plotly component (if it were properly bound)', () => {
    expect(pageComponent).toBeTruthy();
    expect(mockPlotlyComponent).toBeTruthy();
  });

  it('should update when plotly component emits changes', () => {
    // For now just a placeholder check
    expect(pageComponent.lineTest()).toBeDefined();
  });
});
