const orbits = [
  { labels: ["TS", "Go", "Rust", "Java", "C#"], duration: "24s", scale: 0.42 },
  { labels: ["Python", "Kotlin", "Ruby", "PHP", "SQL"], duration: "34s", scale: 0.66 },
  { labels: ["JS", "C++", "Swift", "Scala", "Elixir"], duration: "46s", scale: 0.9 },
];

/** Full concentric orbits. Rings spin; round badges sit on the line and stay readable. */
export function StackOrbitPanel() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[32rem]">
      {orbits.map((orbit) => {
        const step = (2 * Math.PI) / orbit.labels.length;
        const size = `${orbit.scale * 100}%`;
        return (
          <div
            key={orbit.scale}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div
              className="stack-orbit-ring relative rounded-full border border-dashed border-zinc-400/70"
              style={{ width: size, height: size, animationDuration: orbit.duration }}
            >
              {orbit.labels.map((label, iconIdx) => {
                const angle = iconIdx * step - Math.PI / 2;
                const x = 50 + 50 * Math.cos(angle);
                const y = 50 + 50 * Math.sin(angle);
                return (
                  <div
                    key={label}
                    className="pointer-events-auto absolute"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="stack-orbit-badge flex size-11 items-center justify-center rounded-full bg-zinc-950 font-display text-[10px] font-bold tracking-tight text-white shadow-[0_12px_24px_-14px_rgba(0,0,0,0.55)] ring-2 ring-[#F3EDE4] sm:size-12 sm:text-[11px]"
                      style={{ animationDuration: orbit.duration }}
                      title={label}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="flex size-[4.5rem] items-center justify-center rounded-full bg-[#C9A6FF] text-center font-display text-[11px] font-semibold leading-tight text-zinc-950 ring-4 ring-[#F3EDE4] sm:size-[5.25rem] sm:text-xs">
          Languages
          <br />
          we map
        </div>
      </div>
    </div>
  );
}

export default StackOrbitPanel;
