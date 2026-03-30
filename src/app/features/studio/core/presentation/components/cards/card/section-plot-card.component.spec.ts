import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectionPlotCardComponent } from './section-plot-card.component';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { GetSectionOutput } from '@services/worker_python/tasks/types';

const mockLitData: GetSectionOutput = {
  supports: [[[1, 2, 3]]],
  insulators: [[[4, 5, 6]]],
  spans: [[[7, 8, 9]]],
  line_angle: [0.1, 0.2, 0.3],
  vtl_under_chain: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ],
  r_under_chain: [10, 20, 30],
  vtl_under_console: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ],
  r_under_console: [10, 20, 30],
  ground_altitude: [100, 200, 300],
  load_angle: [0.1, 0.2, 0.3],
  displacement: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ],
  loads_coords: { 0: [1, 2, 3] },
  span_length: [100, 200, 300],
  elevation: [10, 20, 30],
  parameter: [1900, 2000, 2100],
  tension_sup: [5000, 4000, 3000],
  tension_inf: [4000, 3000, 2000],
  L0: [100, 200, 300],
  horizontal_distance: [99, 199, 299],
  arc_length: [101, 201, 301],
  T_h: [3000, 2000, 1000]
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
    await TestBed.configureTestingModule({
      imports: [SectionPlotCardComponent, TestHostComponent, CardComponent, IconComponent, NoopAnimationsModule]
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
    expect(component.cardTitle()).toBe('N°3');
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

    it('should render correct title for support and span', () => {
      hostComponent.cardType = 'support';
      hostComponent.cardIndex = 3;
      hostFixture.detectChanges();

      let title = hostFixture.nativeElement.querySelector('.title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('N°4');

      hostComponent.cardType = 'span';
      hostComponent.cardIndex = 4;
      hostFixture.detectChanges();

      title = hostFixture.nativeElement.querySelector('.title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('5-6');
    });

    it('should render correct icon for type', () => {
      hostComponent.cardType = 'span';
      hostFixture.detectChanges();

      const icon = hostFixture.nativeElement.querySelector('app-icon');
      expect(icon?.getAttribute('ng-reflect-icon')).toBe('span');
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
      expect(arrow?.getAttribute('ng-reflect-icon')).toBe('keyboard_arrow_down');

      button.click();
      hostFixture.detectChanges();
      arrow = hostFixture.nativeElement.querySelector('.arrow');
      expect(arrow?.getAttribute('ng-reflect-icon')).toBe('keyboard_arrow_up');
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
    expect(spanData.length).toBe(5);
    expect(support[0].fields.length).toBe(4);
    expect(spanData[0].label).toContain('Span length');
    expect(spanExpandedData.length).toBe(8);
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
  });
});
