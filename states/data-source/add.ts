import { atom, useAtom } from 'jotai';

const addDataSourceState = atom<string | boolean>(false);

export const useAddDataSource = () => useAtom(addDataSourceState);
