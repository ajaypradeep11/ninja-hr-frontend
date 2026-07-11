import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Wordmark: the product name renders in neutral ink with its "HR" suffix in the
// brand blue — "Ninja" + a blue "HR".
const HR_SUFFIX = "HR";
const nameHasHrSuffix = BRAND.name.endsWith(HR_SUFFIX);
const namePrefix = nameHasHrSuffix ? BRAND.name.slice(0, -HR_SUFFIX.length) : BRAND.name;
const nameAccent = nameHasHrSuffix ? HR_SUFFIX : "";

export function BrandMark({
  consoleLabel,
  className,
  logoClassName = "h-9 w-9",
  nameClassName = "text-[15px] font-bold text-ink",
  labelClassName = "text-[10px] font-semibold uppercase tracking-wider text-ink-faint",
}: {
  consoleLabel?: string;
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
  labelClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo-ring.png"
        alt={`${BRAND.name} logo`}
        width={500}
        height={500}
        priority={false}
        className={cn("object-contain", logoClassName)}
      />
      <span className="leading-tight">
        <span className={cn("block", nameClassName)}>
          {namePrefix}
          <span className="text-brand-500 dark:text-brand-400">{nameAccent}</span>
        </span>
        {consoleLabel && <span className={cn("block", labelClassName)}>{consoleLabel}</span>}
      </span>
    </span>
  );
}
