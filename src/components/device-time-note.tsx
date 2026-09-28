/**
 * Explains the gap between when the phone recorded an action and when the
 * server verified it.
 *
 * The time shown above this line is when the action happened. This says what
 * the server's own stamp was, so a long sync delay is visible rather than
 * silently folded into the arrival time — and so a phone whose clock is ahead,
 * the one case where the device is not merely late but wrong, is called out.
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

  // Device behind the server: the normal offline case — recorded in the field,
  // delivered once there was a signal.
  if (gapMs > 0) {
    return (
      <p className="mt-1 text-xs text-muted">
        Recorded on the device, {formatDuration(gapMs)} before it reached the server. Verified{" "}
        {new Date(verifiedAt).toLocaleString()}.
      </p>
    );
  }

  // Device ahead of the server: the phone's clock is wrong, so the time above
  // is the server's. The one case where the device's account is not merely
  // late but misleading.
  return (
    <p className="mt-1 text-xs text-danger">
      The device clock read {new Date(deviceAt).toLocaleString()} — {formatDuration(-gapMs)} ahead
      of when the server received this, so it is out of sync and the verified time is shown.
    </p>
  );
}
