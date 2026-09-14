/**
 * Explains the gap between when the phone recorded an action and when the
 * server verified it.
 */

const NOTABLE_GAP_MS = 2 * 60 * 1000;

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function DeviceTimeNote({
  verifiedAt,
  deviceAt,
}: {
  verifiedAt: string | null;
  deviceAt: string | null;
}) {
  if (!verifiedAt || !deviceAt) return null;

  const gapMs = new Date(verifiedAt).getTime() - new Date(deviceAt).getTime();
  if (Math.abs(gapMs) < NOTABLE_GAP_MS) return null;

  const deviceTime = new Date(deviceAt).toLocaleString();

  // Device behind the server: the normal offline case — recorded in the field,
  // delivered once there was a signal.
  if (gapMs > 0) {
    return (
      <p className="mt-1 text-xs text-muted">
        Recorded {deviceTime} on the device, {formatDuration(gapMs)} before it reached the server.
      </p>
    );
  }

  // Device ahead of the server: the phone's clock is wrong. Worth surfacing,
  // because it is the one case where the device time is misleading.
  return (
    <p className="mt-1 text-xs text-danger">
      The device clock read {deviceTime} — {formatDuration(-gapMs)} ahead of the verified time, so
      it is out of sync.
    </p>
  );
}
