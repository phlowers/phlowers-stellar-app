import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
import { Component } from '@angular/core';

// Test host component to test the CardComponent with different inputs
@Component({
  template: `<app-card [role]="testRole">Test Content</app-card>`,
  standalone: true,
  imports: [CardComponent]
})
class TestHostComponent {
  testRole = 'button';
}

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent, TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('input signal "role"', () => {
    it('should accept input', () => {
      fixture.componentRef.setInput('role', 'article');
      expect(component.role()).toBe('article');
    });
  });

  describe('tabIndexValue computed', () => {
    it('should return "0" for interactive roles (button and link)', () => {
      fixture.componentRef.setInput('role', 'button');
      expect(component.tabIndexValue()).toBe('0');

      fixture.componentRef.setInput('role', 'link');
      expect(component.tabIndexValue()).toBe('0');
    });

    it('should return null for non-interactive roles', () => {
      const nonInteractiveRoles = [
        'dialog',
        'generic',
        'presentation',
        'custom-role',
        'main',
        'article'
      ];

      nonInteractiveRoles.forEach((role) => {
        fixture.componentRef.setInput('role', role);
        expect(component.tabIndexValue()).toBeNull();
      });
    });
  });

  describe('content projection', () => {
    it('should project content', () => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostComponent.testRole = 'button';
      hostFixture.detectChanges();

      const cardElement = hostFixture.debugElement.query(
        (debugEl) => debugEl.componentInstance instanceof CardComponent
      ).nativeElement;

      expect(cardElement.textContent.trim()).toBe('Test Content');
    });
  });
});
