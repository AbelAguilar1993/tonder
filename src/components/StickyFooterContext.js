"use client";

import { createContext, useContext, useState } from "react";

const StickyFooterContext = createContext();

export function StickyFooterProvider({ children }) {
  const [hasStickyFooter, setHasStickyFooter] = useState(false);
  const [stickyFooterHeight, setStickyFooterHeight] = useState(0);

  return (
    <StickyFooterContext.Provider
      value={{
        hasStickyFooter,
        setHasStickyFooter,
        stickyFooterHeight,
        setStickyFooterHeight,
      }}
    >
      {children}
    </StickyFooterContext.Provider>
  );
}

export function useStickyFooter() {
  const context = useContext(StickyFooterContext);
  if (context === undefined) {
    throw new Error(
      "useStickyFooter must be used within a StickyFooterProvider",
    );
  }
  return context;
}
