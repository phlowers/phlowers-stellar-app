import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualSectionComponent } from './manualSection.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock child component
@Component({
  selector: 'app-supports-table',
  template: ''
})
class MockSupportsTableComponent {
  @Input() supports: Support[] = [];
  @Output() addSupport = new EventEmitter<{
    index: number;
    position: 'before' | 'after';
  }>();
  @Output() deleteSupport = new EventEmitter<string>();
  @Output() supportChange = new EventEmitter<{
    uuid: string;
    field: keyof Support;
    value: any;
  }>();
}

describe('ManualSectionComponent', () => {
  let component: ManualSectionComponent;
  let fixture: ComponentFixture<ManualSectionComponent>;
  let mockSection: Section;

  beforeEach(async () => {
    mockSection = {
      uuid: '1',
      internal_id: 'int1',
      name: 'Section 1',
      short_name: 'S1',
      created_at: '',
      updated_at: '',
      internal_catalog_id: '',
      type: 'guard',
      cable_name: '',
      cable_short_name: '',
      cables_amount: 1,
      optical_fibers_amount: 0,
      spans_amount: 0,
      begin_span_name: '',
      last_span_name: '',
      first_support_number: 1,
      last_support_number: 2,
      first_attachment_set: '',
      last_attachment_set: '',
      regional_maintenance_center_names: [],
      maintenance_center_names: [],
      gmr: '',
      eel: '',
      cm: '',
      link_name: '',
      lit: '',
      branch_name: '',
      electric_tension_level: '',
      supports: [],
      updatedAt: new Date(),
      initial_conditions: []
    };

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ManualSectionComponent,
        MockSupportsTableComponent,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualSectionComponent);
    component = fixture.componentInstance;
    // Patch the input() API for test
    (component.section as any) = () => mockSection;
    component.sectionChange = { emit: jest.fn() } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSupportsAmountChange', () => {
    it('should do nothing if amount equals current supports length', () => {
      mockSection.supports = [createSupportMock()];
      component.supportsAmount = 1;
      const event = { target: { value: '1' } };
      component.onSupportsAmountChange(event);
      expect(mockSection.supports.length).toBe(1);
    });

    it('should add supports if amount increases', () => {
      mockSection.supports = [];
      const event = { target: { value: '2' } };
      component.onSupportsAmountChange(event);
      expect(mockSection.supports.length).toBe(2);
    });

    it('should remove supports if amount decreases', () => {
      mockSection.supports = [
        createSupportMock(),
        createSupportMock(),
        createSupportMock()
      ];
      const event = { target: { value: '2' } };
      component.onSupportsAmountChange(event);
      expect(mockSection.supports.length).toBe(2);
    });
  });

  describe('addSupport', () => {
    it('should add a support before the given index', () => {
      mockSection.supports = [createSupportMock(), createSupportMock()];
      component.supportsAmount = 2;
      component.addSupport(1, 'before');
      expect(mockSection.supports.length).toBe(3);
    });
    it('should add a support after the given index', () => {
      mockSection.supports = [createSupportMock(), createSupportMock()];
      component.supportsAmount = 2;
      component.addSupport(0, 'after');
      expect(mockSection.supports.length).toBe(3);
    });
  });

  describe('deleteSupport', () => {
    it('should delete a support by uuid', () => {
      const s1 = createSupportMock();
      const s2 = createSupportMock();
      mockSection.supports = [s1, s2];
      component.deleteSupport(s1.uuid);
      expect(mockSection.supports.length).toBe(1);
      expect(mockSection.supports[0].uuid).toBe(s2.uuid);
    });
  });

  describe('onSupportChange', () => {
    it('should update the correct field of a support', () => {
      const s1 = createSupportMock();
      mockSection.supports = [s1];
      component.onSupportChange({
        uuid: s1.uuid,
        field: 'name',
        value: { name: 'newName' } as Support
      });
      expect(mockSection.supports[0].name).toMatchObject({ name: 'newName' });
    });
  });

  describe('onSectionChange', () => {
    it('should emit sectionChange with the section', () => {
      component.onSectionChange();
      expect(component.sectionChange.emit).toHaveBeenCalledWith(mockSection);
    });
  });
});

function createSupportMock(): Support {
  return {
    uuid: Math.random().toString(36).substring(2),
    number: null,
    name: null,
    spanLength: null,
    spanAngle: null,
    attachmentHeight: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null
  };
}
