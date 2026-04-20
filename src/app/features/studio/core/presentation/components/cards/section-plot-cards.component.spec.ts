import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { SectionPlotCardsComponent } from '@features/studio/core/presentation/components/cards/section-plot-cards.component';
import { PlotOptions } from '@shared/types/plot.types';
import { GetSectionOutput } from '@services/worker_python/tasks/types';

interface MockPlotService {
  litData: WritableSignal<GetSectionOutput | null>;
  section: WritableSignal<object | null>;
}

interface MockSpanService {
  section: WritableSignal<object | null>;
}

interface MockPlotOptionsService {
  plotOptions: WritableSignal<PlotOptions>;
}

const mockLitData: GetSectionOutput = {
  supports: [[[1, 2, 3]], [[4, 5, 6]], [[7, 8, 9]], [[10, 11, 12]], [[13, 14, 15]]],
  insulators: [[[1, 2, 3]], [[4, 5, 6]], [[7, 8, 9]], [[10, 11, 12]], [[13, 14, 15]]],
  spans: [[[1, 2, 3]], [[4, 5, 6]], [[7, 8, 9]], [[10, 11, 12]]],
  line_angle: [0.1, 0.2, 0.3, 0.4, 0.5],
  vtl_under_chain: [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15]
  ],
  r_under_chain: [10, 20, 30, 40, 50],
  vtl_under_console: [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15]
  ],
  r_under_console: [10, 20, 30, 40, 50],
  ground_altitude: [100, 200, 300, 400, 500],
  load_angle: [0.1, 0.2, 0.3, 0.4, 0.5],
  displacement: [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15]
  ],
  loads_coords: {},
  span_length: [100, 200, 300, 400],
  elevation: [10, 20, 30, 40],
  parameter: [1900, 2000, 2100, 2200],
  tension_sup: [5000, 4000, 3000, 2000],
  tension_inf: [4000, 3000, 2000, 1000],
  L0: [100, 200, 300, 400],
  horizontal_distance: [99, 199, 299, 399],
  arc_length: [101, 201, 301, 401],
  T_h: [3000, 2000, 1000, 500],
  slope_left: [0.01, 0.02, 0.03, 0.04],
  slope_right: [0.05, 0.06, 0.07, 0.08],
  sag: [1.1, 1.2, 1.3, 1.4],
  sag_s2: [2.1, 2.2, 2.3, 2.4]
};

describe('SectionPlotCardsComponent', () => {
  let component: SectionPlotCardsComponent;
  let plotServiceMock: MockPlotService;
  let spanServiceMock: MockSpanService;
  let plotOptionsServiceMock: MockPlotOptionsService;

  beforeEach(() => {
    plotServiceMock = {
      litData: signal<GetSectionOutput | null>(null),
      section: signal<object | null>(null)
    };
    spanServiceMock = {
      section: signal<object | null>(null)
    };
    plotOptionsServiceMock = {
      plotOptions: signal<PlotOptions>({
        view: '3d',
        side: 'profile',
        startSupport: 0,
        endSupport: 1,
        invert: false
      })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: spanServiceMock },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock }
      ]
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
    spanServiceMock.section.set(null);
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 1,
      endSupport: 3,
      invert: false
    });

    expect(component.arraysOfSupports()).toEqual([]);
  });

  it('should compute support indexes in ascending order when range has at most three supports', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: false
    });

    expect(component.arraysOfSupports()).toEqual([2, 3, 4]);
  });

  it('should reverse support indexes when invert option is enabled', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: true
    });

    expect(component.arraysOfSupports()).toEqual([4, 3, 2]);
  });

  it('should return an empty array when the support range exceeds three items', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 0,
      endSupport: 4,
      invert: false
    });

    expect(component.arraysOfSupports()).toEqual([]);
  });

  describe('spanIndex', () => {
    it('should return the lower support index between two adjacent supports in normal order', () => {
      spanServiceMock.section.set({ uuid: 'section-1' });
      plotOptionsServiceMock.plotOptions.set({
        view: '3d',
        side: 'profile',
        startSupport: 2,
        endSupport: 4,
        invert: false
      });

      // arraysOfSupports = [2, 3, 4]
      expect(component.spanIndex(0)).toBe(2); // min(2, 3)
      expect(component.spanIndex(1)).toBe(3); // min(3, 4)
    });

    it('should return the lower support index between two adjacent supports in inverted order', () => {
      spanServiceMock.section.set({ uuid: 'section-1' });
      plotOptionsServiceMock.plotOptions.set({
        view: '3d',
        side: 'profile',
        startSupport: 2,
        endSupport: 4,
        invert: true
      });

      // arraysOfSupports = [4, 3, 2]
      expect(component.spanIndex(0)).toBe(3); // min(4, 3)
      expect(component.spanIndex(1)).toBe(2); // min(3, 2)
    });
  });
});

