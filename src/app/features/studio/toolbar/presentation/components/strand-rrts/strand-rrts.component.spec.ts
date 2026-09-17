import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { StrandRrtsComponent } from './strand-rrts.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { RrtsCutStrandsData, Section } from '@shared/domain/models/section.model';

const SPAN_1 = { index: 0, uuid: 's1' };
const SPAN_2 = { index: 1, uuid: 's2' };

const entry = (span: RrtsCutStrandsData['span'], cutStrands: number[]): RrtsCutStrandsData => ({
  span,
  supportRef: span ? 'RIGHT' : null,
  distanceSupportRef: span ? 12 : null,
  cutStrands
});

const GLOBAL = entry(null, [1, 0, 0, 0, 0, 0, 0, 0]);
const ON_SPAN_1 = entry(SPAN_1, [0, 2, 0, 0, 0, 0, 0, 0]);

describe('StrandRrtsComponent', () => {
  let component: StrandRrtsComponent;
  let fixture: ComponentFixture<StrandRrtsComponent>;
  let spanService: PlotSpanService;
  let plotService: {
    study: ReturnType<typeof signal>;
    litData: ReturnType<typeof signal>;
    rrts: ReturnType<typeof signal<number | null>>;
    cutStrandsUtilizationRates: ReturnType<typeof signal<number[] | null>>;
    baseUtilizationRates: ReturnType<typeof signal<number[] | null>>;
    applyCutStrands: vi.Mock;
  };
  let sectionService: { createOrUpdateSection: vi.Mock };
  let notificationService: { success: vi.Mock; error: vi.Mock; warning: vi.Mock };

  const setup = async (entries?: RrtsCutStrandsData[]) => {
    spanService.section.set({
      uuid: 'section',
      cable_name: 'CABLE',
      supports: [{ uuid: 's1' }, { uuid: 's2' }, { uuid: 's3' }],
      rrts_cut_strands: entries
    } as unknown as Section);
    fixture = TestBed.createComponent(StrandRrtsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const selectSpan = async (span: RrtsCutStrandsData['span']) => {
    component.form.controls.span.setValue(span);
    await fixture.whenStable();
  };

  const savedEntries = () => (sectionService.createOrUpdateSection.mock.calls.at(-1)?.[1] as Section).rrts_cut_strands;

  beforeEach(async () => {
    plotService = {
      study: signal({ uuid: 'study', sections: [] }),
      litData: signal({ output_parameters: { utilization_rate: [30, 45, Number.NaN] } }),
      rrts: signal(null),
      cutStrandsUtilizationRates: signal(null),
      baseUtilizationRates: signal(null),
      applyCutStrands: vi.fn().mockImplementation(async () => {
        plotService.rrts.set(1000);
        return null;
      })
    };
    sectionService = { createOrUpdateSection: vi.fn().mockResolvedValue(undefined) };
    notificationService = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        StrandRrtsComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [
        provideNoopAnimations(),
        { provide: PlotService, useValue: plotService },
        { provide: SectionService, useValue: sectionService },
        {
          provide: CablesService,
          useValue: { getCable: vi.fn().mockResolvedValue({ nb_strand_layer_1: 6, nb_strand_layer_2: 12 }) }
        },
        { provide: NotificationService, useValue: notificationService },
        { provide: ToolbarDialogService, useValue: { setTemplates: vi.fn() } }
      ]
    }).compileComponents();

    spanService = TestBed.inject(PlotSpanService);
  });

  it('should stay valid and ignore the reference support inputs when no span is selected', async () => {
    await setup();
    expect(component.form.valid).toBe(true);
    expect(component.form.controls.supportRef.disabled).toBe(true);
    expect(component.form.controls.distanceSupportRef.disabled).toBe(true);
    // Disabled controls are left out of `value`, so they never reach the saved data
    expect(component.form.value.supportRef).toBeUndefined();
    expect(component.form.value.distanceSupportRef).toBeUndefined();
  });

  it('should show staff presence from the charge selected on the study', async () => {
    await setup();
    expect(component.staffIsPresent()).toBe(false);

    spanService.section.update((s) => ({ ...s!, charges: [{ uuid: 'c1', personnelPresence: true }] }) as Section);
    plotService.study.set({ uuid: 'study', sections: [{ uuid: 'section', selected_charge_uuid: 'c1' }] });
    expect(component.staffIsPresent()).toBe(true);
  });

  it('should load the saved entry of the selected span, or the global one without span', async () => {
    await setup([GLOBAL, ON_SPAN_1]);
    expect(component.form.controls.cutStrands.getRawValue()).toEqual([1, 0]);

    await selectSpan(SPAN_1);
    expect(component.form.getRawValue()).toMatchObject({ supportRef: 'RIGHT', distanceSupportRef: 12 });
    expect(component.form.controls.cutStrands.getRawValue()).toEqual([0, 2]);

    await selectSpan(SPAN_2);
    expect(component.form.getRawValue()).toMatchObject({ supportRef: 'LEFT', distanceSupportRef: 0 });
    expect(component.form.controls.cutStrands.getRawValue()).toEqual([0, 0]);
    expect(component.isSaved()).toBe(false);
  });

  it('should compare the undamaged max working load with the new max over all spans', async () => {
    await setup();
    // Nothing applied yet: the plot data is the undamaged cable
    expect(component.workLoad()).toBe(45);

    plotService.baseUtilizationRates.set([20, 25, Number.NaN]);
    plotService.cutStrandsUtilizationRates.set([60, 40, Number.NaN]);
    await selectSpan(SPAN_2);
    expect(component.workLoad()).toBe(25);
    expect(component.newWorkLoad()).toBe(60);
  });

  it('should calculate with the form cut strands only, other entries being erased on save', async () => {
    await setup([GLOBAL, ON_SPAN_1]);
    await selectSpan(SPAN_2);
    component.form.controls.cutStrands.setValue([3, 1]);

    await component.calculate();

    expect(plotService.applyCutStrands).toHaveBeenCalledWith([3, 1, 0, 0, 0, 0, 0, 0]);
  });

  it('should disable calculate on an invalid form and show a loading state while calculating', async () => {
    await setup();
    const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('[data-testid="calculate-btn"]');

    component.form.controls.cutStrands.setValue([7, 0]);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);

    component.form.controls.cutStrands.setValue([1, 0]);
    let finish!: () => void;
    plotService.applyCutStrands.mockReturnValueOnce(new Promise((resolve) => (finish = () => resolve(null))));
    const calculation = component.calculate();
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
    expect(button().classList).toContain('app-btn-loading');

    finish();
    await calculation;
    fixture.detectChanges();
    expect(button().classList).not.toContain('app-btn-loading');
  });

  it('should calculate then save the form as the single entry of the section', async () => {
    await setup([ON_SPAN_1]);
    await selectSpan(SPAN_1);
    component.form.controls.cutStrands.setValue([0, 5]);

    await component.save();

    expect(plotService.applyCutStrands).toHaveBeenLastCalledWith([0, 5, 0, 0, 0, 0, 0, 0]);
    expect(savedEntries()).toEqual([
      { span: SPAN_1, supportRef: 'RIGHT', distanceSupportRef: 12, cutStrands: [0, 5, 0, 0, 0, 0, 0, 0] }
    ]);
    expect(notificationService.success).toHaveBeenCalled();
    // Same span: its entry is updated, nothing else is erased
    expect(notificationService.warning).not.toHaveBeenCalled();
  });

  it('should erase the other entries on save and warn about each of them', async () => {
    await setup([GLOBAL, ON_SPAN_1]);
    await selectSpan(SPAN_2);
    component.form.controls.cutStrands.setValue([3, 0]);

    await component.save();

    expect(savedEntries()).toEqual([
      { span: SPAN_2, supportRef: 'LEFT', distanceSupportRef: 0, cutStrands: [3, 0, 0, 0, 0, 0, 0, 0] }
    ]);
    expect(notificationService.warning).toHaveBeenCalledWith('studio.rrts-cut-strands.section-change-erased');
    expect(notificationService.warning).toHaveBeenCalledWith('studio.rrts-cut-strands.span-change-erased');
  });

  it('should not save when the calculation fails', async () => {
    await setup([GLOBAL]);
    await selectSpan(SPAN_1);
    plotService.applyCutStrands.mockResolvedValueOnce([{ origin: 'exception', code: null, rawText: 'boom' }]);

    await component.save();

    expect(sectionService.createOrUpdateSection).not.toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalled();
    expect(notificationService.warning).not.toHaveBeenCalled();
  });

  it('should be saving while calculating and saving', async () => {
    await setup();
    let finish!: () => void;
    plotService.applyCutStrands.mockReturnValueOnce(new Promise((resolve) => (finish = () => resolve(null))));
    const saving = component.save();
    expect(component.isSaving()).toBe(true);

    finish();
    await saving;
    expect(component.isSaving()).toBe(false);
    expect(savedEntries()).toHaveLength(1);
  });

  it('should put the saved damage back when leaving an unsaved calculation', async () => {
    await setup([GLOBAL]);
    await selectSpan(SPAN_1);
    component.form.controls.cutStrands.setValue([2, 0]);
    await component.calculate();

    await selectSpan(null);

    expect(plotService.applyCutStrands).toHaveBeenLastCalledWith([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(component.form.controls.cutStrands.getRawValue()).toEqual([1, 0]);
  });

  it('should put the saved damage back when the dialog closes on an unsaved calculation', async () => {
    await setup([GLOBAL]);
    component.form.controls.cutStrands.setValue([2, 0]);
    await component.calculate();

    fixture.destroy();

    expect(plotService.applyCutStrands).toHaveBeenLastCalledWith([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('should put the saved damage back once a calculation running at close ends', async () => {
    await setup([GLOBAL]);
    component.form.controls.cutStrands.setValue([2, 0]);
    let finish!: () => void;
    plotService.applyCutStrands.mockReturnValueOnce(new Promise((resolve) => (finish = () => resolve(null))));
    const calculation = component.calculate();

    fixture.destroy();
    expect(plotService.applyCutStrands).toHaveBeenCalledTimes(1);
    finish();
    await calculation;

    expect(plotService.applyCutStrands).toHaveBeenLastCalledWith([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('should keep the saved damage when the dialog closes after saving', async () => {
    await setup([GLOBAL]);
    component.form.controls.cutStrands.setValue([2, 0]);
    await component.save();
    const calls = plotService.applyCutStrands.mock.calls.length;

    fixture.destroy();

    expect(plotService.applyCutStrands).toHaveBeenCalledTimes(calls);
  });

  it('should delete the selected entry and apply the remaining ones', async () => {
    await setup([GLOBAL, ON_SPAN_1]);
    await selectSpan(SPAN_1);

    await component.delete();

    expect(savedEntries()).toEqual([GLOBAL]);
    expect(plotService.applyCutStrands).toHaveBeenLastCalledWith([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(plotService.rrts()).toBe(1000);
  });

  it('should clear the results when the last entry is deleted', async () => {
    await setup([GLOBAL]);
    plotService.cutStrandsUtilizationRates.set([60]);

    await component.delete();

    expect(savedEntries()).toEqual([]);
    expect(plotService.applyCutStrands).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(plotService.rrts()).toBeNull();
    expect(plotService.cutStrandsUtilizationRates()).toBeNull();
  });
});
