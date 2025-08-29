import { addCodesForPselect } from '@src/app/ui/shared/utils/code-for-pselect';

interface SelectOption {
  name: string;
  code: string;
}

export const sectionTypes: SelectOption[] = [
  { name: 'Guard', code: 'guard' },
  { name: 'Phase', code: 'phase' }
];

const maintenance = {
  eel: [
    {
      name: 'Region1',
      gmr: [
        {
          name: 'GMR1region1',
          cm: [
            { name: 'GMR1region1CM1' },
            { name: 'GMR1region1CM2' },
            { name: 'GMR1region1CM3' },
            { name: 'GMR1region1CM4' }
          ]
        },
        {
          name: 'GMR2region1',
          cm: [
            { name: 'GMR2region1CM1' },
            { name: 'GMR2region1CM2' },
            { name: 'GMR2region1CM3' },
            { name: 'GMR2region1CM4' },
            { name: 'GMR2region1CM5' },
            { name: 'GMR2region1CM6' }
          ]
        },
        {
          name: 'GMR3region1',
          cm: [
            { name: 'GMR3region1CM1' },
            { name: 'GMR3region1CM2' },
            { name: 'GMR3region1CM3' }
          ]
        }
      ]
    },
    {
      name: 'Region2',
      gmr: [
        {
          name: 'GMR1region2',
          cm: [
            { name: 'GMR1region2CM1' },
            { name: 'GMR1region2CM2' },
            { name: 'GMR1region2CM3' },
            { name: 'GMR1region2CM4' }
          ]
        },
        {
          name: 'GMR2region2',
          cm: [
            { name: 'GMR2region2CM1' },
            { name: 'GMR2region2CM2' },
            { name: 'GMR2region2CM3' },
            { name: 'GMR2region2CM4' },
            { name: 'GMR2region2CM5' },
            { name: 'GMR2region2CM6' }
          ]
        },
        {
          name: 'GMR3region2',
          cm: [
            { name: 'GMR3region2CM1' },
            { name: 'GMR3region2CM2' },
            { name: 'GMR3region2CM3' }
          ]
        }
      ]
    },
    {
      name: 'Region3',
      gmr: [
        {
          name: 'GMR1region3',
          cm: [
            { name: 'GMR1region3CM1' },
            { name: 'GMR1region3CM2' },
            { name: 'GMR1region3CM3' },
            { name: 'GMR1region3CM4' }
          ]
        },
        {
          name: 'GMR2region3',
          cm: [
            { name: 'GMR2region3CM1' },
            { name: 'GMR2region3CM2' },
            { name: 'GMR2region3CM3' },
            { name: 'GMR2region3CM4' },
            { name: 'GMR2region3CM5' },
            { name: 'GMR2region3CM6' }
          ]
        },
        {
          name: 'GMR3region3',
          cm: [
            { name: 'GMR3region3CM1' },
            { name: 'GMR3region3CM2' },
            { name: 'GMR3region3CM3' }
          ]
        }
      ]
    }
  ]
};

const link = {
  tensionLevel: [
    {
      name: '63kV',
      linkName: [
        {
          name: 'Liaison 63kV',
          lit: [
            {
              name: 'TOURBL2ROUGE',
              branch: [
                { name: 'TOURBL2ROUGE01' },
                { name: 'TOURBL2ROUGE02' },
                { name: 'TOURBL2ROUGE03' }
              ]
            },
            {
              name: 'TOURBL2JAUNE',
              branch: [
                { name: 'TOURBL2JAUNE01' },
                { name: 'TOURBL2JAUNE02' },
                { name: 'TOURBL2JAUNE03' }
              ]
            },
            {
              name: 'TOURBL2NOIR',
              branch: [
                { name: 'TOURBL2NOIR01' },
                { name: 'TOURBL2NOIR02' },
                { name: 'TOURBL2NOIR03' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: '90kV',
      linkName: [
        {
          name: 'Liaison 90kV',
          lit: [
            {
              name: 'TOURBL3ROUGE',
              branch: [
                { name: 'TOURBL3ROUGE01' },
                { name: 'TOURBL3ROUGE02' },
                { name: 'TOURBL3ROUGE03' }
              ]
            },
            {
              name: 'TOURBL3JAUNE',
              branch: [
                { name: 'TOURBL3JAUNE01' },
                { name: 'TOURBL3JAUNE02' },
                { name: 'TOURBL3JAUNE03' }
              ]
            },
            {
              name: 'TOURBL3NOIR',
              branch: [
                { name: 'TOURBL3NOIR01' },
                { name: 'TOURBL3NOIR02' },
                { name: 'TOURBL3NOIR03' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: '150kV',
      linkName: [
        {
          name: 'Liaison 150kV',
          lit: [
            {
              name: 'TOURBL4ROUGE',
              branch: [
                { name: 'TOURBL4ROUGE01' },
                { name: 'TOURBL4ROUGE02' },
                { name: 'TOURBL4ROUGE03' }
              ]
            },
            {
              name: 'TOURBL4JAUNE',
              branch: [
                { name: 'TOURBL4JAUNE01' },
                { name: 'TOURBL4JAUNE02' },
                { name: 'TOURBL4JAUNE03' }
              ]
            },
            {
              name: 'TOURBL4NOIR',
              branch: [
                { name: 'TOURBL4NOIR01' },
                { name: 'TOURBL4NOIR02' },
                { name: 'TOURBL4NOIR03' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: '225kV',
      linkName: [
        {
          name: 'Liaison 225kV',
          lit: [
            {
              name: 'TOURBL5ROUGE',
              branch: [
                { name: 'TOURBL5ROUGE01' },
                { name: 'TOURBL5ROUGE02' },
                { name: 'TOURBL5ROUGE03' }
              ]
            },
            {
              name: 'TOURBL5JAUNE',
              branch: [
                { name: 'TOURBL5JAUNE01' },
                { name: 'TOURBL5JAUNE02' },
                { name: 'TOURBL5JAUNE03' }
              ]
            },
            {
              name: 'TOURBL5NOIR',
              branch: [
                { name: 'TOURBL5NOIR01' },
                { name: 'TOURBL5NOIR02' },
                { name: 'TOURBL5NOIR03' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: '400kV',
      linkName: [
        {
          name: 'Liaison 400kV',
          lit: [
            {
              name: 'TOURBL6ROUGE',
              branch: [
                { name: 'TOURBL6ROUGE01' },
                { name: 'TOURBL6ROUGE02' },
                { name: 'TOURBL6ROUGE03' }
              ]
            },
            {
              name: 'TOURBL6JAUNE',
              branch: [
                { name: 'TOURBL6JAUNE01' },
                { name: 'TOURBL6JAUNE02' },
                { name: 'TOURBL6JAUNE03' }
              ]
            },
            {
              name: 'TOURBL6NOIR',
              branch: [
                { name: 'TOURBL6NOIR01' },
                { name: 'TOURBL6NOIR02' },
                { name: 'TOURBL6NOIR03' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export const maintenanceSelect = addCodesForPselect(maintenance);
export const linkSelect = addCodesForPselect(link);
