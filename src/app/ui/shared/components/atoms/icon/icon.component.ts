import { Component, input, OnInit, signal, computed } from '@angular/core';
import { PossibleIconNames, CustomSvgIconNames, CUSTOM_SVG_ICONS } from '../../../model/icon.model';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  host: {
    role: 'img',
    class: 'app-icon',
    '[class.filled]': 'fill()',
    '[attr.aria-label]': 'icon()',
    '[class.symbols-loading]': '!symbolsReady()'
  }
})
/**
 * Icon component that renders either a Material Symbols Rounded icon or a custom SVG sprite icon.
 * Waits for the Material Symbols font to be loaded before displaying the icon.
 */
export class IconComponent implements OnInit {
  /** Name of the icon to display (Material Symbol or custom SVG). */
  icon = input.required<PossibleIconNames | undefined>();
  /** Whether to render the icon with a filled variant. */
  fill = input<boolean>(false);

  /** Whether the Material Symbols Rounded font is loaded and ready. */
  symbolsReady = signal(false);

  /** Whether the current icon is a custom SVG rather than a Material Symbol. */
  isCustomSvgIcon = computed(() => {
    return CUSTOM_SVG_ICONS.includes(this.icon() as CustomSvgIconNames);
  });

  /** Returns the SVG sprite reference URL for a custom icon. */
  customSvgContent = () => {
    return `/icons/customs.svg#${this.icon()}`;
  };

  ngOnInit() {
    this.isSymbolsReady();
  }

  private async isSymbolsReady() {
    if (document.fonts.check('1em "Material Symbols Rounded"')) {
      this.symbolsReady.set(true);
      return;
    }

    try {
      await document.fonts.load('1em "Material Symbols Rounded"');
      this.symbolsReady.set(true);
    } catch (error) {
      console.warn('Material Symbols Rounded font failed to load:', error);
    }
  }
}
