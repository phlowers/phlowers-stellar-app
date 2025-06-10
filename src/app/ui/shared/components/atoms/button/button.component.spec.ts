import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'app-icon',
  template: '<ng-content></ng-content>'
})
class MockIconComponent {}

@Component({
  standalone: true,
  imports: [ButtonComponent, MockIconComponent],
  template: `
    <button appBtn [btnSize]="size" [btnStyle]="style">
      <app-icon class="app-icon">Left Icon</app-icon>
      Button Text
      <app-icon class="app-icon" iconRight>Right Icon</app-icon>
    </button>
  `
})
class TestHostComponent {
  size: 's' | 'm' | 'l' = 'm';
  style: 'base' | 'outlined' | 'text' = 'base';
}

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.btnSize()).toBe('m');
      expect(component.btnStyle()).toBe('base');
    });
  });

  describe('Input Properties', () => {
    it('should accept btnSize input', () => {
      fixture.componentRef.setInput('btnSize', 's');
      expect(component.btnSize()).toBe('s');

      fixture.componentRef.setInput('btnSize', 'l');
      expect(component.btnSize()).toBe('l');
    });

    it('should accept btnStyle input', () => {
      fixture.componentRef.setInput('btnStyle', 'outlined');
      expect(component.btnStyle()).toBe('outlined');

      fixture.componentRef.setInput('btnStyle', 'text');
      expect(component.btnStyle()).toBe('text');
    });
  });

  describe('Computed Classes', () => {
    it('should generate correct classes with default values', () => {
      const classes = component.classesList();
      expect(classes).toBe('app-btn-m app-btn-base');
    });

    it('should generate correct classes for small size', () => {
      fixture.componentRef.setInput('btnSize', 's');
      const classes = component.classesList();
      expect(classes).toBe('app-btn-s app-btn-base');
    });

    it('should generate correct classes for large size', () => {
      fixture.componentRef.setInput('btnSize', 'l');
      const classes = component.classesList();
      expect(classes).toBe('app-btn-l app-btn-base');
    });

    it('should generate correct classes for outlined style', () => {
      fixture.componentRef.setInput('btnStyle', 'outlined');
      const classes = component.classesList();
      expect(classes).toBe('app-btn-m app-btn-outlined');
    });

    it('should generate correct classes for text style', () => {
      fixture.componentRef.setInput('btnStyle', 'text');
      const classes = component.classesList();
      expect(classes).toBe('app-btn-m app-btn-text');
    });

    it('should generate correct classes for all combinations', () => {
      const sizes: ('s' | 'm' | 'l')[] = ['s', 'm', 'l'];
      const styles: ('base' | 'outlined' | 'text')[] = [
        'base',
        'outlined',
        'text'
      ];

      sizes.forEach((size) => {
        styles.forEach((style) => {
          fixture.componentRef.setInput('btnSize', size);
          fixture.componentRef.setInput('btnStyle', style);
          const classes = component.classesList();
          expect(classes).toBe(`app-btn-${size} app-btn-${style}`);
        });
      });
    });
  });

  describe('Host Binding', () => {
    it('should have base app-btn class', () => {
      fixture.detectChanges();
      const element = fixture.nativeElement;
      expect(element.classList.contains('app-btn')).toBeTruthy();
    });

    it('should apply computed classes to host element', () => {
      fixture.componentRef.setInput('btnSize', 's');
      fixture.componentRef.setInput('btnStyle', 'outlined');
      fixture.detectChanges();

      const element = fixture.nativeElement;
      expect(element.classList.contains('app-btn-s')).toBeTruthy();
      expect(element.classList.contains('app-btn-outlined')).toBeTruthy();
    });
  });

  describe('Content Projection Integration', () => {
    beforeEach(async () => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
    });

    it('should project content correctly', () => {
      hostFixture.detectChanges();
      const buttonElement = hostFixture.nativeElement.querySelector('button');

      expect(buttonElement.textContent).toContain('Button Text');
      expect(buttonElement.textContent).toContain('Left Icon');
      expect(buttonElement.textContent).toContain('Right Icon');
    });

    it('should apply classes correctly when used as directive', () => {
      hostComponent.size = 'l';
      hostComponent.style = 'text';
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector('button');
      expect(buttonElement.classList.contains('app-btn')).toBeTruthy();
      expect(buttonElement.classList.contains('app-btn-l')).toBeTruthy();
      expect(buttonElement.classList.contains('app-btn-text')).toBeTruthy();
    });
  });

  describe('Selector Variants', () => {
    it('should work with different selector variants', async () => {
      const selectors = ['appBtn', 'appButton', 'app-btn', 'app-button'];

      for (const selector of selectors) {
        @Component({
          standalone: true,
          imports: [ButtonComponent],
          template: `<button [${selector}] btnSize="s">Test</button>`
        })
        class TestSelectorComponent {}

        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
          imports: [TestSelectorComponent]
        }).compileComponents();

        const selectorFixture = TestBed.createComponent(TestSelectorComponent);
        selectorFixture.detectChanges();

        const buttonElement =
          selectorFixture.nativeElement.querySelector('button');
        expect(buttonElement.classList.contains('app-btn')).toBeTruthy();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined inputs gracefully', () => {
      expect(() => {
        const classes = component.classesList();
        expect(classes).toBe('app-btn-m app-btn-base');
      }).not.toThrow();
    });

    it('should update classes when inputs change', () => {
      // Init state
      expect(component.classesList()).toBe('app-btn-m app-btn-base');

      // Change size
      fixture.componentRef.setInput('btnSize', 's');
      expect(component.classesList()).toBe('app-btn-s app-btn-base');

      // Change style
      fixture.componentRef.setInput('btnStyle', 'outlined');
      expect(component.classesList()).toBe('app-btn-s app-btn-outlined');

      // Change both
      fixture.componentRef.setInput('btnSize', 'l');
      fixture.componentRef.setInput('btnStyle', 'text');
      expect(component.classesList()).toBe('app-btn-l app-btn-text');
    });
  });
});
