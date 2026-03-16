import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { InitComponent } from './init.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { PlotService } from '@features/studio/core/services/plot.service';
import { Section } from '@shared/domain';

describe('Init component', () => {
  let component: InitComponent;
  let fixture: ComponentFixture<InitComponent>;
  let mockPlotService: Partial<PlotService>;
  let toolbarDialogService: ToolbarDialogService;

  beforeEach(async () => {
    mockPlotService = {
      section: signal<Section | null>(null),
      plotOptions: signal({
        view: '3d',
        side: 'profile',
        startSupport: 0,
        endSupport: 10,
        invert: false
      }),
      modifySection: jest.fn().mockResolvedValue(undefined)
    } as unknown as PlotService;

    await TestBed.configureTestingModule({
      imports: [InitComponent],
      providers: [
        ToolbarDialogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitComponent);
    component = fixture.componentInstance;
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('createMeasure', () => {
    it('should create a measure and call modifySection with correct data', async () => {
      const mockSection: Partial<Section> = {
        uuid: 'test-section-uuid',
        field_measures: []
      };
      mockPlotService.section = signal<Section | null>(mockSection as Section);

      component.newMeasureNameControl.setValue('Test Measure');
      component.newMeasureNameControl.markAsTouched();

      await component.createMeasure();

      expect(mockPlotService.modifySection).toHaveBeenCalledWith(
        expect.objectContaining({
          field_measures: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Measure'
            })
          ]),
          selected_field_measure_uuid: expect.any(String)
        })
      );
    });

    it('should call proceedToMainComponent when form control is valid', async () => {
      const mockSection: Partial<Section> = {
        uuid: 'test-section-uuid',
        field_measures: []
      };
      mockPlotService.section = signal<Section | null>(mockSection as Section);
      const proceedSpy = jest.spyOn(toolbarDialogService, 'proceedToMainComponent');

      component.newMeasureNameControl.setValue('Valid Measure');
      component.newMeasureNameControl.markAsTouched();

      await component.createMeasure();

      expect(proceedSpy).toHaveBeenCalled();
    });

    it('should not call proceedToMainComponent when form control is invalid', async () => {
      const mockSection: Partial<Section> = {
        uuid: 'test-section-uuid',
        field_measures: []
      };
      mockPlotService.section = signal<Section | null>(mockSection as Section);
      const proceedSpy = jest.spyOn(toolbarDialogService, 'proceedToMainComponent');

      component.newMeasureNameControl.setValue('');
      component.newMeasureNameControl.markAsTouched();

      await component.createMeasure();

      expect(proceedSpy).not.toHaveBeenCalled();
    });
  });
});
