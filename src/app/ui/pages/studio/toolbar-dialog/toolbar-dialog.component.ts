import { Component, Injector, inject } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ToolbarDialogService } from './toolbar-dialog.service';

@Component({
  selector: 'app-toolbar-dialog',
  imports: [DialogModule, NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './toolbar-dialog.component.html'
})
export class ToolbarDialogComponent {
  readonly toolbarDialogService = inject(ToolbarDialogService);
  readonly injector = inject(Injector);

  onVisibleChange(visible: boolean): void {
    if (!visible && this.toolbarDialogService.isTransitioning()) {
      return;
    }
    this.toolbarDialogService.isOpen.set(visible);
  }

  onDialogHide(): void {
    if (this.toolbarDialogService.isTransitioning()) {
      this.toolbarDialogService.completePendingTransition();
    } else {
      this.toolbarDialogService.closeTool();
    }
  }
}
