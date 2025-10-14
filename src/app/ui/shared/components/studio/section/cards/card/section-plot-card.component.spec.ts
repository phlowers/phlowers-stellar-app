import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { SectionPlotCardComponent } from './section-plot-card.component';
import { CardComponent } from '@ui/shared/components/atoms/card/card.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';

// Test host component to test the SectionPlotCardComponent with different inputs
@Component({
  template: `
    <app-section-plot-card
      [type]="cardType"
      [index]="cardIndex"
    ></app-section-plot-card>
  `,
  standalone: true,
  imports: [SectionPlotCardComponent]
})
class TestHostComponent {
  cardType: 'span' | 'support' = 'support';
  cardIndex = 1;
}

describe('SectionPlotCardComponent', () => {
  let component: SectionPlotCardComponent;
  let fixture: ComponentFixture<SectionPlotCardComponent>;
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SectionPlotCardComponent,
        TestHostComponent,
        CardComponent,
        IconComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionPlotCardComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.type()).toBe('support');
      expect(component.index()).toBe(0);
      expect(component.isExpanded()).toBe(false);
    });
  });

  describe('Input Properties', () => {
    it('should accept type input', () => {
      fixture.componentRef.setInput('type', 'span');
      expect(component.type()).toBe('span');

      fixture.componentRef.setInput('type', 'support');
      expect(component.type()).toBe('support');
    });

    it('should accept index input', () => {
      fixture.componentRef.setInput('index', 5);
      expect(component.index()).toBe(5);

      fixture.componentRef.setInput('index', 0);
      expect(component.index()).toBe(0);
    });

    it('should handle multiple input changes', () => {
      fixture.componentRef.setInput('type', 'span');
      fixture.componentRef.setInput('index', 3);

      expect(component.type()).toBe('span');
      expect(component.index()).toBe(3);
    });
  });

  describe('Computed Properties', () => {
    describe('cardTitle', () => {
      it('should return correct title for support type', () => {
        fixture.componentRef.setInput('type', 'support');
        fixture.componentRef.setInput('index', 1);

        expect(component.cardTitle()).toBe('N°1');
      });

      it('should return correct title for span type', () => {
        fixture.componentRef.setInput('type', 'span');
        fixture.componentRef.setInput('index', 2);

        expect(component.cardTitle()).toBe('2-3');
      });

      it('should update when inputs change', () => {
        // Initial state
        expect(component.cardTitle()).toBe('N°0');

        // Change to span
        fixture.componentRef.setInput('type', 'span');
        expect(component.cardTitle()).toBe('0-1');

        // Change index
        fixture.componentRef.setInput('index', 5);
        expect(component.cardTitle()).toBe('5-6');

        // Change back to support
        fixture.componentRef.setInput('type', 'support');
        expect(component.cardTitle()).toBe('N°5');
      });
    });

    describe('cardColor', () => {
      it('should return correct color for support type', () => {
        fixture.componentRef.setInput('type', 'support');

        expect(component.cardColor()).toBe('bg-[#0099FF]');
      });

      it('should return correct color for span type', () => {
        fixture.componentRef.setInput('type', 'span');

        expect(component.cardColor()).toBe('bg-[#ED6E13]');
      });

      it('should update when type changes', () => {
        // Initial state
        expect(component.cardColor()).toBe('bg-[#0099FF]');

        // Change to span
        fixture.componentRef.setInput('type', 'span');
        expect(component.cardColor()).toBe('bg-[#ED6E13]');

        // Change back to support
        fixture.componentRef.setInput('type', 'support');
        expect(component.cardColor()).toBe('bg-[#0099FF]');
      });
    });
  });

  describe('Data Structures', () => {
    describe('supportData', () => {
      it('should return correct support data structure', () => {
        const data = component.supportData();

        expect(data).toHaveLength(2);
        expect(data[0].title).toBe('VHL (sous chaine)');
        expect(data[0].indent).toBe(true);
        expect(data[0].fields).toHaveLength(4);
        expect(data[0].fields[0].label).toContain('V :');
        expect(data[0].fields[0].value).toBe('1234');

        expect(data[1].title).toBeUndefined();
        expect(data[1].fields).toHaveLength(1);
        expect(data[1].fields[0].label).toContain('Angle en ligne :');
      });

      it('should be reactive to changes', () => {
        const data1 = component.supportData();
        const data2 = component.supportData();

        expect(data1).toBe(data2); // Same reference due to computed caching
      });
    });

    describe('supportExpandedData', () => {
      it('should return correct expanded support data structure', () => {
        const data = component.supportExpandedData();

        expect(data).toHaveLength(4);
        expect(data[0].title).toBe('VHL (sous console)');
        expect(data[0].indent).toBe(true);
        expect(data[0].fields).toHaveLength(4);

        expect(data[1].title).toBeUndefined();
        expect(data[1].fields).toHaveLength(1);
        expect(data[1].fields[0].label).toContain('Alt. pied supp :');

        expect(data[2].title).toBe('Deplacement chaine acc.');
        expect(data[2].indent).toBe(true);
        expect(data[2].fields).toHaveLength(3);

        expect(data[3].title).toBeUndefined();
        expect(data[3].fields).toHaveLength(2);
      });
    });

    describe('spanData', () => {
      it('should return correct span data structure', () => {
        const data = component.spanData();

        expect(data).toHaveLength(4);
        expect(data[0].label).toContain('Longeur portée :');
        expect(data[0].value).toBe('1234');
        expect(data[1].label).toContain('Dénivelé (m) :');
        expect(data[2].label).toContain('Tension supp (Max) :');
        expect(data[3].label).toContain('Longueur naturelle LO :');
      });
    });

    describe('spanExpandedData', () => {
      it('should return correct expanded span data structure', () => {
        const data = component.spanExpandedData();

        expect(data).toHaveLength(6);
        expect(data[0].label).toContain('Fleche F1 :');
        expect(data[0].value).toBe('1234');
        expect(data[1].label).toContain('Fleche F2 :');
        expect(data[2].label).toContain('Dist. horizontal acc. :');
        expect(data[3].label).toContain("Longueur d'arc LA :");
        expect(data[4].label).toContain('Th - T0 :');
        expect(data[5].label).toContain('Tension inf acc. :');
      });
    });
  });

  describe('Expansion Functionality', () => {
    it('should start collapsed', () => {
      expect(component.isExpanded()).toBe(false);
    });

    it('should toggle expansion state', () => {
      expect(component.isExpanded()).toBe(false);

      component.isExpanded.set(true);
      expect(component.isExpanded()).toBe(true);

      component.isExpanded.set(false);
      expect(component.isExpanded()).toBe(false);
    });

    it('should toggle expansion with set method', () => {
      expect(component.isExpanded()).toBe(false);

      component.isExpanded.set(!component.isExpanded());
      expect(component.isExpanded()).toBe(true);

      component.isExpanded.set(!component.isExpanded());
      expect(component.isExpanded()).toBe(false);
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
    });

    it('should render card component', () => {
      hostFixture.detectChanges();

      const cardElement = hostFixture.nativeElement.querySelector('app-card');
      expect(cardElement).toBeTruthy();
    });

    it('should render correct title for support type', () => {
      hostComponent.cardType = 'support';
      hostComponent.cardIndex = 2;
      hostFixture.detectChanges();

      const titleElement = hostFixture.nativeElement.querySelector('.title');
      expect(titleElement.textContent.trim()).toBe('N°2');
    });

    it('should render correct title for span type', () => {
      hostComponent.cardType = 'span';
      hostComponent.cardIndex = 3;
      hostFixture.detectChanges();

      const titleElement = hostFixture.nativeElement.querySelector('.title');
      expect(titleElement.textContent.trim()).toBe('3-4');
    });

    it('should render correct icon for support type', () => {
      hostComponent.cardType = 'support';
      hostFixture.detectChanges();

      const iconElement = hostFixture.nativeElement.querySelector('app-icon');
      expect(iconElement).toBeTruthy();
      // The icon component should be present and have the correct icon input
      expect(iconElement.getAttribute('ng-reflect-icon')).toBe('support');
    });

    it('should render correct icon for span type', () => {
      hostComponent.cardType = 'span';
      hostFixture.detectChanges();

      const iconElement = hostFixture.nativeElement.querySelector('app-icon');
      expect(iconElement).toBeTruthy();
      // The icon component should be present and have the correct icon input
      expect(iconElement.getAttribute('ng-reflect-icon')).toBe('span');
    });

    it('should render expand button', () => {
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector(
        'button[aria-label="Expand details"]'
      );
      expect(buttonElement).toBeTruthy();
    });

    it('should render down arrow when collapsed', () => {
      hostFixture.detectChanges();

      const iconElements =
        hostFixture.nativeElement.querySelectorAll('app-icon');
      const arrowIcon = Array.from(iconElements).find(
        (icon) =>
          (icon as Element).textContent?.trim() === 'keyboard_arrow_down'
      );
      expect(arrowIcon).toBeTruthy();
    });

    it('should render up arrow when expanded', () => {
      // Get the component instance to set expanded state
      const componentInstance = hostFixture.debugElement.query(
        (debugEl) =>
          debugEl.componentInstance instanceof SectionPlotCardComponent
      ).componentInstance;

      componentInstance.isExpanded.set(true);
      hostFixture.detectChanges();

      const iconElements =
        hostFixture.nativeElement.querySelectorAll('app-icon');
      const arrowIcon = Array.from(iconElements).find(
        (icon) => (icon as Element).textContent?.trim() === 'keyboard_arrow_up'
      );
      expect(arrowIcon).toBeTruthy();
    });
  });

  describe('Support Type Content Rendering', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostComponent.cardType = 'support';
    });

    it('should render support data sections', () => {
      hostFixture.detectChanges();

      const titleElements =
        hostFixture.nativeElement.querySelectorAll('.title');
      const sectionTitle = Array.from(titleElements).find((title) =>
        (title as Element).textContent?.trim().includes('VHL (sous chaine)')
      );
      expect(sectionTitle).toBeTruthy();

      const detailsElements =
        hostFixture.nativeElement.querySelectorAll('.details');
      expect(detailsElements.length).toBeGreaterThan(0);
    });

    it('should render indented sections correctly', () => {
      hostFixture.detectChanges();

      const indentedDiv = hostFixture.nativeElement.querySelector('.pl-2');
      expect(indentedDiv).toBeTruthy();
    });

    it('should render expanded content when expanded', () => {
      const componentInstance = hostFixture.debugElement.query(
        (debugEl) =>
          debugEl.componentInstance instanceof SectionPlotCardComponent
      ).componentInstance;

      componentInstance.isExpanded.set(true);
      hostFixture.detectChanges();

      // Should have both regular and expanded content
      const allDetailsElements =
        hostFixture.nativeElement.querySelectorAll('.details');
      expect(allDetailsElements.length).toBeGreaterThan(5); // More than just the basic support data
    });

    it('should not render expanded content when collapsed', () => {
      hostFixture.detectChanges();

      // Should only have basic support data, not expanded data
      const allDetailsElements =
        hostFixture.nativeElement.querySelectorAll('.details');
      expect(allDetailsElements.length).toBe(5); // Only basic support data (4 VHL fields + 1 angle field)
    });
  });

  describe('Span Type Content Rendering', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostComponent.cardType = 'span';
    });

    it('should render span data fields', () => {
      hostFixture.detectChanges();

      const detailsElements =
        hostFixture.nativeElement.querySelectorAll('.details');
      expect(detailsElements.length).toBe(4); // Basic span data

      // Check first field has no padding
      expect(detailsElements[0].classList.contains('!p-0')).toBeTruthy();
    });

    it('should render expanded content when expanded', () => {
      const componentInstance = hostFixture.debugElement.query(
        (debugEl) =>
          debugEl.componentInstance instanceof SectionPlotCardComponent
      ).componentInstance;

      componentInstance.isExpanded.set(true);
      hostFixture.detectChanges();

      const allDetailsElements =
        hostFixture.nativeElement.querySelectorAll('.details');
      expect(allDetailsElements.length).toBe(10); // 4 basic + 6 expanded
    });

    it('should not render expanded content when collapsed', () => {
      hostFixture.detectChanges();

      const allDetailsElements =
        hostFixture.nativeElement.querySelectorAll('.details');
      expect(allDetailsElements.length).toBe(4); // Only basic span data
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
    });

    it('should toggle expansion when expand button is clicked', () => {
      hostFixture.detectChanges();

      const componentInstance = hostFixture.debugElement.query(
        (debugEl) =>
          debugEl.componentInstance instanceof SectionPlotCardComponent
      ).componentInstance;

      expect(componentInstance.isExpanded()).toBe(false);

      const expandButton = hostFixture.nativeElement.querySelector(
        'button[aria-label="Expand details"]'
      );
      expandButton.click();

      expect(componentInstance.isExpanded()).toBe(true);

      expandButton.click();

      expect(componentInstance.isExpanded()).toBe(false);
    });

    it('should update arrow icon when toggled', () => {
      hostFixture.detectChanges();

      const expandButton = hostFixture.nativeElement.querySelector(
        'button[aria-label="Expand details"]'
      );

      // Initially down arrow
      let iconElements = hostFixture.nativeElement.querySelectorAll('app-icon');
      let arrowIcon = Array.from(iconElements).find(
        (icon) =>
          (icon as Element).textContent?.trim() === 'keyboard_arrow_down'
      );
      expect(arrowIcon).toBeTruthy();

      // Click to expand
      expandButton.click();
      hostFixture.detectChanges();

      // Should show up arrow
      iconElements = hostFixture.nativeElement.querySelectorAll('app-icon');
      arrowIcon = Array.from(iconElements).find(
        (icon) => (icon as Element).textContent?.trim() === 'keyboard_arrow_up'
      );
      expect(arrowIcon).toBeTruthy();

      // Click to collapse
      expandButton.click();
      hostFixture.detectChanges();

      // Should show down arrow again
      iconElements = hostFixture.nativeElement.querySelectorAll('app-icon');
      arrowIcon = Array.from(iconElements).find(
        (icon) =>
          (icon as Element).textContent?.trim() === 'keyboard_arrow_down'
      );
      expect(arrowIcon).toBeTruthy();
    });
  });
});
