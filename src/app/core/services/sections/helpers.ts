import { Section } from '../../data/database/interfaces/section';
import { Support } from '../../data/database/interfaces/support';
import { v4 as uuidv4 } from 'uuid';

export const createEmptySupport = (): Support => {
  return {
    uuid: uuidv4(),
    number: null,
    name: null,
    spanLength: null,
    spanAngle: null,
    attachmentSet: null,
    attachmentHeight: null,
    heightBelowConsole: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null
  };
};

export const createEmptySection = (): Section => {
  return {
    uuid: uuidv4(),
    name: '',
    type: 'phase',
    electric_phase_number: 0,
    cables_amount: 0,
    cable_name: undefined,
    gmr: undefined,
    eel: undefined,
    cm: undefined,
    supports: [],
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
    electric_tension_level: undefined,
    link_name: undefined,
    lit: undefined,
    branch_name: undefined,
    comment: undefined,
    initial_conditions: []
  };
};
