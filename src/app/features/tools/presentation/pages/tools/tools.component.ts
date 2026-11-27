import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogModule } from 'primeng/dialog';
import { CardInfoComponent } from '@shared/components/atoms/card-info/card-info.component';
import { PluginDialogComponent } from '@shared/plugin/components/plugin-dialog/plugin-dialog.component';
import { PluginDialogService } from '@shared/plugin/plugin-dialog.service';
import { StellarPluginRegistryService } from '@shared/plugin/stellar-plugin-registry.service';
import { StellarPluginEntry } from '@shared/plugin/stellar-plugin.interfaces';
import { TOOLS } from './tools.constantes';
import { ToolItem } from './tools.interfaces';

@Component({
  selector: 'app-tools',
  imports: [CardInfoComponent, DialogModule, PluginDialogComponent, TranslocoPipe],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Tools page listing external tools and home plugins as cards, each opening in a modal. */
export class ToolsComponent {
  readonly #pluginDialogService = inject(PluginDialogService);

  readonly tools = TOOLS;
  readonly pluginEntries = inject(StellarPluginRegistryService).homeEntries;
  readonly selectedTool = signal<ToolItem | null>(null);

  openTool(tool: ToolItem): void {
    this.selectedTool.set(tool);
  }

  openPlugin(entry: StellarPluginEntry): void {
    this.#pluginDialogService.open(entry);
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.selectedTool.set(null);
    }
  }
}
