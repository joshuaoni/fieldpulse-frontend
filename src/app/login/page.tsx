import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Sign in — FieldPulse" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="h-14 w-14" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">FieldPulse</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your Meta4 ERP account.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
