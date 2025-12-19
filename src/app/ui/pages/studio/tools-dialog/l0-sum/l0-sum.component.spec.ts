import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { L0SumComponent } from './l0-sum.component';
import { ToolsDialogService } from '../tools-dialog.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlotService } from '@src/app/ui/pages/studio/services/plot.service';

@Component({
  selector: 'app-button',
  standalone: true,
  template: '<button><ng-content></ng-content></button>'
})
class MockButtonComponent {}

@Component({
  selector: 'app-icon',
  standalone: true,
  template: ''
})
class MockIconComponent {}

describe('L0SumComponent', () => {
  let component: L0SumComponent;
  let fixture: ComponentFixture<L0SumComponent>;
  let toolsDialogService: ToolsDialogService;

  beforeEach(async () => {
    const mockLitData = {
      L0: [100, 200, 150, 300, 250],
      spans: [],
      insulators: [],
      supports: [],
      elevation: [],
      line_angle: [],
      vtl_under_chain: [],
      vtl_under_console: [],
      r_under_chain: [],
      r_under_console: [],
      ground_altitude: [],
      load_angle: [],
      displacement: [],
      span_length: []
    };

    const mockPlotService = {
      loading: jest.fn().mockReturnValue(false),
      litData: jest.fn().mockReturnValue(mockLitData)
    } as unknown as PlotService;

    await TestBed.configureTestingModule({
      providers: [
        ToolsDialogService,
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService }
      ]
    })
      .overrideComponent(L0SumComponent, {
        set: {
          imports: [MockButtonComponent, MockIconComponent]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(L0SumComponent);
    component = fixture.componentInstance;
    toolsDialogService = TestBed.inject(ToolsDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize rows and totalL0', () => {
    expect(component.l0Rows().length).toBeGreaterThan(0);
    expect(component.totalL0()).toBeGreaterThan(0);
  });

  it('should inject ToolsDialogService', () => {
    expect(toolsDialogService).toBeDefined();
  });
});
