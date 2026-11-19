import { createContext, useContext } from 'react';

export const ViewModeContext = createContext(null);

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    return { mode: 'iedc', clubId: null, setIedcMode: () => {}, setClubMode: () => {} };
  }
  return ctx;
}
