import { cn } from "@/lib/utils";

const DEFAULT_ITEMS = [
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "Kotlin",
  "Swift",
  "C#",
  "Ruby",
  "PHP",
  "Scala",
  "Elixir",
  "C++",
  "SQL",
];

export function LogoMarquee({
  items = DEFAULT_ITEMS,
  className,
  fade = true,
}: {
  items?: string[];
  className?: string;
  fade?: boolean;
}) {
  const loop = [...items, ...items];
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {fade ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        </>
      ) : null}
      <div className="animate-marquee flex w-max gap-10 py-3">
        {loop.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="font-mono text-sm tracking-widest text-muted-foreground/70"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
