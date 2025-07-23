import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualSectionComponent } from './manualSection.component';
import { FormsModule } from '@angular/forms';
import { SupportsTableComponent } from './supportsTable/supportsTable.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

describe('ManualSectionComponent', () => {
  let component: ManualSectionComponent;
  let fixture: ComponentFixture<ManualSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ManualSectionComponent,
        SupportsTableComponent,
        NoopAnimationsModule
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSupportsAmountChange', () => {
    it('should do nothing if amount equals current supports length', () => {
      component.section.supports = [{ uuid: '1' } as any, { uuid: '2' } as any];
      const event = { target: { value: '2' } };
      component.onSupportsAmountChange(event);
      expect(component.section.supports.length).toBe(2);
    });

    it('should add supports if amount is greater', () => {
      component.section.supports = [{ uuid: '1' } as any];
      const event = { target: { value: '3' } };
      component.onSupportsAmountChange(event);
      expect(component.section.supports.length).toBe(3);
      expect(component.section.supports[1].uuid).toBe('mock-uuid');
      expect(component.section.supports[2].uuid).toBe('mock-uuid');
    });

    it('should remove supports if amount is less', () => {
      component.section.supports = [
        { uuid: '1' } as any,
        { uuid: '2' } as any,
        { uuid: '3' } as any
      ];
      const event = { target: { value: '2' } };
      component.onSupportsAmountChange(event);
      expect(component.section.supports.length).toBe(2);
    });
  });

  describe('addSupport', () => {
    it('should add a support before the given index', () => {
      component.section.supports = [{ uuid: '1' } as any, { uuid: '2' } as any];
      component.addSupport(1, 'before');
      expect(component.section.supports.length).toBe(3);
      expect(component.section.supports[1].uuid).toBe('mock-uuid');
    });

    it('should add a support after the given index', () => {
      component.section.supports = [{ uuid: '1' } as any, { uuid: '2' } as any];
      component.addSupport(0, 'after');
      expect(component.section.supports.length).toBe(3);
      expect(component.section.supports[1].uuid).toBe('mock-uuid');
    });
  });

  describe('deleteSupport', () => {
    it('should delete a support by uuid', () => {
      component.section.supports = [{ uuid: '1' } as any, { uuid: '2' } as any];
      component.deleteSupport('1');
      expect(component.section.supports.length).toBe(1);
      expect(component.section.supports[0].uuid).toBe('2');
    });
  });

  describe('onSupportChange', () => {
    it('should update the field of the correct support', () => {
      component.section.supports = [
        { uuid: '1', name: 'A' } as any,
        { uuid: '2', name: 'B' } as any
      ];
      component.onSupportChange({ uuid: '2', field: 'name', value: 'C' });
      expect(component.section.supports[1].name).toBe('C');
    });
  });

  describe('onVisibleChange', () => {
    it('should emit false when visible is false', () => {
      const emitSpy = jest.spyOn(component.isOpenChange, 'emit');
      component.onVisibleChange(false);
      expect(emitSpy).toHaveBeenCalledWith(false);
    });
    it('should not emit when visible is true', () => {
      const emitSpy = jest.spyOn(component.isOpenChange, 'emit');
      component.onVisibleChange(true);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
