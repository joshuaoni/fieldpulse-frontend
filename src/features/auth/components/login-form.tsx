"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useSession } from "@/lib/session";
import { login } from "../api";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: string;
}

function Field({ id, label, icon, children, className = "", ...props }: FieldProps) {
  return (
    <div className={`relative ${className}`}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
      />

      <input
        id={id}
        {...props}
        className="h-14 w-full rounded-xl border border-border bg-surface pr-12 pl-12 text-base outline-none placeholder:text-sidebar-section-label focus:border-chip-active-edge"
      />

      {children}
    </div>
  );
}

export function LoginForm({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [askedToReset, setAskedToReset] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      await refresh();
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <Field
        id="email"
        label="Work email"
        icon="/icons/envelope.svg"
        type="email"
        required
        autoComplete="username"
        placeholder="Enter your work email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <Field
        id="password"
        label="Password"
        icon="/icons/password.svg"
        type={revealed ? "text" : "password"}
        required
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-4"
      >
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          aria-pressed={revealed}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-4 -translate-y-1/2 opacity-70 hover:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/eye.svg" alt="" aria-hidden className="size-5" />
        </button>
      </Field>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setAskedToReset(true)}
          className="text-sm text-muted hover:text-foreground hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      {askedToReset && (
        <p className="mt-2 text-right text-sm text-muted">
          Sign-in is held in Meta4 ERP — ask your administrator to reset it.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 h-13 w-full rounded-lg bg-sidebar-active-bg text-base font-medium text-sidebar-active-foreground disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
