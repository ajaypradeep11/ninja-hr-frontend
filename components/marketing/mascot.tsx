import Image from "next/image";

/**
 * The real NinjaHR logo (katana ninja in the blue ring, transparent PNG) —
 * used as both the marketing brand mark and the hero art. The float/idle
 * motion comes from marketing.css (.mkt-mascot).
 */
export function Mascot({ size = 300, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-ring.png"
      alt="NinjaHR mascot"
      width={size}
      height={size}
      priority={size > 100}
      className={className ? `mkt-mascot ${className}` : "mkt-mascot"}
    />
  );
}
