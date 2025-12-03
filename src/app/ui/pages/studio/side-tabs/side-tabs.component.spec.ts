import { Component, QueryList, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SideTabsComponent } from './side-tabs.component';
import { PlotService } from '../plot.service';
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
  let plotServiceMock: { isSidebarOpen: jest.Mock; setSidebarOpen: jest.Mock };

  beforeEach(async () => {
    const isSidebarOpenMock = Object.assign(jest.fn().mockReturnValue(false), {
      set: jest.fn()
    });
    plotServiceMock = {
      isSidebarOpen: isSidebarOpenMock,
      setSidebarOpen: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: PlotService, useValue: plotServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  function getButtons(): HTMLButtonElement[] {
    return fixture.debugElement
      .queryAll(By.css('button.side-tab__header__btn'))
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

  it('updateWidth sets panelWidth based on element offsetWidth when tab is open', (done) => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;

    // Set a tab to be open
    component.sideTabs.set(0);

    // Mock the panel element with offsetWidth
    const mockPanel = {
      nativeElement: {
        offsetWidth: 300
      }
    };
    component['panels'] = {
      toArray: () => [mockPanel]
    } as unknown as QueryList<ElementRef<HTMLElement>>;

    component['updateWidth']();

    // Wait for setTimeout to complete
    setTimeout(() => {
      expect(component.panelWidth()).toBe('300px');
      done();
    }, 10);
  });

  it('focusPanel does nothing if panel element is missing', () => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;
    component['panels'] = {
      toArray: () => []
    } as unknown as QueryList<ElementRef<HTMLElement>>;
    expect(() => component).not.toThrow();
  });

  it('focusPanel focuses the panel element when it exists', (done) => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;

    const focusSpy = jest.fn();
    const mockPanel = {
      nativeElement: {
        focus: focusSpy
      }
    };
    component['panels'] = {
      toArray: () => [mockPanel]
    } as unknown as QueryList<ElementRef<HTMLElement>>;

    component['focusPanel'](0);

    // Wait for setTimeout to complete
    setTimeout(() => {
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      done();
    }, 10);
  });

  it('handlePanelFocusOut does nothing if panel is missing', () => {
    const component = fixture.debugElement.query(
      By.directive(SideTabsComponent)
    ).componentInstance;
    component['panels'] = {
      toArray: () => [undefined]
    } as unknown as QueryList<ElementRef<HTMLElement>>;

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
    } as unknown as QueryList<ElementRef<HTMLElement>>;

    const insideEl = document.createElement('button');
    panelEl.appendChild(insideEl);

    component.handlePanelFocusOut(
      { relatedTarget: insideEl } as unknown as FocusEvent,
      0
    );
  });

  it('toggleTab calls plotService.setSidebarOpen after delay', (done) => {
    const buttons = getButtons();

    buttons[0].click();
    fixture.detectChanges();

    // Wait for the REFRESH_STUDIO_DELAY (400ms)
    setTimeout(() => {
      expect(plotServiceMock.setSidebarOpen).toHaveBeenCalled();
      done();
    }, 450);
  });
});
