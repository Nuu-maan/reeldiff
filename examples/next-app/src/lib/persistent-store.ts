import { useSyncExternalStore } from "react";

export function createPersistentStore<T>(key: string, seed: T) {
  let state: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (state !== undefined) return state;
    try {
      const saved = localStorage.getItem(key);
      state = saved ? (JSON.parse(saved) as T) : seed;
    } catch {
      state = seed;
    }
    return state;
  };

  const set = (update: (current: T) => T) => {
    state = update(read());
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
    for (const listener of listeners) listener();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { subscribe, read, seed, set };
}

export const usePersistentStore = <T>(store: ReturnType<typeof createPersistentStore<T>>) =>
  useSyncExternalStore(store.subscribe, store.read, () => store.seed);
