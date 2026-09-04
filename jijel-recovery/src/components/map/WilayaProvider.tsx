"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { dispatchFlyToPoint } from "@/lib/map-fly-to";
import {
  DEFAULT_WILAYA,
  getWilayaDefinition,
  isWilayaCode,
  WILAYA_STORAGE_KEY,
  WILAYA_TILE_REGION_MESSAGE,
  type WilayaCode,
  type WilayaDefinition,
} from "@/lib/wilaya";

type WilayaContextValue = {
  wilaya: WilayaCode;
  definition: WilayaDefinition;
  setWilaya: (code: WilayaCode, options?: { fly?: boolean }) => void;
};

const WilayaContext = createContext<WilayaContextValue | null>(null);

function notifyServiceWorkerTileRegion(code: WilayaCode) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  const def = getWilayaDefinition(code);
  void navigator.serviceWorker.ready
    .then((reg) => {
      reg.active?.postMessage({
        type: WILAYA_TILE_REGION_MESSAGE,
        wilaya: code,
        maxBounds: def.maxBounds,
      });
    })
    .catch(() => undefined);
}

export function WilayaProvider({ children }: { children: ReactNode }) {
  const [wilaya, setWilayaState] = useState<WilayaCode>(DEFAULT_WILAYA);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WILAYA_STORAGE_KEY);
      if (isWilayaCode(stored)) {
        setWilayaState(stored);
        notifyServiceWorkerTileRegion(stored);
      } else {
        notifyServiceWorkerTileRegion(DEFAULT_WILAYA);
      }
    } catch {
      notifyServiceWorkerTileRegion(DEFAULT_WILAYA);
    }
  }, []);

  const setWilaya = useCallback(
    (code: WilayaCode, options?: { fly?: boolean }) => {
      setWilayaState(code);
      try {
        window.localStorage.setItem(WILAYA_STORAGE_KEY, code);
      } catch {
        // ignore quota / private mode
      }
      notifyServiceWorkerTileRegion(code);

      if (options?.fly !== false) {
        const def = getWilayaDefinition(code);
        dispatchFlyToPoint({
          lat: def.center[0],
          lng: def.center[1],
          zoom: def.zoom,
        });
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      wilaya,
      definition: getWilayaDefinition(wilaya),
      setWilaya,
    }),
    [setWilaya, wilaya],
  );

  return (
    <WilayaContext.Provider value={value}>{children}</WilayaContext.Provider>
  );
}

export function useWilaya(): WilayaContextValue {
  const ctx = useContext(WilayaContext);
  if (!ctx) {
    throw new Error("useWilaya must be used within WilayaProvider");
  }
  return ctx;
}

/** Soft fallback when provider is optional (e.g. tests). */
export function useWilayaOptional(): WilayaContextValue | null {
  return useContext(WilayaContext);
}
