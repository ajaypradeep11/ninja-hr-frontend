import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  consoleLabel,
  className,
  logoClassName = "h-9 w-9",
  nameClassName = "text-[15px] font-bold text-brand-700 dark:text-brand-400",
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
        src="/LOGO.png"
        alt={`${BRAND.name} logo`}
        width={800}
        height={800}
        priority={false}
        className={cn("rounded-xl object-contain shadow-sm", logoClassName)}
      />
      <span className="leading-tight">
        <span className={cn("block", nameClassName)}>{BRAND.name}</span>
        {consoleLabel && <span className={cn("block", labelClassName)}>{consoleLabel}</span>}
      </span>
    </span>
  );
}
