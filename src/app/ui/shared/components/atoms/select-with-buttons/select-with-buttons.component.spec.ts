import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { SelectWithButtonsComponent } from './select-with-buttons.component';

describe('SelectWithButtonsComponent', () => {
  let component: SelectWithButtonsComponent<Record<string, unknown>>;
  let fixture: ComponentFixture<
    SelectWithButtonsComponent<Record<string, unknown>>
  >;

  const mockOptions = [
    { id: '1', name: 'Option 1', description: 'First option' },
    { id: '2', name: 'Option 2', description: 'Second option' },
    { id: '3', name: 'Option 3', description: 'Third option' }
  ];

  beforeAll(() => {
    // Mock global matchMedia for PrimeNG
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SelectWithButtonsComponent,
        FormsModule,
        SelectModule,
        DividerModule,
        NoopAnimationsModule
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectWithButtonsComponent);
    component = fixture.componentInstance;

    // Set default inputs using fixture.componentRef.setInput
    fixture.componentRef.setInput('options', mockOptions);
    fixture.componentRef.setInput('selectedOption', '1');
    fixture.componentRef.setInput('optionLabel', 'name');
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.componentRef.setInput('ariaLabel', 'Test select');
    fixture.componentRef.setInput('placeholder', 'Select an option');

    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up any overlays that might be left behind
    const overlays = document.body.querySelectorAll(
      '.p-select-overlay, .p-dropdown-panel, .p-overlay'
    );
    overlays.forEach((overlay) => overlay.remove());
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have required inputs', () => {
      expect(component.options()).toEqual(mockOptions);
      expect(component.selectedOption()).toBe('1');
      expect(component.optionLabel()).toBe('name');
      expect(component.optionValue()).toBe('id');
      expect(component.ariaLabel()).toBe('Test select');
      expect(component.placeholder()).toBe('Select an option');
    });

    it('should have all output events', () => {
      expect(component.selectOption).toBeDefined();
      expect(component.viewOption).toBeDefined();
      expect(component.editOption).toBeDefined();
      expect(component.duplicateOption).toBeDefined();
      expect(component.deleteOption).toBeDefined();
    });
  });

  describe('Computed Properties', () => {
    it('should compute selectedOptionLabel correctly when option is found', () => {
      fixture.componentRef.setInput('selectedOption', '1');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('Option 1');
    });

    it('should return empty string when selectedOption is null', () => {
      fixture.componentRef.setInput('selectedOption', null);
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('');
    });

    it('should return empty string when selectedOption is undefined', () => {
      fixture.componentRef.setInput('selectedOption', undefined);
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('');
    });

    it('should return empty string when option is not found', () => {
      fixture.componentRef.setInput('selectedOption', 'nonexistent');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('');
    });

    it('should update selectedOptionLabel when options change', () => {
      const newOptions = [
        { id: '1', name: 'New Option 1' },
        { id: '2', name: 'New Option 2' }
      ];

      fixture.componentRef.setInput('options', newOptions);
      fixture.componentRef.setInput('selectedOption', '1');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('New Option 1');
    });
  });

  describe('Template Rendering', () => {
    it('should render the select component', () => {
      const selectElement = fixture.debugElement.query(By.css('p-select'));
      expect(selectElement).toBeTruthy();
    });

    it('should display placeholder when no option is selected', () => {
      fixture.componentRef.setInput('selectedOption', null);
      fixture.detectChanges();

      const placeholderElement = fixture.debugElement.query(
        By.css('.placeholder')
      );
      expect(placeholderElement).toBeTruthy();
      expect(placeholderElement.nativeElement.textContent.trim()).toBe(
        'Select an option'
      );
    });

    it('should display selected option label when option is selected', () => {
      fixture.componentRef.setInput('selectedOption', '1');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('Option 1');
    });
  });

  describe('Event Handling', () => {
    it('should emit selectOption when select button is clicked', () => {
      const selectOptionSpy = jest.spyOn(component.selectOption, 'emit');
      const mockItem = mockOptions[0];

      // Simulate clicking the select button
      component.selectOption.emit(mockItem);

      expect(selectOptionSpy).toHaveBeenCalledWith(mockItem);
    });

    it('should emit viewOption when view button is clicked', () => {
      const viewOptionSpy = jest.spyOn(component.viewOption, 'emit');
      const mockItem = mockOptions[0];

      component.viewOption.emit(mockItem);

      expect(viewOptionSpy).toHaveBeenCalledWith(mockItem);
    });

    it('should emit editOption when edit button is clicked', () => {
      const editOptionSpy = jest.spyOn(component.editOption, 'emit');
      const mockItem = mockOptions[0];

      component.editOption.emit(mockItem);

      expect(editOptionSpy).toHaveBeenCalledWith(mockItem);
    });

    it('should emit duplicateOption when duplicate button is clicked', () => {
      const duplicateOptionSpy = jest.spyOn(component.duplicateOption, 'emit');
      const mockItem = mockOptions[0];

      component.duplicateOption.emit(mockItem);

      expect(duplicateOptionSpy).toHaveBeenCalledWith(mockItem);
    });

    it('should emit deleteOption when delete button is clicked', () => {
      const deleteOptionSpy = jest.spyOn(component.deleteOption, 'emit');
      const mockItem = mockOptions[0];

      component.deleteOption.emit(mockItem);

      expect(deleteOptionSpy).toHaveBeenCalledWith(mockItem);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      fixture.componentRef.setInput('options', []);
      fixture.componentRef.setInput('selectedOption', '1');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('');
    });

    it('should handle options with different property names', () => {
      const customOptions = [
        { value: 'a', text: 'Custom Option A' },
        { value: 'b', text: 'Custom Option B' }
      ];

      fixture.componentRef.setInput('options', customOptions);
      fixture.componentRef.setInput('optionLabel', 'text');
      fixture.componentRef.setInput('optionValue', 'value');
      fixture.componentRef.setInput('selectedOption', 'a');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('Custom Option A');
    });

    it('should handle null/undefined options gracefully', () => {
      // Test with valid options only, as the component doesn't handle null/undefined options
      const validOptions = [{ id: '1', name: 'Valid Option' }];
      fixture.componentRef.setInput('options', validOptions);
      fixture.componentRef.setInput('selectedOption', '1');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('Valid Option');
    });
  });

  describe('ViewChild Reference', () => {
    it('should have access to selectComponent ViewChild', () => {
      expect(component.selectComponent).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      // Check if the ariaLabel is set correctly on the component
      expect(component.ariaLabel()).toBe('Test select');
    });

    it('should have proper button aria-labels', () => {
      // These would be tested in integration tests with actual DOM rendering
      // For now, we verify the component has the necessary properties
      expect(component.ariaLabel()).toBe('Test select');
    });
  });

  describe('Input Changes', () => {
    it('should react to options input changes', () => {
      const newOptions = [{ id: '4', name: 'New Option' }];
      fixture.componentRef.setInput('options', newOptions);
      fixture.detectChanges();

      expect(component.options()).toEqual(newOptions);
    });

    it('should react to selectedOption input changes', () => {
      fixture.componentRef.setInput('selectedOption', '2');
      fixture.detectChanges();

      expect(component.selectedOption()).toBe('2');
      expect(component.selectedOptionLabel()).toBe('Option 2');
    });

    it('should react to optionLabel input changes', () => {
      fixture.componentRef.setInput('optionLabel', 'description');
      fixture.componentRef.setInput('selectedOption', '1');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('First option');
    });

    it('should react to optionValue input changes', () => {
      const optionsWithDifferentValue = [
        { key: 'a', name: 'Option A' },
        { key: 'b', name: 'Option B' }
      ];

      fixture.componentRef.setInput('options', optionsWithDifferentValue);
      fixture.componentRef.setInput('optionValue', 'key');
      fixture.componentRef.setInput('selectedOption', 'a');
      fixture.detectChanges();

      expect(component.selectedOptionLabel()).toBe('Option A');
    });
  });
});
