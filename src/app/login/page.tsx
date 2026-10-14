import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in — FieldPulse" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center bg-background px-6 py-12 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex justify-center">
          <BrandMark className="size-24" />
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
