import React, { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type CompareContextType = { 
  selected: string[]; 
  toggle: (id: string) => void; 
  clear: () => void; 
};

const CompareContext = createContext<CompareContextType>({ 
  selected: [], 
  toggle: () => {}, 
  clear: () => {} 
});

export const useCompare = () => useContext(CompareContext);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useLocalStorage<string[]>("compare:candidates", []);

  const api = useMemo<CompareContextType>(() => ({
    selected,
    toggle: (id) =>
      setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-5)),
    clear: () => setSelected([]),
  }), [selected, setSelected]);

  return <CompareContext.Provider value={api}>{children}</CompareContext.Provider>;
}