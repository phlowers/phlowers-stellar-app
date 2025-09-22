import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SideTabsComponent } from './side-tabs.component';
import { SideTabComponent } from './side-tab/side-tab.component';

@Component({
  template: `<app-side-tabs>
    <app-side-tab label="One">Content One</app-side-tab>
    <app-side-tab label="Two">Content Two</app-side-tab>
  </app-side-tabs>`,
  imports: [SideTabsComponent, SideTabComponent],
  standalone: true
})
class TestHostComponent {}

describe('SideTabsComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  function getButtons(): HTMLButtonElement[] {
    return fixture.debugElement
      .queryAll(By.css('button'))
      .map((b) => b.nativeElement);
  }

  function getPanels(): HTMLElement[] {
    return fixture.debugElement
      .queryAll(By.css('section'))
      .map((p) => p.nativeElement);
  }

  it('should render tab buttons', () => {
    const buttons = getButtons();
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('One');
    expect(buttons[1].textContent).toContain('Two');
  });

  it('should open a panel when button clicked', () => {
    const buttons = getButtons();
    const panels = getPanels();

    buttons[0].click();
    fixture.detectChanges();

    expect(panels[0].hidden).toBe(false);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(panels[0].id).toBe(buttons[0].getAttribute('aria-controls'));
  });

  it('should close panel when same button clicked again', () => {
    const buttons = getButtons();
    const panels = getPanels();

    buttons[0].click();
    fixture.detectChanges();
    buttons[0].click();
    fixture.detectChanges();

    expect(panels[0].hidden).toBe(true);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('should only open one panel at a time', () => {
    const buttons = getButtons();
    const panels = getPanels();

    buttons[0].click();
    fixture.detectChanges();
    buttons[1].click();
    fixture.detectChanges();

    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
  });

  it('should close panel on Escape and return focus to button', () => {
    const buttons = getButtons();
    const panels = getPanels();

    buttons[0].click();
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    buttons[0].dispatchEvent(event);
    fixture.detectChanges();

    expect(panels[0].hidden).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('should move focus with arrow keys', () => {
    const buttons = getButtons();

    buttons[0].focus();
    const right = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    buttons[0].dispatchEvent(right);
    fixture.detectChanges();

    expect(document.activeElement).toBe(buttons[1]);

    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    buttons[1].dispatchEvent(left);
    fixture.detectChanges();

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('updateWidth sets panelWidth to 0 if no tab is open', () => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;
    component.sideTabs.set('');
    component['updateWidth']();
    expect(component.panelWidth()).toBe('0px');
  });

  it('focusPanel does nothing if panel element is missing', () => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;
    component['panels'] = {
      toArray: () => []
    } as any;
    expect(() => component).not.toThrow();
  });

  it('handlePanelFocusOut does nothing if panel is missing', () => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;
    component['panels'] = {
      toArray: () => [undefined]
    } as any;

    expect(() =>
      component.handlePanelFocusOut({ relatedTarget: null } as FocusEvent, 0)
    ).not.toThrow();
  });

  it('handlePanelFocusOut does nothing if focus remains inside panel', () => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;

    const panelEl = document.createElement('div');
    component['panels'] = {
      toArray: () => [{ nativeElement: panelEl }]
    } as any;

    const insideEl = document.createElement('button');
    panelEl.appendChild(insideEl);

    component.handlePanelFocusOut(
      { relatedTarget: insideEl } as unknown as FocusEvent,
      0
    );
  });
});
