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
    <button
      app-btn
      [btnSize]="size"
      [btnStyle]="style"
      [btnLoading]="loading"
      (click)="onButtonClick()"
    >
      <app-icon class="app-icon">Left Icon</app-icon>
      Button Text
      <app-icon class="app-icon" iconRight>Right Icon</app-icon>
    </button>
  `
})
class TestHostComponent {
  size: 's' | 'm' | 'l' = 'm';
  style: 'base' | 'outlined' | 'text' | 'danger' = 'base';
  loading = false;
  clickCount = 0;

  onButtonClick(): void {
    this.clickCount++;
  }
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
      expect(component.btnLoading()).toBe(false);
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

      fixture.componentRef.setInput('btnStyle', 'danger');
      expect(component.btnStyle()).toBe('danger');
    });

    it('should accept btnLoading input', () => {
      fixture.componentRef.setInput('btnLoading', true);
      expect(component.btnLoading()).toBe(true);

      fixture.componentRef.setInput('btnLoading', false);
      expect(component.btnLoading()).toBe(false);
    });
  });

  describe('Computed Classes', () => {
    it('should generate correct classes with default values', () => {
      const classes = component.classesList();
      expect(classes).toBe('app-btn-m app-btn-base');
    });

    it('should generate correct classes for all combinations', () => {
      const sizes: ('s' | 'm' | 'l')[] = ['s', 'm', 'l'];
      const styles: ('base' | 'outlined' | 'text' | 'danger')[] = [
        'base',
        'outlined',
        'text',
        'danger'
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

    it('should add loading classes when btnLoading is true', () => {
      fixture.componentRef.setInput('btnLoading', true);
      const classes = component.classesList();
      expect(classes).toContain('disabled app-btn-loading');
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

    it('should apply loading classes to host element', () => {
      fixture.componentRef.setInput('btnLoading', true);
      fixture.detectChanges();

      const element = fixture.nativeElement;
      expect(element.classList.contains('disabled')).toBeTruthy();
      expect(element.classList.contains('app-btn-loading')).toBeTruthy();
    });
  });

  describe('Event Listener Management', () => {
    it('should add click event listener on init', () => {
      const addEventListenerSpy = jest.spyOn(
        fixture.nativeElement,
        'addEventListener'
      );

      component.ngOnInit();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      );
    });

    it('should remove click event listener on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(
        fixture.nativeElement,
        'removeEventListener'
      );

      component.ngOnInit();
      component.ngOnDestroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      );
    });

    it('should handle destroy when no listener exists', () => {
      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });
  });

  describe('Prevent click', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
    });

    it('should allow click when not loading', () => {
      hostComponent.loading = false;
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector('button');
      buttonElement.click();

      expect(hostComponent.clickCount).toBe(1);
    });

    it('should prevent click when loading', () => {
      hostComponent.loading = true;
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector('button');

      const clickEvent = new Event('click', {
        bubbles: true,
        cancelable: true
      });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
      const stopImmediatePropagationSpy = jest.spyOn(
        clickEvent,
        'stopImmediatePropagation'
      );

      buttonElement.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(stopImmediatePropagationSpy).toHaveBeenCalled();
      expect(hostComponent.clickCount).toBe(0);
    });
  });

  describe('Loading State Template', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
    });

    it('should show normal content when not loading', () => {
      hostComponent.loading = false;
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector('button');
      expect(buttonElement.textContent).toContain('Button Text');
      expect(buttonElement.textContent).toContain('Left Icon');
      expect(buttonElement.textContent).toContain('Right Icon');
      expect(buttonElement.textContent).not.toContain('loading');
    });

    it('should show loading content when loading', () => {
      hostComponent.loading = true;
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector('button');
      expect(buttonElement.textContent).toContain('loading');
      expect(buttonElement.textContent).not.toContain('Button Text');
      expect(buttonElement.textContent).not.toContain('Left Icon');
      expect(buttonElement.textContent).not.toContain('Right Icon');
    });

    it('should show progress activity icon when loading', () => {
      hostComponent.loading = true;
      hostFixture.detectChanges();

      const iconElement = hostFixture.nativeElement.querySelector(
        'app-icon[icon="progress_activity"]'
      );
      expect(iconElement).toBeTruthy();
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
      const selectors = ['app-btn', 'app-button'];

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

      // Add loading
      fixture.componentRef.setInput('btnLoading', true);
      expect(component.classesList()).toBe(
        'app-btn-s app-btn-outlined disabled app-btn-loading'
      );

      // Change all
      fixture.componentRef.setInput('btnSize', 'l');
      fixture.componentRef.setInput('btnStyle', 'danger');
      fixture.componentRef.setInput('btnLoading', false);
      expect(component.classesList()).toBe('app-btn-l app-btn-danger');
    });

    it('should handle rapid loading state changes', () => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;

      // Start not loading
      hostComponent.loading = false;
      hostFixture.detectChanges();
      expect(hostComponent.clickCount).toBe(0);

      // Enable loading
      hostComponent.loading = true;
      hostFixture.detectChanges();

      const buttonElement = hostFixture.nativeElement.querySelector('button');
      buttonElement.click();
      expect(hostComponent.clickCount).toBe(0);

      // Disable loading
      hostComponent.loading = false;
      hostFixture.detectChanges();

      buttonElement.click();
      expect(hostComponent.clickCount).toBe(1);
    });
  });
});
