import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { InputNumberComponent } from './input-number.component';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('InputNumberComponent', () => {
  let component: InputNumberComponent;
  let fixture: ComponentFixture<InputNumberComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),InputNumberComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InputNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('HTML rendering', () => {
    it('should render the number input', () => {
      const el = getByTestId('number-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render the decrement button', () => {
      const el = getByTestId('decrement-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render the increment button', () => {
      const el = getByTestId('increment-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });

  describe('writeValue', () => {
    it('should set null value', () => {
      component.writeValue(null);
      expect(component.pointsCountControl.value).toBeNull();
      expect(component.pointsCountValue()).toBeNull();
    });

    it('should set a valid number', () => {
      component.writeValue(100);
      expect(component.pointsCountControl.value).toBe(100);
      expect(component.pointsCountValue()).toBe(100);
    });

    it('should clamp value to min', () => {
      component.writeValue(0);
      expect(component.pointsCountValue()).toBe(component.min());
    });

    it('should clamp value to max', () => {
      component.writeValue(9999);
      expect(component.pointsCountValue()).toBe(component.max());
    });
  });

  describe('registerOnChange', () => {
    it('should store and call the onChange callback', () => {
      const cb = vi.fn();
      component.registerOnChange(cb);
      component.writeValue(50);
      // increment triggers onChange
      component.increment();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('valueChanges clamping', () => {
    it('should propagate the clamped value via onChange when value exceeds max', () => {
      const cb = vi.fn();
      component.registerOnChange(cb);
      component.pointsCountControl.setValue(9999);
      expect(cb).toHaveBeenCalledWith(component.max());
      expect(cb).not.toHaveBeenCalledWith(9999);
    });

    it('should propagate the clamped value via onChange when value is below min', () => {
      const cb = vi.fn();
      component.registerOnChange(cb);
      component.pointsCountControl.setValue(0);
      expect(cb).toHaveBeenCalledWith(component.min());
    });

    it('should correct the control value back to max when out of range', () => {
      component.pointsCountControl.setValue(9999);
      expect(component.pointsCountControl.value).toBe(component.max());
    });

    it('should set the signal to the clamped value', () => {
      component.pointsCountControl.setValue(9999);
      expect(component.pointsCountValue()).toBe(component.max());
    });

    it('should propagate an in-range value unchanged', () => {
      const cb = vi.fn();
      component.registerOnChange(cb);
      component.pointsCountControl.setValue(100);
      expect(cb).toHaveBeenCalledWith(100);
    });
  });

  describe('registerOnTouched', () => {
    it('should store and call the onTouched callback', () => {
      const cb = vi.fn();
      component.registerOnTouched(cb);
      component.markTouched();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('setDisabledState', () => {
    it('should disable the component and form control', () => {
      component.setDisabledState(true);
      expect(component.disabled()).toBe(true);
      expect(component.pointsCountControl.disabled).toBe(true);
    });

    it('should enable the component and form control', () => {
      component.setDisabledState(true);
      component.setDisabledState(false);
      expect(component.disabled()).toBe(false);
      expect(component.pointsCountControl.enabled).toBe(true);
    });
  });

  describe('increment', () => {
    it('should increase value when below max', () => {
      component.writeValue(100);
      component.increment();
      expect(component.pointsCountValue()).toBe(101);
    });

    it('should not increase value when at max', () => {
      component.writeValue(component.max());
      component.increment();
      expect(component.pointsCountValue()).toBe(component.max());
    });

    it('should do nothing when disabled', () => {
      component.writeValue(100);
      component.setDisabledState(true);
      component.increment();
      expect(component.pointsCountValue()).toBe(100);
    });

    it('should call onTouched', () => {
      const cb = vi.fn();
      component.registerOnTouched(cb);
      component.writeValue(100);
      component.increment();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('decrement', () => {
    it('should decrease value when above min', () => {
      component.writeValue(100);
      component.decrement();
      expect(component.pointsCountValue()).toBe(99);
    });

    it('should not decrease value when at min', () => {
      component.writeValue(component.min());
      component.decrement();
      expect(component.pointsCountValue()).toBe(component.min());
    });

    it('should do nothing when disabled', () => {
      component.writeValue(100);
      component.setDisabledState(true);
      component.decrement();
      expect(component.pointsCountValue()).toBe(100);
    });

    it('should call onTouched', () => {
      const cb = vi.fn();
      component.registerOnTouched(cb);
      component.writeValue(100);
      component.decrement();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('markTouched', () => {
    it('should call onTouched when not disabled', () => {
      const cb = vi.fn();
      component.registerOnTouched(cb);
      component.markTouched();
      expect(cb).toHaveBeenCalled();
    });

    it('should not call onTouched when disabled', () => {
      const cb = vi.fn();
      component.registerOnTouched(cb);
      component.setDisabledState(true);
      component.markTouched();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('step input', () => {
    it('should increment by the configured step', () => {
      fixture.componentRef.setInput('step', 5);
      component.writeValue(100);
      component.increment();
      expect(component.pointsCountValue()).toBe(105);
    });

    it('should decrement by the configured step', () => {
      fixture.componentRef.setInput('step', 5);
      component.writeValue(100);
      component.decrement();
      expect(component.pointsCountValue()).toBe(95);
    });

    it('should set the step attribute on the input element', () => {
      fixture.componentRef.setInput('step', 10);
      fixture.detectChanges();
      expect(getByTestId('number-input')?.getAttribute('step')).toBe('10');
    });

    it('should not produce floating-point artifacts when incrementing with a fractional step', () => {
      fixture.componentRef.setInput('step', 0.01);
      fixture.componentRef.setInput('min', 0);
      fixture.componentRef.setInput('max', 1);
      component.writeValue(0.02);
      component.increment();
      // 0.02 + 0.01 in raw JS = 0.030000000000000002
      expect(component.pointsCountValue()).toBe(0.03);
    });

    it('should not produce floating-point artifacts when decrementing with a fractional step', () => {
      fixture.componentRef.setInput('step', 0.1);
      fixture.componentRef.setInput('min', 0);
      fixture.componentRef.setInput('max', 1);
      component.writeValue(0.3);
      component.decrement();
      // 0.3 - 0.1 in raw JS = 0.19999999999999998
      expect(component.pointsCountValue()).toBe(0.2);
    });

    it('should stay precise across consecutive increments with a fractional step', () => {
      fixture.componentRef.setInput('step', 0.01);
      fixture.componentRef.setInput('min', 0);
      fixture.componentRef.setInput('max', 1);
      component.writeValue(0.01);
      component.increment(); // → 0.02
      component.increment(); // → 0.03
      expect(component.pointsCountValue()).toBe(0.03);
    });
  });

  describe('isReadonly input', () => {
    it('should have the readonly attribute by default', () => {
      expect(getByTestId('number-input')?.hasAttribute('readonly')).toBe(true);
    });

    it('should remove the readonly attribute when isReadonly is false', () => {
      fixture.componentRef.setInput('isReadonly', false);
      fixture.detectChanges();
      expect(getByTestId('number-input')?.hasAttribute('readonly')).toBe(false);
    });
  });

  describe('computed signals', () => {
    it('isAtMin should be true when value equals min', () => {
      component.writeValue(component.min());
      expect(component.isAtMin()).toBe(true);
    });

    it('isAtMin should be false when value is above min', () => {
      component.writeValue(component.min() + 1);
      expect(component.isAtMin()).toBe(false);
    });

    it('isAtMax should be true when value equals max', () => {
      component.writeValue(component.max());
      expect(component.isAtMax()).toBe(true);
    });

    it('isAtMax should be false when value is below max', () => {
      component.writeValue(component.max() - 1);
      expect(component.isAtMax()).toBe(false);
    });
  });
});
