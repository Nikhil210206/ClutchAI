import { cn } from "@/lib/utils";

/** Scroll-driven reveal via CSS (`.reveal` + `animation-timeline: view()`).
 * Content is visible by default; the reveal is a progressive enhancement, so it
 * never risks leaving content stuck invisible (unlike JS opacity gating). */
export function Reveal({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("reveal", className)} style={style}>
      {children}
    </div>
  );
}
