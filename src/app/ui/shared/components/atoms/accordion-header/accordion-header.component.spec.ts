import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AccordionHeaderComponent } from './accordion-header.component';
import { AccordionModule } from 'primeng/accordion';

@Component({
  standalone: true,
  imports: [AccordionModule, AccordionHeaderComponent],
  template: `
    <p-accordion>
      <p-accordion-panel>
        <app-accordion-header>
          <span data-testid="projected-content">Test Content</span>
        </app-accordion-header>
      </p-accordion-panel>
    </p-accordion>
  `
})
class TestHostComponent {}

describe('Accordion header', () => {
  let component: AccordionHeaderComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const debugElement: DebugElement = fixture.debugElement.query(
      By.directive(AccordionHeaderComponent)
    );
    component = debugElement.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should project content', () => {
    const projectedContent = fixture.nativeElement.querySelector(
      '[data-testid="projected-content"]'
    );
    expect(projectedContent).toBeTruthy();
    expect(projectedContent.textContent.trim()).toBe('Test Content');
  });
});
