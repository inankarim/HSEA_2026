import { useRef } from "react";

/**
 * A small counting semaphore scoped to one mount of the caller, so at most
 * `max` uploads run at once regardless of how many the applicant selects
 * across different tabs in quick succession — additional selections queue
 * rather than firing every request in parallel.
 */
export function useUploadGate(max: number) {
  const active = useRef(0);
  const queue = useRef<Array<() => void>>([]);

  return useRef(async (fn: () => Promise<void>) => {
    if (active.current >= max) {
      await new Promise<void>((resolve) => queue.current.push(resolve));
    }
    active.current += 1;
    try {
      await fn();
    } finally {
      active.current -= 1;
      const next = queue.current.shift();
      if (next) next();
    }
  }).current;
}
