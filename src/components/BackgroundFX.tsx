// Decorative animated gradient orbs that sit behind the glass panels so the
// frosted blur has color to refract. Purely visual, fixed, non-interactive.
export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="fx-orb"
        style={{
          top: "-12%",
          left: "8%",
          width: "42rem",
          height: "42rem",
          background: "radial-gradient(circle, oklch(0.66 0.19 277 / 0.55), transparent 70%)",
          animation: "fx-float-a 18s ease-in-out infinite",
        }}
      />
      <div
        className="fx-orb"
        style={{
          top: "10%",
          right: "-8%",
          width: "36rem",
          height: "36rem",
          background: "radial-gradient(circle, oklch(0.7 0.18 320 / 0.45), transparent 70%)",
          animation: "fx-float-b 22s ease-in-out infinite",
        }}
      />
      <div
        className="fx-orb"
        style={{
          bottom: "-15%",
          left: "30%",
          width: "40rem",
          height: "40rem",
          background: "radial-gradient(circle, oklch(0.72 0.17 190 / 0.35), transparent 70%)",
          animation: "fx-float-c 26s ease-in-out infinite",
        }}
      />
      {/* faint grid + vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
        }}
      />
    </div>
  );
}
