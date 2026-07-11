/**
 * The LocalNinja mascot, HR edition — same geometry as localninja.ca's
 * "NinjaBusiness" unit (the people person, happy arc eyes) with the studio's
 * yellow badge swapped for the NinjaHR blue. Pure inline SVG so the marketing
 * pages stay self-contained; the eye squint is driven by marketing.css.
 */
export function Mascot({ size = 300, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className ? `mkt-mascot ${className}` : "mkt-mascot"}
      viewBox="0 0 800 800"
      width={size}
      height={size}
      role="img"
      aria-label="NinjaHR mascot"
    >
      {/* blue badge background (localninja uses yellow #FFD84D) */}
      <rect width="800" height="800" fill="#4da3ff" />
      {/* bandana tails */}
      <path
        d="M640 290 C700 270 758 288 782 316 C738 314 700 334 668 350 C656 328 648 308 640 290 Z"
        fill="#000"
      />
      <path
        d="M646 366 C706 366 760 390 780 424 C736 413 698 428 674 444 C662 418 652 390 646 366 Z"
        fill="#000"
      />
      {/* head */}
      <circle cx="388" cy="420" r="300" fill="#000" />
      {/* eye band */}
      <rect x="112" y="312" width="372" height="134" rx="67" fill="#E8BE8E" />
      {/* happy arc eyes: the people person */}
      <g className="mkt-mascot-eyes">
        <path
          d="M162 404 Q207 352 252 404"
          fill="none"
          stroke="#000"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M343 404 Q388 352 433 404"
          fill="none"
          stroke="#000"
          strokeWidth="18"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
