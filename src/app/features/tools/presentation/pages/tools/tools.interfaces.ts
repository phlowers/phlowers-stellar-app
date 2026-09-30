/** External tool entry displayed as a card on the tools page. */
export interface ToolItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  /** CSS color value (design token) used for the card left accent border. */
  accentColor: string;
}
