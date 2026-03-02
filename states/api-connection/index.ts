import { atom, useAtom } from 'jotai';

export type ManageApiConnectionsState = { orgId: string; slug: string } | false;

const manageApiConnectionsState = atom<ManageApiConnectionsState>(false);

export const useManageApiConnections = () =>
  useAtom(manageApiConnectionsState);
