import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogModule } from 'primeng/dialog';
import { CardInfoComponent } from '@shared/components/atoms/card-info/card-info.component';
import { TOOLS } from './tools.constantes';
import { ToolItem } from './tools.interfaces';

@Component({
  selector: 'app-tools',
  imports: [CardInfoComponent, DialogModule, TranslocoPipe],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Tools page listing external tools as cards, each opening in a modal. */
export class ToolsComponent {
  readonly tools = TOOLS;
  readonly selectedTool = signal<ToolItem | null>(null);

  openTool(tool: ToolItem): void {
    this.selectedTool.set(tool);
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.selectedTool.set(null);
    }
  }
}