describe('SectionPlotCardsComponent - HTML rendering', () => {
  let fixture: ComponentFixture<SectionPlotCardsComponent>;
  let plotServiceMock: MockPlotService;
  let spanServiceMock: MockSpanService;
  let plotOptionsServiceMock: MockPlotOptionsService;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const getAllByTestId = (testId: string): NodeListOf<HTMLElement> =>
    fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    plotServiceMock = {
      litData: signal<GetSectionOutput | null>(null),
      section: signal<object | null>(null)
    };
    spanServiceMock = {
      section: signal<object | null>(null)
    };
    plotOptionsServiceMock = {
      plotOptions: signal<PlotOptions>({
        view: '3d',
        side: 'profile',
        startSupport: 0,
        endSupport: 1,
        invert: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [SectionPlotCardsComponent, NoopAnimationsModule],
      providers: [
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: spanServiceMock },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionPlotCardsComponent);
  });

  it('should render cards-article', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: false
    });
    fixture.detectChanges();

    const article = getByTestId('cards-article');
    expect(article).toBeTruthy();
    expect(article?.tagName).toBe('ARTICLE');
  });

  it('should render support and span cards in normal order', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.litData.set(mockLitData);
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: false
    });
    fixture.detectChanges();

    const supportCards = getAllByTestId('support-card');
    const spanCards = getAllByTestId('span-card');
    expect(supportCards.length).toBe(3);
    expect(spanCards.length).toBe(2);
  });

  it('should render support card titles in ascending order when not inverted', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.litData.set(mockLitData);
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: false
    });
    fixture.detectChanges();

    const titles = getAllByTestId('card-title');
    // Order: support 3, span 3-4, support 4, span 4-5, support 5
    const titleTexts = Array.from(titles).map((el) => el.textContent?.trim());
    expect(titleTexts).toEqual(['3', '3-4', '4', '4-5', '5']);
  });

  it('should render support card titles in descending order when inverted', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.litData.set(mockLitData);
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: true
    });
    fixture.detectChanges();

    const titles = getAllByTestId('card-title');
    // Order: support 5, span 4-5, support 4, span 3-4, support 3
    const titleTexts = Array.from(titles).map((el) => el.textContent?.trim());
    expect(titleTexts).toEqual(['5', '4-5', '4', '3-4', '3']);
  });

  it('should render span cards with correct titles when inverted', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.litData.set(mockLitData);
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: true
    });
    fixture.detectChanges();

    const spanCards = getAllByTestId('span-card');
    const spanTitles = Array.from(spanCards).map((card) =>
      card.querySelector('[data-testid="card-title"]')?.textContent?.trim()
    );
    // Inverted: spans between [4,3] and [3,2] → spanIndex = 3 and 2 → titles "4-5" and "3-4"
    expect(spanTitles).toEqual(['4-5', '3-4']);
  });

  it('should not render any cards when support range exceeds three', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 0,
      endSupport: 4,
      invert: false
    });
    fixture.detectChanges();

    const supportCards = getAllByTestId('support-card');
    const spanCards = getAllByTestId('span-card');
    expect(supportCards.length).toBe(0);
    expect(spanCards.length).toBe(0);
  });

  it('should update card order when toggling invert', () => {
    spanServiceMock.section.set({ uuid: 'section-1' });
    plotServiceMock.litData.set(mockLitData);
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: false
    });
    fixture.detectChanges();

    let titles = getAllByTestId('card-title');
    let titleTexts = Array.from(titles).map((el) => el.textContent?.trim());
    expect(titleTexts).toEqual(['3', '3-4', '4', '4-5', '5']);

    // Toggle invert
    plotOptionsServiceMock.plotOptions.set({
      view: '3d',
      side: 'profile',
      startSupport: 2,
      endSupport: 4,
      invert: true
    });
    fixture.detectChanges();

    titles = getAllByTestId('card-title');
    titleTexts = Array.from(titles).map((el) => el.textContent?.trim());
    expect(titleTexts).toEqual(['5', '4-5', '4', '3-4', '3']);
  });
});
