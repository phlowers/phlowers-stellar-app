import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectionPlotCardComponent } from './section-plot-card.component';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { PlotSpanService } from '@services/plot/plot-span.service';

import { TranslocoTestingModule } from '@jsverse/transloco';
const mockLitData: GetSectionOutput = {
  coords: {
    supports: [[[1, 2, 3]]],
    insulators: [[[4, 5, 6]]],
    spans: [[[7, 8, 9]]],
    obstacles: null,
    distances: null,
    loads: { 0: [1, 2, 3] }
  },
  output_parameters: {
    line_angle: [0.1, 0.2, 0.3],
    vtl_under_chain: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    vtl_under_console: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    r_under_chain: [10, 20, 30],
    r_under_console: [10, 20, 30],
    ground_altitude: [100, 200, 300],
    displacement: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    load_angle: [0.1, 0.2, 0.3],
    span_length: [100, 200, 300],
    loads_coords: { 0: [1, 2, 3] },
    utilization_rate: [0.5, 0.6, 0.7],
    elevation: [10, 20, 30],
    parameter: [1900, 2000, 2100],
    slope_left: [0.01, 0.02, 0.03],
    slope_right: [0.04, 0.05, 0.06],
    tension_sup: [5000, 4000, 3000],
    tension_inf: [4000, 3000, 2000],
    L0: [100, 200, 300],
    horizontal_distance: [99, 199, 299],
    arc_length: [101, 201, 301],
    T_h: [3000, 2000, 1000],
    sag: [1, 2, 3],
    sag_s2: [4, 5, 6]
  }
};

@Component({
  template: `<app-section-plot-card [type]="cardType" [index]="cardIndex" [litData]="litData" />`,
  standalone: true,
  imports: [SectionPlotCardComponent]
})
class TestHostComponent {
  cardType: 'span' | 'support' = 'support';
  cardIndex = 1;
  litData: GetSectionOutput | null = mockLitData;
}

