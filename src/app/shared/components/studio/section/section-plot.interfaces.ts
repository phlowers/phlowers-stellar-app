import type { SpanLoadAnnotationData } from './helpers/createLoadAnnotations';
import type { CableModificationAnnotationData } from './helpers/createCableModificationAnnotations.interfaces';
import type { ObstacleAnnotationData } from './helpers/obstacles';

/** Payload emitted by Plotly's `plotly_clickannotation` event for our annotated plot. */
export interface ClickAnnotationEvent {
  annotation?: { data?: ObstacleAnnotationData | SpanLoadAnnotationData | CableModificationAnnotationData };
}
