import { api } from "@/lib/api-client";
import type { Reminder } from "./types";

export async function fetchReminderSchedule(): Promise<Reminder[]> {
  const { reminders } = await api<{ reminders: Reminder[] }>("/api/reminders/schedule");
  return reminders;
}

export async function fetchVapidKey(): Promise<string> {
  const { publicKey } = await api<{ publicKey: string }>("/api/reminders/vapid-key");
  return publicKey;
}

export interface DeviceRegistration {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function registerDevice(input: DeviceRegistration): Promise<void> {
  await api("/api/reminders/devices", { method: "POST", body: JSON.stringify(input) });
}

export async function unregisterDevice(endpoint: string): Promise<void> {
  await api("/api/reminders/devices", { method: "DELETE", body: JSON.stringify({ endpoint }) });
}
