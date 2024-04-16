import { atom, useAtom } from 'jotai';

const updateOrganizationModalState = atom<boolean | string>(false);

export const useUpdateOrganization = () =>
  useAtom(updateOrganizationModalState);
