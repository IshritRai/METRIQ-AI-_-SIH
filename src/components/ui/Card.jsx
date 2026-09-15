import { cn } from "../../lib/utils.js";

// Base panel used for role cards, KPI tiles, and (in later phases) case
// summaries. The brass top-border and subtle lift-on-hover are the app's
// signature card treatment (was `.lm-role-card`).
export function Card({ className, interactive = false, as: Comp = "div", ...props }) {
  return (
    <Comp
      className={cn(
        "bg-panel border border-border border-t-[3px] border-t-brass rounded-[4px] p-6 transition-[border-color,transform] duration-150",
        interactive && "cursor-pointer text-left hover:border-navy hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2",
        className
      )}
      {...props}
    />
  );
}
