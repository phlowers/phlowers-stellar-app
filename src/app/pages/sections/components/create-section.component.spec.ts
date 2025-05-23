import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CreateSectionComponent } from './create-section.component';
import { StorageService } from '../../../core/store/storage.service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { Component } from '@angular/core';

// Host component for testing output events
@Component({
  standalone: true,
  imports: [CreateSectionComponent],
  template: ` <app-create-section (save)="onSave($event)" (cancel)="onCancel()">
  </app-create-section>`
})
class TestHostComponent {
  savedSection: any;
  cancelCalled = false;

  onSave(section: any) {
    this.savedSection = section;
  }

  onCancel() {
    this.cancelCalled = true;
  }
}

describe('CreateSectionComponent', () => {
  let component: CreateSectionComponent;
  let fixture: ComponentFixture<CreateSectionComponent>;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let mockMessageService: { add: jest.Mock };
  let mockStorageService: any;

  beforeEach(async () => {
    // Create mocks for the services
    mockMessageService = {
      add: jest.fn()
    };

    // Mock database with test data
    const mockDb = {
      regional_maintenance_centers: {
        where: jest.fn().mockReturnValue({
          equals: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              {
                name: 'Test Region',
                maintenance_center_names: ['Center A', 'Center B']
              }
            ])
          })
        }),
        toArray: jest
          .fn()
          .mockResolvedValue([{ name: 'Region 1' }, { name: 'Region 2' }])
      },
      maintenance_centers: {
        toArray: jest
          .fn()
          .mockResolvedValue([{ name: 'Center 1' }, { name: 'Center 2' }])
      }
    };

    mockStorageService = {
      db: mockDb,
      ready$: of(true)
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        DropdownModule,
        InputNumberModule,
        ToastModule,
        RippleModule,
        CreateSectionComponent,
        TestHostComponent // Moved from declarations to imports
      ],
      providers: [
        FormBuilder,
        { provide: MessageService, useValue: mockMessageService },
        { provide: StorageService, useValue: mockStorageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSectionComponent);
    component = fixture.componentInstance;

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;

    fixture.detectChanges();
    hostFixture.detectChanges();
  });

  // ... rest of tests remain the same
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.sectionForm).toBeDefined();
    expect(component.sectionForm.get('internal_id')).toBeDefined();
    expect(component.sectionForm.get('name')).toBeDefined();
    expect(component.sectionForm.get('short_name')).toBeDefined();
    expect(component.sectionForm.get('type')).toBeDefined();

    // Default numeric values should be 0
    component.show();
    expect(component.sectionForm.get('cables_amount')?.value).toBe(0);
    expect(component.sectionForm.get('optical_fibers_amount')?.value).toBe(0);
    expect(component.sectionForm.get('spans_amount')?.value).toBe(0);
  });

  it('should load regional maintenance centers on initialization', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(
      mockStorageService.db.regional_maintenance_centers.toArray
    ).toHaveBeenCalled();
    expect(component.regionalMaintenanceCenters()).toEqual([
      'Region 1',
      'Region 2'
    ]);
  }));

  it('should load maintenance centers for selected regional center', fakeAsync(() => {
    const event = { value: 'Test Region' };
    component.onRegionalMaintenanceCenterChange(event);
    tick();

    expect(
      mockStorageService.db.regional_maintenance_centers.where
    ).toHaveBeenCalledWith('name');
    expect(component.maintenanceCenters()).toEqual(['Center 1', 'Center 2']);
  }));

  it('should mark form invalid when required fields are empty', () => {
    component.show();
    expect(component.sectionForm.valid).toBeFalsy();
  });

  it('should mark form valid when all required fields are filled', () => {
    component.show();
    component.sectionForm.patchValue({
      internal_id: 'ID123',
      name: 'Test Section',
      short_name: 'TS',
      type: 'phase'
    });

    expect(component.sectionForm.valid).toBeTruthy();
  });

  // it('should not submit when form is invalid', () => {
  //   jest.spyOn(component.save, 'emit');
  //   component.show();
  //   component.onSubmit();

  //   expect(mockMessageService.add).toHaveBeenCalledWith({
  //     severity: 'error',
  //     summary: 'Form Error',
  //     detail: 'Please correct all errors before submitting.'
  //   });
  //   expect(component.save.emit).not.toHaveBeenCalled();
  // });

  // it('should submit and emit save event when form is valid', () => {
  //   jest.spyOn(component.save, 'emit');
  //   component.show();
  //   component.sectionForm.patchValue({
  //     internal_id: 'ID123',
  //     name: 'Test Section',
  //     short_name: 'TS',
  //     type: 'phase'
  //   });

  //   component.onSubmit();

  //   expect(component.save.emit).toHaveBeenCalled();
  //   const emittedSection = component.save.emit.mock.calls[0][0];
  //   expect(emittedSection.uuid).toBeDefined();
  //   expect(emittedSection.internal_id).toBe('ID123');
  //   expect(emittedSection.name).toBe('Test Section');
  //   expect(emittedSection.short_name).toBe('TS');
  //   expect(emittedSection.type).toBe('phase');

  //   expect(mockMessageService.add).toHaveBeenCalledWith({
  //     severity: 'success',
  //     summary: 'Success',
  //     detail: 'Section created successfully'
  //   });
  //   expect(component.visible).toBe(false);
  // });

  it('should hide dialog and emit cancel event when cancel is clicked', () => {
    jest.spyOn(component.cancel, 'emit');
    component.show();
    expect(component.visible).toBe(true);

    component.onCancel();

    expect(component.visible).toBe(false);
    expect(component.cancel.emit).toHaveBeenCalled();
  });

  it('should show and hide dialog correctly', () => {
    expect(component.visible).toBe(false);

    component.show();
    expect(component.visible).toBe(true);

    component.hide();
    expect(component.visible).toBe(false);
  });

  it('should reset form when dialog is shown', () => {
    component.sectionForm.patchValue({
      internal_id: 'ID123',
      name: 'Test Section'
    });

    component.show();

    expect(component.sectionForm.get('internal_id')?.value).toBe(null);
    expect(component.sectionForm.get('name')?.value).toBe(null);
    expect(component.sectionForm.get('cables_amount')?.value).toBe(0);
  });

  // Testing with the host component
  it('should emit save event to parent component', () => {
    const createSectionComponent =
      hostFixture.debugElement.children[0].componentInstance;
    createSectionComponent.show();
    createSectionComponent.sectionForm.patchValue({
      internal_id: 'ID123',
      name: 'Test Section',
      short_name: 'TS',
      type: 'phase'
    });

    createSectionComponent.onSubmit();

    expect(hostComponent.savedSection).toBeDefined();
    expect(hostComponent.savedSection.internal_id).toBe('ID123');
  });

  it('should emit cancel event to parent component', () => {
    const createSectionComponent =
      hostFixture.debugElement.children[0].componentInstance;
    createSectionComponent.show();
    createSectionComponent.onCancel();

    expect(hostComponent.cancelCalled).toBe(true);
  });
});
