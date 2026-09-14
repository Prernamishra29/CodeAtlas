import { motion } from "framer-motion";
import { HeartPulse, MessageSquareCode, Waypoints } from "lucide-react";

const cards = [
  {
    title: "Architecture",
    metric: "12",
    unit: "services",
    icon: Waypoints,
    gradient: "linear-gradient(160deg, #7ef0e0 0%, #22d3ee 45%, #0ea5e9 100%)",
    x: -86,
    rotate: -16,
    z: 1,
  },
  {
    title: "Health",
    metric: "84",
    unit: "score",
    icon: HeartPulse,
    gradient: "linear-gradient(160deg, #fbcfe8 0%, #e879f9 42%, #c084fc 100%)",
    x: 0,
    rotate: 4,
    z: 3,
  },
  {
    title: "Chat",
    metric: "Q&A",
    unit: "grounded",
    icon: MessageSquareCode,
    gradient: "linear-gradient(160deg, #fdba74 0%, #fb7185 50%, #f472b6 100%)",
    x: 90,
    rotate: 18,
    z: 2,
  },
];

export function MeshDeck() {
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-lg sm:h-[420px]">
      {cards.map((card, index) => (
        <motion.article
          key={card.title}
          className="absolute left-1/2 top-4 w-44 sm:w-52"
          style={{ zIndex: card.z, marginLeft: "-6.5rem" }}
          initial={{ opacity: 0, y: 36, x: 0, rotate: 0 }}
          animate={{ opacity: 1, y: 0, x: card.x, rotate: card.rotate }}
          whileHover={{ y: -22, scale: 1.06, rotate: card.rotate * 0.35, zIndex: 12 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: index * 0.06 }}
        >
          <div
            className="relative flex h-56 flex-col justify-between overflow-hidden rounded-[1.9rem] p-5 text-zinc-950 shadow-[0_32px_64px_-28px_rgba(0,0,0,0.6)] sm:h-64"
            style={{ background: card.gradient }}
          >
            <span className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-white/40 blur-2xl" />
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
            <card.icon className="relative size-6" aria-hidden />
            <div className="relative">
              <p className="font-display text-4xl font-extrabold tracking-tight">{card.metric}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-65">{card.unit}</p>
              <p className="mt-3 font-display text-lg font-bold">{card.title}</p>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
