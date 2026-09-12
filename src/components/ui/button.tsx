import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

const styles = {
  primary: "bg-brand text-brand-ink",
  secondary: "border border-border",
} as const;

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-lg px-4 py-2.5 font-medium disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
