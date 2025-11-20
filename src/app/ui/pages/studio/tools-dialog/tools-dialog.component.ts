import { Component, Injector, inject } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ToolsDialogService } from './tools-dialog.service';

type Tool = 'field-measuring' | 'other-tool';

@Component({
  selector: 'app-tools-dialog',
  imports: [DialogModule, NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './tools-dialog.component.html'
})
export class ToolsDialogComponent {
  readonly toolsDialogService = inject(ToolsDialogService);
  readonly injector = inject(Injector);
}
