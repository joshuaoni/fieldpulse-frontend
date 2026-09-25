import type { VisitAttendance } from "./types";

/**
 * When a field action happened, as against when the server took delivery of it.
 *
 * The same rule the server applies, so a rep and a manager are reading the
 * same arrival time. 
 */

const TOLERANCE_MS = 2 * 60 * 1000;

function plausible(deviceAt: string, verifiedAt: string, notBefore?: string | null): boolean {
  const device = new Date(deviceAt).getTime();
  if (device > new Date(verifiedAt).getTime() + TOLERANCE_MS) return false;
  if (notBefore && device < new Date(notBefore).getTime()) return false;

  return true;
}

function resolve(
  deviceAt: string | null,
  verifiedAt: string | null,
  notBefore?: string | null,
): string | null {
  if (!verifiedAt) return null;
  if (!deviceAt) return verifiedAt;

  return plausible(deviceAt, verifiedAt, notBefore) ? deviceAt : verifiedAt;
}

/** When the rep arrived. */
export const arrivedAt = (attendance: VisitAttendance, notBefore?: string | null) =>
  resolve(attendance.clientLocalCheckInAt, attendance.checkInAt, notBefore);

/** When the rep left. */
export const leftAt = (attendance: VisitAttendance, notBefore?: string | null) =>
  resolve(attendance.clientLocalCheckOutAt, attendance.checkOutAt, notBefore);
