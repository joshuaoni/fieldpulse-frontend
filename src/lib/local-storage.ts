/**
 * The only module that touches `localStorage`.
 */

export function read(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Non-fatal by design: what is stored here is a convenience, never a
    // record. Losing it costs a preference, not a visit.
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // As above.
  }
}

/**
 * Notifies when another tab writes the key, which is what keeps two open
 * copies of a screen agreeing with each other.
 */
export function subscribe(key: string, onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) onChange();
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
