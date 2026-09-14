import { HeroTopology } from "@/features/landing/hero-topology";

/** One smooth lilac mass around the architecture window. */
export function ProductBlob() {
  return (
    <div className="relative isolate mx-auto w-full max-w-[38rem]">
      <div
        className="absolute inset-[2%] bg-[#C9A6FF]"
        style={{
          borderRadius: "3.2rem 4.8rem 3.6rem 5.2rem",
          transform: "rotate(-8deg)",
        }}
        aria-hidden
      />

      <div className="relative mx-7 my-7 overflow-hidden rounded-[1.85rem] bg-[#0c0c0e] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/20 sm:mx-9 sm:my-8 sm:rounded-[2.1rem]">
        <div className="flex items-center gap-2 border-b border-white/8 bg-black/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] text-white/45">
            atlas.local / architecture
          </span>
        </div>
        <HeroTopology />
      </div>
    </div>
  );
}
