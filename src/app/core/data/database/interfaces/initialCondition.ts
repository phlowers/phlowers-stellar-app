export interface InitialCondition {
  uuid: string;
  name: string;
  base_parameters: number;
  base_temperature: number;
  cable_pretension: number;
  min_temperature: number;
  max_wind_pressure: number;
  max_frost_width: number;
}
