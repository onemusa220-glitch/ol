import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type Snap } from "./engine";

/** Reactive demo store. Returns null during SSR / before hydration. */
export function useDemo(): Snap | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
