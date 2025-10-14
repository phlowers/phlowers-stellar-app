import { Component, input, OnInit, signal, computed } from '@angular/core';
import {
  PossibleIconNames,
  CustomSvgIconNames,
  CUSTOM_SVG_ICONS
} from '../../../model/icon.model';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  host: {
    role: 'img',
    class: 'app-icon',
    '[attr.aria-label]': 'icon()',
    '[class.symbols-loading]': '!symbolsReady()'
  }
})
export class IconComponent implements OnInit {
  icon = input.required<PossibleIconNames | undefined>();

  symbolsReady = signal(false);

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
