import { cn } from "@/lib/utils";

export function AuroraOrbs({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="aurora-orb absolute -left-24 -top-28 size-[28rem] rounded-full bg-violet/30 blur-3xl" />
      <div
        className="aurora-orb absolute -right-16 top-10 size-80 rounded-full bg-primary/15 blur-3xl"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="aurora-orb absolute bottom-[-6rem] left-1/3 size-72 rounded-full bg-cyan/20 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />
    </div>
  );
}
