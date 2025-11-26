import {
  Component,
  ContentChildren,
  ElementRef,
  QueryList,
  signal,
  ViewChildren
} from '@angular/core';
import { SideTabComponent } from './side-tab/side-tab.component';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { PlotService } from '../plot.service';

const REFRESH_STUDIO_DELAY = 400;

@Component({
  selector: 'app-side-tabs',
  imports: [NgTemplateOutlet, ButtonComponent, IconComponent],
  templateUrl: './side-tabs.component.html',
  styleUrl: './side-tabs.component.scss'
})
export class SideTabsComponent {
  @ContentChildren(SideTabComponent) tabs!: QueryList<SideTabComponent>;
  @ViewChildren('panelRef') panels!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('btnRef') btns!: QueryList<ElementRef<HTMLButtonElement>>;

  public sideTabs = signal<number | string>('');
  public panelWidth = signal<string>('0px');

  constructor(private readonly plotService: PlotService) {}

  private updateWidth() {
    const idx = this.sideTabs();
    if (idx === '') {
      this.panelWidth.set('0px');
      return;
    }

    setTimeout(() => {
      const el = this.panels.toArray()[idx as number]?.nativeElement;
      if (el) {
        this.panelWidth.set(`${el.offsetWidth}px`);
      }
    });
  }

  private focusPanel(i: number) {
    setTimeout(() => {
      const el = this.panels.toArray()[i]?.nativeElement;
      el?.focus();
    });
  }

  private focusButton(i: number) {
    const btn = this.btns.toArray()[i]?.nativeElement;
    btn?.focus();
  }

  toggleTab(i: number) {
    const toggle = this.sideTabs() === i ? '' : i;
    this.sideTabs.set(toggle);
    this.updateWidth();

    if (toggle !== '') {
      this.focusPanel(toggle);
    }
    setTimeout(() => {
      this.plotService.setSidebarOpen();
    }, REFRESH_STUDIO_DELAY);
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

  handleKeyDown(event: KeyboardEvent, i: number) {
    const count = this.btns.length;
    let newIndex = i;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = (i + 1) % count;
        this.focusButton(newIndex);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = (i - 1 + count) % count;
        this.focusButton(newIndex);
        break;
      case 'Escape':
        if (this.sideTabs() !== '') {
          this.sideTabs.set('');
          this.panelWidth.set('0px');
          this.focusButton(i);
        }
        event.preventDefault();
        break;
    }
  }

  handlePanelFocusOut(event: FocusEvent, i: number) {
    const panel = this.panels.toArray()[i]?.nativeElement;
    const next = event.relatedTarget as HTMLElement | null;

    if (panel && next && panel.contains(next)) {
      return;
    }

    this.focusButton(i);
  }
}
