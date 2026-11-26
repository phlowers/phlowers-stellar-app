/** The three location fields as they are edited: `null` means the field is empty. */
export type LocationValues = Omit<LocationData, 'isValid'>;

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  azimuth: number | null;
  isValid: boolean;
}
