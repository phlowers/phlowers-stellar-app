import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { VhlAndGuyingComponent } from './vtl-and-guying.component';
import { ToolsDialogService } from '../tools-dialog.service';
import { PlotService } from '@src/app/ui/pages/studio/services/plot.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import {
  Task,
  TaskError
} from '@src/app/core/services/worker_python/tasks/types';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { CardComponent } from '@ui/shared/components/atoms/card/card.component';

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

@Component({
  selector: 'app-card',
  standalone: true,
  template: '<ng-content></ng-content>'
})
class MockCardComponent {}

describe('VhlAndGuyingComponent', () => {
  let component: VhlAndGuyingComponent;
  let fixture: ComponentFixture<VhlAndGuyingComponent>;
  let toolsDialogService: ToolsDialogService;
  let mockPlotService: jest.Mocked<PlotService>;
  let mockWorkerPythonService: jest.Mocked<WorkerPythonService>;

  beforeEach(async () => {
    const mockLitData = {
      vtl_under_chain: [
        [10, 20],
        [15, 25],
        [5, 10]
      ],
      r_under_chain: [30, 40, 20]
    };

    const mockSection = {
      supports: [{ chainV: true }, { chainV: false }]
    };

    mockPlotService = {
      loading: signal(false),
      litData: signal(mockLitData),
      section: signal(mockSection),
      getSpanOptions: jest
        .fn()
        .mockReturnValue([{ label: 'Span 1', value: [0, 1] }])
    } as unknown as jest.Mocked<PlotService>;

    mockWorkerPythonService = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [VhlAndGuyingComponent],
      providers: [
        ToolsDialogService,
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService }
      ]
    })
      .overrideComponent(VhlAndGuyingComponent, {
        remove: {
          imports: [ButtonComponent, IconComponent, CardComponent]
        },
        add: {
          imports: [MockButtonComponent, MockIconComponent, MockCardComponent]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(VhlAndGuyingComponent);
    component = fixture.componentInstance;
    toolsDialogService = TestBed.inject(ToolsDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set templates in ngAfterViewInit', () => {
    const setTemplatesSpy = jest.spyOn(toolsDialogService, 'setTemplates');
    component.ngAfterViewInit();
    expect(setTemplatesSpy).toHaveBeenCalled();
  });

  it('should close tool when visible changes to false', () => {
    const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');
    component.onVisibleChange(false);
    expect(closeToolSpy).toHaveBeenCalled();
  });

  it('should not close tool when visible changes to true', () => {
    const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');
    component.onVisibleChange(true);
    expect(closeToolSpy).not.toHaveBeenCalled();
  });

  it('should calculate guying when all inputs are provided', async () => {
    const mockResult = {
      tensionInGuy: 100,
      guyAngle: 45,
      chargeVUnderConsole: 50,
      chargeHUnderConsole: 30,
      chargeLIfPulley: 20
    };

    mockWorkerPythonService.runTask.mockResolvedValue({
      result: mockResult,
      error: null
    });

    component.altitude.set(10);
    component.horizontalDistance.set(5);
    component.selectedSupport.set(0);

    await component.onCalculate();

    expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
      Task.calculateGuying,
      {
        altitude: 10,
        horizontalDistance: 5,
        hasPulley: false
      }
    );
    expect(component.results()).toEqual(mockResult);
  });

  it('should not calculate when inputs are missing', async () => {
    component.altitude.set(null);
    component.horizontalDistance.set(5);
    component.selectedSupport.set(0);

    await component.onCalculate();

    expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
  });

  it('should handle calculation error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockWorkerPythonService.runTask.mockResolvedValue({
      result: {
        tensionInGuy: 0,
        guyAngle: 0,
        chargeVUnderConsole: 0,
        chargeHUnderConsole: 0,
        chargeLIfPulley: 0
      },
      error: TaskError.CALCULATION_ERROR
    });

    component.altitude.set(10);
    component.horizontalDistance.set(5);
    component.selectedSupport.set(0);

    await component.onCalculate();

    expect(consoleErrorSpy).toHaveBeenCalledWith(TaskError.CALCULATION_ERROR);
    consoleErrorSpy.mockRestore();
  });

  it('should compute support type as Suspension when chainV is true', () => {
    // The mock section is already set in beforeEach with supports
    component.selectedSupport.set(0);
    fixture.detectChanges();
    expect(component.supportType()).toBe('Suspension');
  });

  it('should compute support type as Anchor when chainV is false', () => {
    // The mock section is already set in beforeEach with supports
    component.selectedSupport.set(1);
    fixture.detectChanges();
    expect(component.supportType()).toBe('Anchor');
  });

  it('should compute support options from selected span', () => {
    component.selectedSpan.set([0, 1]);
    const options = component.supportOptions();
    expect(options).toEqual([
      { label: '1', value: 0 },
      { label: '2', value: 1 }
    ]);
  });

  it('should compute vtlWithoutGuying when support is selected', () => {
    component.selectedSupport.set(0);
    const vtl = component.vtlWithoutGuying();
    expect(vtl).toEqual({
      chargeV: 10,
      chargeH: 15,
      chargeL: 5,
      resultant: 30
    });
  });

  it('should call onExportVhl', () => {
    expect(() => component.onExportVhl()).not.toThrow();
  });

  it('should call onExport', () => {
    expect(() => component.onExport()).not.toThrow();
  });
});
