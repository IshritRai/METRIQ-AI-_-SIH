import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

// Shared button primitive. Variants map onto the existing legacy classes'
// visual intent (`.lm-landing-cta-primary`, `.lm-btn`, `.lm-link-btn`) so new
// screens read as the same product, not a different app bolted on.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded font-semibold font-body transition-[background,border-color,color,transform,box-shadow] duration-[250ms] ease-[var(--ease-lm-out)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-brass border border-brass text-navy-deep hover:bg-brass-strong hover:border-brass-strong hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(173,127,51,0.55)] active:translate-y-0",
        dark:
          "bg-transparent border border-paper/25 text-paper hover:border-paper/60 hover:-translate-y-0.5",
        secondary:
          "bg-panel border border-border text-navy-deep hover:border-navy hover:-translate-y-0.5",
        ghost:
          "bg-transparent border border-transparent text-ink-soft hover:bg-panel-alt hover:text-ink",
        link:
          "bg-transparent border border-transparent text-navy underline-offset-2 hover:underline p-0 font-medium",
      },
      size: {
        default: "px-[22px] py-3 text-sm",
        sm: "px-3.5 py-2 text-[13px]",
        icon: "p-2",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export function Button({ className, variant, size, as: Comp = "button", ...props }) {
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
