/** Min/max constraints for initial condition numeric fields. */
export const initialConditionConstraints = {
  base_parameters: { min: 20, max: 5000 },
  base_temperature: { min: -50, max: 250 },
  cable_pretension: { min: 0, max: 100 },
  min_temperature: { min: -50, max: 250 },
  max_wind_pressure: { min: 0, max: 3000 },
  max_frost_width: { min: 0, max: 20 }
} as const;
