import { motion } from "framer-motion";

const nodes = [
  { id: "frontend", label: "Frontend", x: 70, y: 48, fill: "#22d3ee" },
  { id: "api", label: "API", x: 292, y: 36, fill: "#D9FF43" },
  { id: "services", label: "Services", x: 292, y: 168, fill: "#C084FC" },
  { id: "database", label: "Database", x: 500, y: 96, fill: "#fb7185" },
  { id: "workers", label: "Workers", x: 500, y: 228, fill: "#fdba74" },
  { id: "redis", label: "Redis", x: 78, y: 200, fill: "#67e8f9" },
];

const edges: Array<[string, string]> = [
  ["frontend", "api"],
  ["api", "services"],
  ["services", "database"],
  ["services", "workers"],
  ["redis", "services"],
  ["workers", "database"],
  ["frontend", "redis"],
];

const NODE_W = 128;
const NODE_H = 44;

function center(id: string) {
  const node = nodes.find((item) => item.id === id)!;
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

export function HeroTopology() {
  return (
    <div className="relative overflow-hidden bg-[#111114] p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(192,132,252,0.22),transparent_46%)]" />
      </div>
      <svg
        viewBox="0 0 660 300"
        className="relative w-full"
        role="img"
        aria-label="Architecture map of frontend, API, services, database, workers and Redis."
      >
        <defs>
          <linearGradient id="heroEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#D9FF43" />
          </linearGradient>
          <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map(([from, to], index) => {
          const a = center(from);
          const b = center(to);
          const path = `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
          return (
            <g key={`${from}-${to}`}>
              <path d={path} fill="none" stroke="#ffffff18" strokeWidth={1.6} />
              <motion.path
                d={path}
                fill="none"
                stroke="url(#heroEdge)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeDasharray="14 200"
                filter="url(#heroGlow)"
                initial={{ strokeDashoffset: 220 }}
                animate={{ strokeDashoffset: -220 }}
                transition={{
                  duration: 4.8,
                  repeat: Infinity,
                  ease: "linear",
                  delay: index * 0.45,
                }}
              />
            </g>
          );
        })}

        {nodes.map((node, index) => (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 + index * 0.07 }}
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={NODE_H}
              rx={14}
              fill="#1a1a1f"
              stroke={node.fill}
              strokeWidth={1.4}
            />
            <circle cx={node.x + 16} cy={node.y + NODE_H / 2} r={4} fill={node.fill} />
            <text
              x={node.x + 28}
              y={node.y + NODE_H / 2 + 5}
              fill="#f8f8f8"
              fontSize="13"
              fontFamily="Outfit, sans-serif"
              fontWeight="600"
            >
              {node.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
