import { BrandMark } from "@/components/brand-mark";

export const metadata = { title: "Offline — FieldPulse" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <BrandMark className="h-12 w-12 opacity-60" />
      <h1 className="mt-5 text-xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        This screen needs a connection. Anything you recorded in the field is saved on this device
        and syncs automatically once you&apos;re back online.
      </p>
    </main>
  );
}
