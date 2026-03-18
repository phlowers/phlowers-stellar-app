import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { VhlAndGuyingComponent } from './vtl-and-guying.component';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { SectionService } from '@services/section/section.service';
import { MessageService } from 'primeng/api';

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
  let toolbarDialogService: ToolbarDialogService;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockWorkerPythonService: vi.Mocked<WorkerPythonService>;
  let mockSectionService: vi.Mocked<SectionService>;
  let mockMessageService: vi.Mocked<MessageService>;

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

    const mockStudy = { uuid: 'test-study-uuid', sections: [] };

    mockPlotService = {
      loading: signal(false),
      litData: signal(mockLitData),
      section: signal(mockSection),
      study: signal(mockStudy),
      getSpanOptions: vi.fn().mockReturnValue([{ label: 'Span 1', value: { index: 0, uuid: 'span-uuid-1' } }]),
      getSupportOptions: vi.fn().mockReturnValue([
        { label: 1, value: 'LEFT' },
        { label: 2, value: 'RIGHT' }
      ])
    } as unknown as vi.Mocked<PlotService>;

    mockWorkerPythonService = {
      runTask: vi.fn()
    } as unknown as vi.Mocked<WorkerPythonService>;

    mockSectionService = {
      currentSection: signal({
        uuid: 'test-section-uuid',
        supports: [{ chainV: true }, { chainV: false }]
      }),
      createOrUpdateSection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<SectionService>;

    mockMessageService = {
      add: vi.fn()
    } as unknown as vi.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [VhlAndGuyingComponent],
      providers: [
        ToolbarDialogService,
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: MessageService, useValue: mockMessageService }
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
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close tool when visible changes to false', () => {
    const closeToolSpy = vi.spyOn(toolbarDialogService, 'closeTool');
    component.onVisibleChange(false);
    expect(closeToolSpy).toHaveBeenCalled();
  });

  it('should not close tool when visible changes to true', () => {
    const closeToolSpy = vi.spyOn(toolbarDialogService, 'closeTool');
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

    component.form.controls.altitude.setValue(10);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.selectedSpan.setValue({
      index: 1,
      uuid: 'mock-uuid'
    });
    component.form.controls.selectedSupport.setValue('LEFT');

    await component.onCalculate();

    expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.calculateGuying, {
      altitude: 10,
      horizontalDistance: 5,
      hasPulley: false,
      selectedSpanIndex: 1,
      selectedSupport: 'LEFT'
    });
    expect(component.results()).toEqual(mockResult);
  });

  it('should not calculate when inputs are missing', async () => {
    component.form.controls.altitude.setValue(null);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.selectedSupport.setValue('LEFT');

    await component.onCalculate();

    expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
  });

  it('should handle calculation error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

    component.form.controls.altitude.setValue(10);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.selectedSupport.setValue('LEFT');

    await component.onCalculate();

    expect(consoleErrorSpy).toHaveBeenCalledWith(TaskError.CALCULATION_ERROR);
    consoleErrorSpy.mockRestore();
  });

  it('should compute support type as Suspension when chainV is true', () => {
    // The mock section is already set in beforeEach with supports
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    component.form.controls.selectedSupport.setValue('LEFT');
    fixture.detectChanges();
    expect(component.supportType()).toBe('Suspension');
  });

  it('should compute support type as Anchor when chainV is false', () => {
    // The mock section is already set in beforeEach with supports
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    component.form.controls.selectedSupport.setValue('RIGHT');
    fixture.detectChanges();
    expect(component.supportType()).toBe('Anchor');
  });

  it('should compute support options from selected span', () => {
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    fixture.detectChanges();
    const options = component.supportOptions();
    expect(options).toEqual([
      { label: 1, value: 'LEFT' },
      { label: 2, value: 'RIGHT' }
    ]);
  });

  it('should compute vtlWithoutGuying when support is selected', () => {
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    component.form.controls.selectedSupport.setValue('LEFT');
    fixture.detectChanges();
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

  it('should set form values from section when section has vtl_and_guying data', () => {
    const mockSectionWithData = {
      uuid: 'test-section-uuid',
      supports: [{ chainV: true }, { chainV: false }],
      vtl_and_guying: {
        inputs: {
          selectedSpan: { index: 0, uuid: 'span-uuid-1' },
          selectedSupport: 'LEFT',
          altitude: 10,
          horizontalDistance: 5,
          hasPulley: true
        },
        outputs: {
          tensionInGuy: 100,
          guyAngle: 45,
          chargeVUnderConsole: 50,
          chargeHUnderConsole: 30,
          chargeLIfPulley: 20
        },
        comment: 'Test comment'
      }
    };
    Object.defineProperty(mockPlotService, 'section', {
      value: signal(mockSectionWithData),
      writable: true,
      configurable: true
    });
    component.setFormValuesFromSection();
    expect(component.form.controls.selectedSpan.value).toEqual({
      index: 0,
      uuid: 'span-uuid-1'
    });
    expect(component.form.controls.selectedSupport.value).toBe('LEFT');
    expect(component.form.controls.altitude.value).toBe(10);
    expect(component.form.controls.horizontalDistance.value).toBe(5);
    expect(component.form.controls.hasPulley.value).toBe(true);
    expect(component.form.controls.comment.value).toBe('Test comment');
    expect(component.results()).toEqual({
      tensionInGuy: 100,
      guyAngle: 45,
      chargeVUnderConsole: 50,
      chargeHUnderConsole: 30,
      chargeLIfPulley: 20
    });
  });

  it('should not set form values when section is null', () => {
    Object.defineProperty(mockPlotService, 'section', {
      value: signal(null),
      writable: true,
      configurable: true
    });
    const initialFormValue = component.form.value;
    component.setFormValuesFromSection();
    expect(component.form.value).toEqual(initialFormValue);
  });

  it('should not set form values when section has no vtl_and_guying inputs', () => {
    const mockSectionNoData = {
      uuid: 'test-section-uuid',
      supports: [{ chainV: true }]
    };
    Object.defineProperty(mockPlotService, 'section', {
      value: signal(mockSectionNoData),
      writable: true,
      configurable: true
    });
    const initialFormValue = component.form.value;
    component.setFormValuesFromSection();
    expect(component.form.value).toEqual(initialFormValue);
  });

  it('should save form data and call sectionService.createOrUpdateSection', () => {
    const mockStudyForSave = { uuid: 'test-study-uuid', sections: [] };
    const mockSectionForSave = {
      uuid: 'test-section-uuid',
      supports: [{ chainV: true }]
    };
    Object.defineProperty(mockPlotService, 'study', {
      value: signal(mockStudyForSave),
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockSectionService, 'currentSection', {
      value: signal(mockSectionForSave),
      writable: true,
      configurable: true
    });
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    component.form.controls.selectedSupport.setValue('LEFT');
    component.form.controls.altitude.setValue(10);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.hasPulley.setValue(true);
    component.form.controls.comment.setValue('Test comment');
    component.results.set({
      tensionInGuy: 100,
      guyAngle: 45,
      chargeVUnderConsole: 50,
      chargeHUnderConsole: 30,
      chargeLIfPulley: 20
    });

    const closeToolSpy = vi.spyOn(toolbarDialogService, 'closeTool');
    component.onSave();

    expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
      mockStudyForSave,
      expect.objectContaining({
        vtl_and_guying: expect.objectContaining({
          inputs: {
            selectedSpan: { index: 0, uuid: 'span-uuid-1' },
            selectedSupport: 'LEFT',
            altitude: 10,
            horizontalDistance: 5,
            hasPulley: true
          },
          outputs: {
            tensionInGuy: 100,
            guyAngle: 45,
            chargeVUnderConsole: 50,
            chargeHUnderConsole: 30,
            chargeLIfPulley: 20
          },
          comment: 'Test comment'
        })
      })
    );
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        life: 3000
      })
    );
    expect(closeToolSpy).toHaveBeenCalled();
  });

  it('should not save when study is null', () => {
    Object.defineProperty(mockPlotService, 'study', {
      value: signal(null),
      writable: true,
      configurable: true
    });
    component.onSave();
    expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
  });

  it('should not save when section is null', () => {
    const mockStudyForSave = { uuid: 'test-study-uuid', sections: [] };
    Object.defineProperty(mockPlotService, 'study', {
      value: signal(mockStudyForSave),
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockPlotService, 'section', {
      value: signal(null),
      writable: true,
      configurable: true
    });
    component.onSave();
    expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
  });

  it('should return true when form is valid', () => {
    component.form.controls.altitude.setValue(10);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.selectedSupport.setValue('LEFT');
    expect(component.isFormValid()).toBe(true);
  });

  it('should return false when altitude is null', () => {
    component.form.controls.altitude.setValue(null);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.selectedSupport.setValue('LEFT');
    expect(component.isFormValid()).toBe(false);
  });

  it('should return false when horizontalDistance is null', () => {
    component.form.controls.altitude.setValue(10);
    component.form.controls.horizontalDistance.setValue(null);
    component.form.controls.selectedSupport.setValue('LEFT');
    expect(component.isFormValid()).toBe(false);
  });

  it('should reset form and clear all signals', () => {
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    component.form.controls.selectedSupport.setValue('LEFT');
    component.form.controls.altitude.setValue(10);
    component.form.controls.horizontalDistance.setValue(5);
    component.form.controls.hasPulley.setValue(true);
    component.form.controls.comment.setValue('Test comment');
    component.supportOptions.set([{ label: 1, value: 'LEFT' }]);
    component.supportType.set('Suspension');
    component.vtlWithoutGuying.set({
      chargeV: 10,
      chargeH: 15,
      chargeL: 5,
      resultant: 30
    });
    component.results.set({
      tensionInGuy: 100,
      guyAngle: 45,
      chargeVUnderConsole: 50,
      chargeHUnderConsole: 30,
      chargeLIfPulley: 20
    });

    component.resetForm();

    expect(component.form.controls.selectedSpan.value).toBeNull();
    expect(component.form.controls.selectedSupport.value).toBeNull();
    expect(component.form.controls.altitude.value).toBeNull();
    expect(component.form.controls.horizontalDistance.value).toBeNull();
    expect(component.form.controls.hasPulley.value).toBe(false);
    expect(component.form.controls.comment.value).toBe('');
    expect(component.supportOptions()).toEqual([]);
    expect(component.supportType()).toBeNull();
    expect(component.vtlWithoutGuying()).toBeNull();
    expect(component.results()).toBeNull();
  });

  it('should clear selectedSupport when selectedSpan changes', () => {
    component.form.controls.selectedSupport.setValue('LEFT');
    component.form.controls.selectedSpan.setValue({
      index: 0,
      uuid: 'span-uuid-1'
    });
    expect(component.form.controls.selectedSupport.value).toBeNull();
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render guying-span-select', () => {
      const el = getByTestId('guying-span-select');
      expect(el).toBeTruthy();
    });

    it('should render reference-support-select', () => {
      const el = getByTestId('reference-support-select');
      expect(el).toBeTruthy();
    });

    it('should render export-vtl-btn', () => {
      const el = getByTestId('export-vtl-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render altitude-input', () => {
      const el = getByTestId('altitude-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render horizontal-distance-input', () => {
      const el = getByTestId('horizontal-distance-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render with-pulley-checkbox', () => {
      const el = getByTestId('with-pulley-checkbox');
      expect(el).toBeTruthy();
    });

    it('should render calculate-btn', () => {
      const el = getByTestId('calculate-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });
});
