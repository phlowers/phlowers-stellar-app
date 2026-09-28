import { ToolItem } from './tools.interfaces';

/** Sample tools, to be replaced by the real ones. */
export const TOOLS: readonly ToolItem[] = [
  {
    id: 'ist-reduction',
    titleKey: 'tools.items.ist-reduction.title',
    descriptionKey: 'tools.items.ist-reduction.description',
    accentColor: 'var(--secondary-400)'
  },
  {
    id: 'wind-pressure',
    titleKey: 'tools.items.wind-pressure.title',
    descriptionKey: 'tools.items.wind-pressure.description',
    accentColor: 'var(--grey-700)'
  },
  {
    id: 'support-explorer',
    titleKey: 'tools.items.support-explorer.title',
    descriptionKey: 'tools.items.support-explorer.description',
    accentColor: 'var(--tertiary-600)'
  }
];
