import { ChangeDetectionStrategy, Component, input, OnInit, signal, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PossibleIconNames, CustomSvgIconNames, CUSTOM_SVG_ICONS } from '@shared/model/icon.model';
import { LoggerService } from '@core/services/logger/logger.service';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  host: {
    role: 'img',
    class: 'app-icon',
    '[class.filled]': 'fill()',
    '[attr.aria-label]': 'ariaLabel() ? ariaLabel() : icon()',
    '[class.symbols-loading]': '!symbolsReady()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Icon component that renders Material Symbols or custom SVG icons by name. */
export class IconComponent implements OnInit {
  /** Name of the icon to display (Material Symbol or custom SVG). */
  icon = input.required<PossibleIconNames | undefined>();
  /** Whether to render the icon in its filled variant. */
  fill = input<boolean>(false);
  /** Optional aria label for the icon. */
  ariaLabel = input<string | null>(null);

  symbolsReady = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly logger = inject(LoggerService);

  isCustomSvgIcon = computed(() => {
    return CUSTOM_SVG_ICONS.includes(this.icon() as CustomSvgIconNames);
  });

  customSvgContent = () => {
    return `/icons/customs.svg#${this.icon()}`;
  };

  ngOnInit() {
    this.isSymbolsReady();
  }

  private async isSymbolsReady() {
    if (this.document.fonts.check('1em "Material Symbols Rounded"')) {
      this.symbolsReady.set(true);
      return;
    }

    try {
      await this.document.fonts.load('1em "Material Symbols Rounded"');
      this.symbolsReady.set(true);
    } catch (error) {
      this.logger.warn('Material Symbols Rounded font failed to load:', error);
    }
  }
}
