import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardInfoComponent } from './card-info.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { CardState } from '@ui/shared/model/card-info.model';
import { ActivatedRoute } from '@angular/router';

describe('CardInfoComponent', () => {
  let component: CardInfoComponent;
  let fixture: ComponentFixture<CardInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardInfoComponent, IconComponent, ButtonComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'test'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CardInfoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('text', 'Test text');
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should accept required inputs', () => {
    const title = 'Test Card Title';
    const text = 'Test card description';

    fixture.componentRef.setInput('title', title);
    fixture.componentRef.setInput('text', text);
    fixture.detectChanges();

    expect(component.title()).toBe(title);
    expect(component.text()).toBe(text);
  });

  it('should accept optional inputs', () => {
    const statusState: CardState = 'success';
    const linkText = 'Learn More';
    const linkAriaLabel = 'Learn more about this topic';
    const linkRoute = '/details';
    const additionalClass = 'custom-class';

    fixture.componentRef.setInput('title', 'Test');
    fixture.componentRef.setInput('text', 'Test text');
    fixture.componentRef.setInput('statusState', statusState);
    fixture.componentRef.setInput('linkText', linkText);
    fixture.componentRef.setInput('linkAriaLabel', linkAriaLabel);
    fixture.componentRef.setInput('linkRoute', linkRoute);
    fixture.componentRef.setInput('additionalClass', additionalClass);
    fixture.detectChanges();

    expect(component.statusState()).toBe(statusState);
    expect(component.linkText()).toBe(linkText);
    expect(component.linkAriaLabel()).toBe(linkAriaLabel);
    expect(component.linkRoute()).toBe(linkRoute);
    expect(component.additionalClass()).toBe(additionalClass);
  });

  describe('computedClass', () => {
    it('should return empty string when no statusState or additionalClass', () => {
      fixture.componentRef.setInput('title', 'Test');
      fixture.componentRef.setInput('text', 'Test text');
      fixture.detectChanges();

      expect(component.computedClass()).toBe('');
    });

    it('should return card-{statusState} when statusState is provided', () => {
      fixture.componentRef.setInput('title', 'Test');
      fixture.componentRef.setInput('text', 'Test text');
      fixture.componentRef.setInput('statusState', 'success');
      fixture.detectChanges();

      expect(component.computedClass()).toBe('card-success');
    });

    it('should return additionalClass when provided', () => {
      fixture.componentRef.setInput('title', 'Test');
      fixture.componentRef.setInput('text', 'Test text');
      fixture.componentRef.setInput('additionalClass', 'my-custom-class');
      fixture.detectChanges();

      expect(component.computedClass()).toBe('my-custom-class');
    });

    it('should combine statusState and additionalClass', () => {
      fixture.componentRef.setInput('title', 'Test');
      fixture.componentRef.setInput('text', 'Test text');
      fixture.componentRef.setInput('statusState', 'warning');
      fixture.componentRef.setInput('additionalClass', 'highlight');
      fixture.detectChanges();

      expect(component.computedClass()).toBe('card-warning highlight');
    });

    it('should handle all CardState values', () => {
      const cardStates: CardState[] = [
        'success',
        'warning',
        'error',
        'unknown'
      ];

      cardStates.forEach((state) => {
        fixture.componentRef.setInput('title', 'Test');
        fixture.componentRef.setInput('text', 'Test text');
        fixture.componentRef.setInput('statusState', state);
        fixture.detectChanges();

        expect(component.computedClass()).toBe(`card-${state}`);
      });
    });
  });
});
