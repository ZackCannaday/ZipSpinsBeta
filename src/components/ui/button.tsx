import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold tracking-wide transition-[transform,background-color,opacity] duration-[var(--motion-quick)] disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]",
        "active:scale-[0.98]",
        variant === "primary" &&
          "bg-[var(--color-ember)] text-[var(--color-ember-fg)] hover:bg-[var(--color-ember-2)]",
        variant === "ghost" && "bg-transparent text-[var(--color-cloud)] hover:bg-white/5",
        variant === "outline" &&
          "border border-[var(--color-line-strong)] bg-transparent text-[var(--color-cloud)] hover:bg-white/5",
        variant === "danger" && "bg-[var(--color-loss)] text-[var(--color-cloud)] hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
});
