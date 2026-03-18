import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { PlotService } from '@services/plot/plot.service';
import { SectionPlotCardsComponent } from '@features/studio/core/presentation/components/cards/section-plot-cards.component';
import { PlotOptions } from '@shared/types/plot.types';
import { GetSectionOutput } from '@services/worker_python/tasks/types';

type MockPlotService = {
  litData: WritableSignal<GetSectionOutput | null>;
  section: WritableSignal<object | null>;
  plotOptions: WritableSignal<PlotOptions>;
};

describe('SectionPlotCardsComponent', () => {
  let component: SectionPlotCardsComponent;
  let plotServiceMock: MockPlotService;

  beforeEach(() => {
    plotServiceMock = {
      litData: signal<GetSectionOutput | null>(null),
      section: signal<object | null>(null),
      plotOptions: signal<PlotOptions>({
        view: '3d',
        side: 'profile',
        startSupport: 0,
        endSupport: 1,
        invert: false
      })
    };

    TestBed.configureTestingModule({
      providers: [{ provide: PlotService, useValue: plotServiceMock }]
    });

    component = TestBed.runInInjectionContext(() => new SectionPlotCardsComponent());
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should keep litData null when plot service has no data', () => {
    expect(component.litData()).toBeNull();
  });

  it('should mirror plot service litData through its effect', () => {
    const output = { current: { supports: [] } } as unknown as GetSectionOutput;

    plotServiceMock.litData.set(output);
    TestBed.flushEffects();

    expect(component.litData()).toBe(output);
  });

  it('should return an empty array when no section is selected', () => {
    plotServiceMock.section.set(null);
    plotServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 1,
      endSupport: 3,
      invert: false
    });

    expect(component.arraysOfSupports()).toEqual([]);
  });

  it('should compute support indexes in ascending order when range has at most three supports', () => {
    plotServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: false
    });

    expect(component.arraysOfSupports()).toEqual([2, 3, 4]);
  });

  it('should reverse support indexes when invert option is enabled', () => {
    plotServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: true
    });

    expect(component.arraysOfSupports()).toEqual([4, 3, 2]);
  });

  it('should return an empty array when the support range exceeds three items', () => {
    plotServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 0,
      endSupport: 4,
      invert: false
    });

    expect(component.arraysOfSupports()).toEqual([]);
  });
});
