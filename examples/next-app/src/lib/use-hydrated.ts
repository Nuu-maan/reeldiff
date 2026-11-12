import { useSyncExternalStore } from "react";

const noop = () => () => {};

export const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
