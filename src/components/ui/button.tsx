import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "dark" | "outline";
}

const styles = {
  primary: "px-4 py-2.5 bg-brand text-brand-ink",
  secondary: "px-4 py-2.5 border border-border",
  dark: `inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[15px]
         bg-sidebar-active-bg text-sidebar-active-foreground
         hover:not-disabled:opacity-90`,
  outline: `inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[15px]
            border border-control-edge bg-surface text-sidebar-foreground
            hover:not-disabled:bg-sidebar-hover-bg`,
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
      className={`min-h-11 rounded-lg font-medium disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
