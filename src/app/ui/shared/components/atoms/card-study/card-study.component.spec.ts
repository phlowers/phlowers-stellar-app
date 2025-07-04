import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardStudyComponent } from './card-study.component';
import { TagComponent } from '@ui/shared/components/atoms/tag/tag.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TagList } from '@ui/shared/model/card-study.model';

describe('CardStudyComponent', () => {
  let component: CardStudyComponent;
  let fixture: ComponentFixture<CardStudyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardStudyComponent, TagComponent, IconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardStudyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept and display required inputs', () => {
    const title = 'Test Study';
    const authorMail = 'test@example.com';
    const modificationDate = '2025-01-01';

    fixture.componentRef.setInput('title', title);
    fixture.componentRef.setInput('authorMail', authorMail);
    fixture.componentRef.setInput('modificationDate', modificationDate);
    fixture.detectChanges();

    expect(component.title()).toBe(title);
    expect(component.authorMail()).toBe(authorMail);
    expect(component.modificationDate()).toBe(modificationDate);
  });

  it('should handle empty tagList', () => {
    fixture.componentRef.setInput('title', 'Test');
    fixture.componentRef.setInput('authorMail', 'test@example.com');
    fixture.componentRef.setInput('modificationDate', '2025-01-01');
    fixture.detectChanges();

    expect(component.tagList()).toBeUndefined();
    const tagListElement = fixture.nativeElement.querySelector('ul');
    expect(tagListElement).toBeNull();
  });

  it('should display tags when tagList is provided', () => {
    const tagList: TagList[] = [
      { text: 'Tag 1', color: 'primary' },
      { text: 'Tag 2', color: 'success' }
    ];

    fixture.componentRef.setInput('title', 'Test');
    fixture.componentRef.setInput('authorMail', 'test@example.com');
    fixture.componentRef.setInput('modificationDate', '2025-01-01');
    fixture.componentRef.setInput('tagList', tagList);
    fixture.detectChanges();

    expect(component.tagList()).toEqual(tagList);
    const tagElements = fixture.nativeElement.querySelectorAll('app-tag');
    expect(tagElements.length).toBe(2);
  });

  it('should render icon components', () => {
    fixture.componentRef.setInput('title', 'Test');
    fixture.componentRef.setInput('authorMail', 'test@example.com');
    fixture.componentRef.setInput('modificationDate', '2025-01-01');
    fixture.detectChanges();

    const iconElements = fixture.nativeElement.querySelectorAll('app-icon');
    expect(iconElements.length).toBe(2);
  });
});
