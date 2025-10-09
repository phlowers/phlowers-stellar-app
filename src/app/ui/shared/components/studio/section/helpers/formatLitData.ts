import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';

export const formatLitData = (litData: GetSectionOutput) => {
  const litXs = Object.values(litData.x);
  const litYs = Object.values(litData.y);
  const litZs = Object.values(litData.z);
  const litTypes = Object.values(litData.type);
  const litSection = Object.values(litData.section);
  const litSupports = Object.values(litData.support);
  return {
    litXs,
    litYs,
    litZs,
    litTypes,
    litSection,
    litSupports
  };
};
