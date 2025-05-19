export interface Obstacle {
  uuid: string;
  name: string;
  type: string;
  support: string;
  positions: [
    {
      x: number;
      y: number;
      z: number;
    }
  ];
}

export interface Support {
  name: string;
  suspension: boolean;
  conductor_attachment_altitude: number;
  crossarm_length: number;
  line_angle: number;
  insulator_length: number;
  span_length: number;
}

export interface Data {
  general: {
    sagging: {
      temperature: number | null;
      parameter: number | null;
    };
    cable: {
      section: number | null;
      diameter: number | null;
      linear_weight: number | null;
      young_modulus: number | null;
      dilatation_coefficient: number | null;
      temperature_reference: number | null;
      a0: number | null;
      a1: number | null;
      a2: number | null;
      a3: number | null;
      a4: number | null;
      b0: number | null;
      b1: number | null;
      b2: number | null;
      b3: number | null;
      b4: number | null;
    };
    weather: {
      wind_pressure: number | null;
      ice_thickness: number | null;
    };
  };
  obstacles: Obstacle[];
  supports: Support[];
}
