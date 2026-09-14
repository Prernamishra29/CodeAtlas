import { cn } from "@/lib/utils";

const SRC = {
  onDark: "/blacklogo-removebg.png",
  onLight: "/white_logobg.png",
} as const;

const HEIGHT = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
  xl: "h-24 w-24",
} as const;

export function BrandMark({
  className,
  size = "md",
  variant = "onDark",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "onDark" | "onLight";
}) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden", HEIGHT[size], className)}>
      <img
        src={SRC[variant]}
        alt="CodeAtlas"
        className="absolute left-1/2 top-1/2 size-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
      />
    </span>
  );
}
