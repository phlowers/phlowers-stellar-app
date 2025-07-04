import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagComponent } from './tag.component';
import { TagColor } from '@ui/shared/model/tags.model';

describe('TagComponent', () => {
  let component: TagComponent;
  let fixture: ComponentFixture<TagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TagComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default type as neutral', () => {
    fixture.componentRef.setInput('text', 'Test Tag');
    fixture.detectChanges();

    expect(component.type()).toBe('neutral');
  });

  it('should accept custom type input', () => {
    const customType: TagColor = 'primary';
    fixture.componentRef.setInput('text', 'Test Tag');
    fixture.componentRef.setInput('type', customType);
    fixture.detectChanges();

    expect(component.type()).toBe('primary');
  });

  it('should accept text input', () => {
    const testText = 'My Tag Text';
    fixture.componentRef.setInput('text', testText);
    fixture.detectChanges();

    expect(component.text()).toBe(testText);
  });
});
