export interface ProtoV4Support {
  alt_acc: number;
  angle_ligne: number;
  ch_en_V: boolean;
  ctr_poids: number;
  long_bras: number;
  long_ch: number;
  nom: string;
  num: string;
  pds_ch: number;
  portée: number;
  surf_ch: number;
  suspension: boolean;
}

export interface ProtoV4Parameters {
  conductor: string;
  cable_amount: number;
  temperature_reference: number;
  parameter: number;
  cra: number;
  temp_load: number;
  wind_load: number;
  frost_load: number;
  section_name: string;
  project_name: string;
}
