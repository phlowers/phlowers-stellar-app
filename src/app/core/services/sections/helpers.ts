import { Section, Support } from '@core/domain';
import { v4 as uuidv4 } from 'uuid';

export const createEmptySupport = (): Support => {
  return {
    uuid: uuidv4(),
    number: null,
    name: null,
    spanLength: null,
    spanAngle: 0,
    attachmentSet: null,
    attachmentHeight: null,
    heightBelowConsole: null,
    towerModel: null,
    cableType: null,
    armLength: 0,
    chainName: null,
    chainLength: 0,
    chainWeight: 0,
    chainV: false,
    counterWeight: 0,
    supportFootAltitude: null,
    attachmentPosition: null,
    chainSurface: 0,
    towerModel: null
  };
};

const createFirstAndLastSupport = (): Support[] => {
  return [createEmptySupport(), { ...createEmptySupport(), spanLength: null }];
};

export const createEmptySection = (): Section => {
  return {
    uuid: uuidv4(),
    name: '',
    type: 'phase',
    electric_phase_number: 0,
    cables_amount: 1,
    cable_name: undefined,
    regional_team_id: undefined,
    maintenance_team_id: undefined,
    maintenance_center_id: undefined,
    supports: createFirstAndLastSupport(),
    internal_id: '',
    short_name: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    internal_catalog_id: '',
    cable_short_name: '',
    optical_fibers_amount: 0,
    spans_amount: 0,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: 0,
    last_support_number: 0,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_maintenance_center_names: [],
    maintenance_center_names: [],
    voltage_idr: undefined,
    link_name: undefined,
    lit_code: undefined,
    lit_name: undefined,
    branch_name: undefined,
    branch_idr: undefined,
    comment: undefined,
    supports_comment: undefined,
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined
  };
};
