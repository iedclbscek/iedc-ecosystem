import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'iedc:viewMode:v1';

const ViewModeContext = createContext(null);

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readInitial = () => {
  if (typeof window === 'undefined') return { mode: 'iedc', clubId: null };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  if (!parsed || (parsed.mode !== 'iedc' && parsed.mode !== 'club')) {
    return { mode: 'iedc', clubId: null };
  }
  if (parsed.mode === 'club' && !parsed.clubId) {
    return { mode: 'iedc', clubId: null };
  }
  return { mode: parsed.mode, clubId: parsed.clubId ?? null };
};

export function ViewModeProvider({ children }) {
  const [state, setState] = useState(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  const value = useMemo(() => {
    return {
      mode: state.mode,
      clubId: state.clubId,
      setIedcMode: () => setState({ mode: 'iedc', clubId: null }),
      setClubMode: (clubId) => setState({ mode: 'club', clubId: String(clubId) }),
    };
  }, [state.clubId, state.mode]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    return { mode: 'iedc', clubId: null, setIedcMode: () => {}, setClubMode: () => {} };
  }
  return ctx;
}
