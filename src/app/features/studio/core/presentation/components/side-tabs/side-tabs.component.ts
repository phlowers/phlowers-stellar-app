import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  effect,
  ElementRef,
  inject,
  signal,
  viewChildren
} from '@angular/core';
import { SideTabComponent } from './side-tab/side-tab.component';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { isNumber } from 'lodash';

const REFRESH_STUDIO_DELAY = 400;

/** Component hosting a set of collapsible side tabs with panel content. */
@Component({
  selector: 'app-side-tabs',
  imports: [NgTemplateOutlet, ButtonComponent, IconComponent],
  templateUrl: './side-tabs.component.html',
  styleUrl: './side-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SideTabsComponent {
  readonly tabs = contentChildren(SideTabComponent);
  readonly panels = viewChildren<ElementRef<HTMLElement>>('panelRef');
  readonly btns = viewChildren<ElementRef<HTMLButtonElement>>('btnRef');

  public panelWidth = signal<string>('0px');

  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly sideTabsService = inject(SideTabsService);

  constructor() {
    effect(() => {
      const toggle = this.sideTabsService.sideTabs();
      this.updateWidth();

      if (toggle !== null && isNumber(toggle)) {
        this.focusPanel(toggle);
      }
      setTimeout(() => {
        this.plotOptionsService.refreshCamera();
      }, REFRESH_STUDIO_DELAY);
    });
  }

  private updateWidth() {
    const idx = this.sideTabsService.sideTabs();
    if (idx === null) {
      this.panelWidth.set('0px');
      return;
    }

    setTimeout(() => {
      const el = this.panels()[idx as number]?.nativeElement;
      if (el) {
        this.panelWidth.set(`${el.offsetWidth}px`);
      }
    });
  }

  private focusPanel(i: number) {
    setTimeout(() => {
      const el = this.panels()[i]?.nativeElement;
      if (typeof el?.focus === 'function') {
        el.focus({ preventScroll: true });
      }
    });
  }

  private focusButton(i: number) {
    const btn = this.btns()[i]?.nativeElement;
    btn?.focus();
  }

  toggleTab(i: number) {
    const toggle = this.sideTabsService.sideTabs() === i ? null : i;
    this.sideTabsService.sideTabs.set(toggle);
  }

  isOpen(i: number): boolean {
    return this.sideTabsService.sideTabs() === i;
  }

  getButtonId(i: number) {
    return `side-tab-btn-${i}`;
  }

  getPanelId(i: number) {
    return `side-tab-panel-${i}`;
  }

  handleKeyDown(event: KeyboardEvent, i: number) {
    const count = this.btns().length;
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
        if (this.sideTabsService.sideTabs() !== null) {
          this.sideTabsService.sideTabs.set(null);
          this.panelWidth.set('0px');
          this.focusButton(i);
        }
        event.preventDefault();
        break;
    }
  }

  handlePanelFocusOut(event: FocusEvent, i: number) {
    const panel = this.panels()[i]?.nativeElement;
    const next = event.relatedTarget as HTMLElement | null;

    if (panel && next && panel.contains(next)) {
      return;
    }

    this.focusButton(i);
  }
}
