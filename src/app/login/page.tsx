import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Sign in — FieldPulse" };

export default function LoginPage() {
  return (
    <main className="manager-tokens flex flex-1 flex-col justify-center bg-background px-6 py-12 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-start justify-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/meta4-logo.svg" alt="Meta4" className="h-10 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/444.svg" alt="" aria-hidden className="-mt-2 h-12 w-auto" />
        </div>

        <h1 className="mt-20 text-center text-[26px] font-bold tracking-tight">
          Sign in to continue
        </h1>
        <p className="mt-2 text-center text-[15px] text-muted">
          Verify visits, capture proof, report back.
        </p>

        <LoginForm className="mt-8" />
      </div>
    </main>
  );
}
