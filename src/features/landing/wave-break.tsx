import { ArrowDown } from "lucide-react";

export function WaveBreak({ href = "#capabilities" }: { href?: string }) {
  return (
    <div className="relative h-32 overflow-visible bg-background sm:h-44">
      <svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="absolute inset-x-0 -bottom-px h-[calc(100%+2px)] w-full text-[var(--cream)]"
        aria-hidden
      >
        <path fill="currentColor" d="M0 40C280 150 1160 150 1440 40V160H0Z" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-8 bg-[var(--cream)]" aria-hidden />
      <a
        href={href}
        className="absolute left-1/2 top-[78%] z-20 flex size-[5.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[conic-gradient(from_200deg,#5eead4,#c084fc,#fb7185,#5eead4)] p-[3px] shadow-[0_18px_40px_-12px_rgba(192,132,252,0.65)]"
        aria-label="Explore product"
      >
        <span className="flex size-full items-center justify-center rounded-full bg-[#0d0d0d] text-white">
          <ArrowDown className="size-5" />
        </span>
      </a>
    </div>
  );
}
