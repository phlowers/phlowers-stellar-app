import {
  afterNextRender,
  Component,
  ContentChildren,
  ElementRef,
  QueryList,
  signal,
  ViewChildren
} from '@angular/core';
import { SideTabComponent } from './side-tab/side-tab.component';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-side-tabs',
  imports: [NgTemplateOutlet],
  templateUrl: './side-tabs.component.html',
  styleUrl: './side-tabs.component.scss'
})
export class SideTabsComponent {
  @ContentChildren(SideTabComponent) tabs!: QueryList<SideTabComponent>;
  @ViewChildren('panelRef') panels!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('btnRef') btns!: QueryList<ElementRef<HTMLButtonElement>>;

  public sideTabs = signal<number | string>('');
  public panelWidth = signal<string>('0px');

  constructor() {
    afterNextRender(() => this.updateWidth());
  }

  toggleTab(i: number) {
    const toggle = this.sideTabs() === i ? '' : i;
    this.sideTabs.set(toggle);
    this.updateWidth();

    if (toggle !== '') {
      this.focusPanel(toggle);
    }
  }

  isOpen(i: number): boolean {
    return this.sideTabs() === i;
  }

  getButtonId(i: number) {
    return `side-tab-btn-${i}`;
  }

  getPanelId(i: number) {
    return `side-tab-panel-${i}`;
  }

  handlePanelBlur(event: FocusEvent, i: number) {
    const panel = this.panels.toArray()[i]?.nativeElement;
    const related = event.relatedTarget as HTMLElement | null;

    if (panel && related && !panel.contains(related)) {
      this.focusButton(i);
    }
  }

  private updateWidth() {
    queueMicrotask(() => {
      const idx = this.sideTabs();
      if (idx === '') {
        this.panelWidth.set('0px');
        return;
      }

      const el = this.panels.toArray()[idx as number]?.nativeElement;
      if (el) {
        this.panelWidth.set(`${el.offsetWidth}px`);
      }
    });
  }

  private focusPanel(i: number) {
    const el = this.panels.toArray()[i]?.nativeElement;
    el?.focus();
  }

  private focusButton(i: number) {
    const btn = this.btns.toArray()[i]?.nativeElement;
    btn?.focus();
  }
}
