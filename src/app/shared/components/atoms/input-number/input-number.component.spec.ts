import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { InputNumberComponent } from './input-number.component';

describe('InputNumberComponent', () => {
  let component: InputNumberComponent;
  let fixture: ComponentFixture<InputNumberComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputNumberComponent, ReactiveFormsModule]
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
      const cb = jest.fn();
      component.registerOnChange(cb);
      component.writeValue(50);
      // increment triggers onChange
      component.increment();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('registerOnTouched', () => {
    it('should store and call the onTouched callback', () => {
      const cb = jest.fn();
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
      const cb = jest.fn();
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
      const cb = jest.fn();
      component.registerOnTouched(cb);
      component.writeValue(100);
      component.decrement();
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('markTouched', () => {
    it('should call onTouched when not disabled', () => {
      const cb = jest.fn();
      component.registerOnTouched(cb);
      component.markTouched();
      expect(cb).toHaveBeenCalled();
    });

    it('should not call onTouched when disabled', () => {
      const cb = jest.fn();
      component.registerOnTouched(cb);
      component.setDisabledState(true);
      component.markTouched();
      expect(cb).not.toHaveBeenCalled();
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
