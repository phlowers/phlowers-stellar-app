import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { StudyHeaderComponent } from './study-header.component';

describe('StudyHeader', () => {
  let component: StudyHeaderComponent;
  let fixture: ComponentFixture<StudyHeaderComponent>;
  let mockMessageService: jest.Mocked<MessageService>;

  beforeEach(async () => {
    mockMessageService = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;
    await TestBed.configureTestingModule({
      imports: [StudyHeaderComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MessageService, useValue: mockMessageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('study', null);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleActiveDetail', () => {
    it('should open detail when initially closed', () => {
      expect(component.isDetailOpen()).toBe(false);
      expect(component.activeDetail()).toBe('');

      component.toggleActiveDetail();

      expect(component.isDetailOpen()).toBe(true);
      expect(component.activeDetail()).toBe('0');
    });

    it('should close detail when already open', () => {
      component.isDetailOpen.set(true);
      component.activeDetail.set('0');

      component.toggleActiveDetail();
      expect(component.isDetailOpen()).toBe(false);
      expect(component.activeDetail()).toBe('');
    });
  });

  describe('outputs', () => {
    it('should emit duplicateStudy', () => {
      const spy = jest.spyOn(component.duplicateStudy, 'emit');

      component.duplicateStudy.emit('uuid-123');
      expect(spy).toHaveBeenCalledWith('uuid-123');
    });

    it('should emit openModifyStudyModal', () => {
      const spy = jest.spyOn(component.openModifyStudyModal, 'emit');

      component.openModifyStudyModal.emit();
      expect(spy).toHaveBeenCalled();
    });
  });
});