describe('SectionPlotCardComponent (Angular 19)', () => {
  let fixture: ComponentFixture<SectionPlotCardComponent>;
  let component: SectionPlotCardComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    const mockPlotSpanService = {
      section: vi.fn().mockReturnValue(null)
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.section-plot-card.alt-supp-foot-label': 'Alt. supp foot:',
              'studio.section-plot-card.angle-balancement-label': 'Angle balancement:',
              'studio.section-plot-card.arc-length-la-label': 'Arc length (L):',
              'studio.section-plot-card.arrow-f1-label': 'Arrow F1:',
              'studio.section-plot-card.arrow-f2-label': 'Arrow F2:',
              'studio.section-plot-card.cable-slope-left-att-label': 'Cable slope left att.:',
              'studio.section-plot-card.cable-slope-right-att-label': 'Cable slope right att.:',
              'studio.section-plot-card.chain-displacement-acc-title': 'Chain displacement acc.',
              'studio.section-plot-card.elevation-label': 'Elevation:',
              'studio.section-plot-card.expand-details-aria-label': 'Expand details',
              'studio.section-plot-card.horizontal-dist-acc-label': 'Horizontal dist. between attach.:',
              'studio.section-plot-card.inf-tension-acc-label': 'Attach. tension inf.:',
              'studio.section-plot-card.l-label': 'L:',
              'studio.section-plot-card.line-angle-label': 'Line angle:',
              'studio.section-plot-card.natural-length-l0-label': 'Nat. length (L0):',
              'studio.section-plot-card.parameter-label': 'Parameter:',
              'studio.section-plot-card.resultant-label': 'Resultant:',
              'studio.section-plot-card.span-length-label': 'Span length:',
              'studio.section-plot-card.supp-tension-max-label': 'Attach. tension sup. (Tmax):',
              'studio.section-plot-card.t-label': 'T:',
              'studio.section-plot-card.th-t0-label': 'Horizontal tension (T0):',
              'studio.section-plot-card.v-label': 'V:',
              'studio.section-plot-card.vtl-under-chain-title': 'VTL (under chain)',
              'studio.section-plot-card.vtl-under-console-title': 'VTL (under console)',
              'studio.section-plot-card.x-label': 'X:',
              'studio.section-plot-card.y-label': 'Y:',
              'studio.section-plot-card.z-label': 'Z:'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        SectionPlotCardComponent,
        TestHostComponent,
        CardComponent,
        IconComponent,
        NoopAnimationsModule
      ],
      providers: [{ provide: PlotSpanService, useValue: mockPlotSpanService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionPlotCardComponent);
    component = fixture.componentInstance;
    // Set required inputs
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('litData', mockLitData);
  });

  // --- COMPONENT CREATION ---------------------------------------------------
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize default values', () => {
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('litData', mockLitData);
    expect(component.type()).toBe('support');
    expect(component.index()).toBe(0);
    expect(component.isExpanded()).toBe(false);
  });

  // --- INPUTS ---------------------------------------------------------------
  it('should update inputs reactively', () => {
    fixture.componentRef.setInput('type', 'span');
    fixture.componentRef.setInput('index', 5);
    fixture.componentRef.setInput('litData', mockLitData);
    expect(component.type()).toBe('span');
    expect(component.index()).toBe(5);
  });

  // --- COMPUTED SIGNALS -----------------------------------------------------
  it('should compute correct title and color', () => {
    fixture.componentRef.setInput('type', 'support');
    fixture.componentRef.setInput('index', 2);
    fixture.componentRef.setInput('litData', mockLitData);
    expect(component.cardTitle()).toBe('3');
    expect(component.cardColor()).toBe('icon-wrapper--support');

    fixture.componentRef.setInput('type', 'span');
    expect(component.cardTitle()).toBe('3-4');
    expect(component.cardColor()).toBe('icon-wrapper--line');
  });

  // --- SIGNALS --------------------------------------------------------------
  it('should toggle expansion signal correctly', () => {
    expect(component.isExpanded()).toBe(false);
    component.isExpanded.set(true);
    expect(component.isExpanded()).toBe(true);
  });

  // --- TEMPLATE TESTS ------------------------------------------------------
  describe('Template Integration', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
    });

    it('should render app-card and header', () => {
      hostFixture.detectChanges();
      const card = hostFixture.nativeElement.querySelector('app-card');
      const header = hostFixture.nativeElement.querySelector('header');
      expect(card).toBeTruthy();
      expect(header).toBeTruthy();
    });

    it('should render correct title for a support card', () => {
      hostComponent.cardType = 'support';
      hostComponent.cardIndex = 3;
      hostFixture.detectChanges();

      const title = hostFixture.nativeElement.querySelector('.title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('4');
    });

    it('should render correct title for a span card', () => {
      hostComponent.cardType = 'span';
      hostComponent.cardIndex = 4;
      hostFixture.detectChanges();

      const title = hostFixture.nativeElement.querySelector('.title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('5-6');
    });

    it('should render correct icon for type', () => {
      hostComponent.cardType = 'span';
      hostFixture.detectChanges();

      const icon = hostFixture.nativeElement.querySelector('app-icon');
      const use = icon?.querySelector('use');
      expect(use?.getAttribute('xlink:href')).toBe('/icons/customs.svg#span');
    });
  });

  // --- EXPANSION INTERACTIONS ----------------------------------------------
  describe('Expansion Interactions', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostFixture.detectChanges();
    });

    it('should toggle expanded state on button click', () => {
      const debug = hostFixture.debugElement.query(By.directive(SectionPlotCardComponent));
      const instance = debug.componentInstance as SectionPlotCardComponent;
      const button = hostFixture.nativeElement.querySelector('button');

      expect(instance.isExpanded()).toBe(false);
      button.click();
      expect(instance.isExpanded()).toBe(true);
      button.click();
      expect(instance.isExpanded()).toBe(false);
    });

    it('should update arrow icon when toggled', () => {
      const button = hostFixture.nativeElement.querySelector('button');
      let arrow = hostFixture.nativeElement.querySelector('.arrow');
      expect(arrow?.textContent?.trim()).toBe('keyboard_arrow_down');

      button.click();
      hostFixture.detectChanges();
      arrow = hostFixture.nativeElement.querySelector('.arrow');
      expect(arrow?.textContent?.trim()).toBe('keyboard_arrow_up');
    });
  });

  // --- DATA STRUCTURE INTEGRITY --------------------------------------------
  it('should provide valid support and span data', () => {
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('litData', mockLitData);
    const support = component.supportData();
    const spanData = component.spanData();
    const spanExpandedData = component.spanExpandedData();

    expect(support.length).toBe(2);
    expect(spanData.length).toBe(6);
    expect(support[0].fields.length).toBe(4);
    expect(spanData[0].label).toContain('Span length');
    expect(spanExpandedData.length).toBe(7);
  });

  it('should provide span data fields in the exact expected order', () => {
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('litData', mockLitData);

    expect(component.spanData().map((field) => field.label)).toEqual([
      'Span length:',
      'Elevation:',
      'Parameter:',
      'Horizontal tension (T0):',
      'Attach. tension sup. (Tmax):',
      'Attach. tension inf.:'
    ]);
  });

  it('should provide span expanded data fields in the exact expected order', () => {
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('litData', mockLitData);

    expect(component.spanExpandedData().map((field) => field.label)).toEqual([
      'Arrow F1:',
      'Arrow F2:',
      'Horizontal dist. between attach.:',
      'Nat. length (L0):',
      'Arc length (L):',
      'Cable slope left att.:',
      'Cable slope right att.:'
    ]);
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
      fixture.componentRef.setInput('index', 0);
      fixture.componentRef.setInput('litData', mockLitData);
      fixture.detectChanges();
    });

    it('should render expand-card-btn', () => {
      const el = getByTestId('expand-card-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render card-title', () => {
      const el = getByTestId('card-title');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('P');
      expect(el?.textContent?.trim()).toBe('1');
    });
  });
});
