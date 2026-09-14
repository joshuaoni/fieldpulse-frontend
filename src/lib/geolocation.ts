/**
 * A single position fix, read only during an active check-in or check-out. Never a background watcher.
 */
export function getCurrentPosition(timeoutMs = 20_000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This device cannot report its location"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission is required to check in"
            : error.code === error.TIMEOUT
              ? "Could not get a location fix — try again in the open"
              : "Location is unavailable right now";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
