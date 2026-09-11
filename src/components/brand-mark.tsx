export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <circle cx="24" cy="24" r="24" fill="var(--brand)" />
      <circle cx="24" cy="24" r="18" fill="none" stroke="var(--brand-ink)" strokeOpacity="0.5" strokeWidth="1.6" />
      <circle cx="24" cy="24" r="11" fill="none" stroke="var(--brand-ink)" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="4.6" fill="var(--brand-ink)" />
    </svg>
  );
}
