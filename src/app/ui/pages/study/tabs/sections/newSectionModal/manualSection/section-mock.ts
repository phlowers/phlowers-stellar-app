interface SelectOption {
  name: string;
  code: string;
}

interface SectionMockData {
  sectionTypes: SelectOption[] | undefined;
  sectionCm: SelectOption[] | undefined;
  sectionGmr: SelectOption[] | undefined;
  sectionEel: SelectOption[] | undefined;
  sectionEtl: SelectOption[] | undefined;
  sectionLinkname: SelectOption[] | undefined;
}

export const sectionMock: SectionMockData = {
  sectionTypes: [
    { name: 'Guard', code: 'guard' },
    { name: 'Phase', code: 'phase' }
  ],
  sectionCm: [
    { name: 'CM-LIL', code: 'cmLil' },
    { name: 'CM-LYO', code: 'cmLyo' },
    { name: 'CM-MAR', code: 'cmMar' },
    { name: 'CM-NCY', code: 'cmNcy' },
    { name: 'CM-NTR', code: 'cmNtr' },
    { name: 'CM-NTS', code: 'cmNts' },
    { name: 'CM-TOU', code: 'cmTou' }
  ],
  sectionGmr: [
    { name: 'GMR Auvergne', code: 'gmrAuvergne' },
    { name: 'GMR Dauphine', code: 'gmrDauphine' },
    { name: 'GMR Forez Velay', code: 'gmrForezVelay' },
    { name: 'GMR Lyonnais', code: 'gmrLyonnais' },
    { name: 'GMR Savoie', code: 'gmrSavoie' }
  ],
  sectionEel: [
    { name: 'Auvergne', code: 'auvergne' },
    { name: 'Dauphine', code: 'dauphine' },
    { name: 'Forez Velay', code: 'forezVelay' },
    { name: 'Lyonnais', code: 'lyonnais' },
    { name: 'Savoie', code: 'savoie' }
  ],
  sectionEtl: [
    { name: '400', code: 'etl400' },
    { name: '225', code: 'etl225' },
    { name: '150', code: 'etl150' },
    { name: '90', code: 'etl90' },
    { name: '63', code: 'etl63' }
  ],
  sectionLinkname: [
    { name: 'Liaison 400kV', code: 'name400kV' },
    { name: 'Liaison 225kV', code: 'name225kV' },
    { name: 'Liaison 150kV', code: 'name150kV' },
    { name: 'Liaison 90kV', code: 'name90kV' },
    { name: 'Liaison 63kV', code: 'name63kV' }
  ]
};
