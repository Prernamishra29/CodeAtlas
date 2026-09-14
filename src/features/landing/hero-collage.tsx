import { motion } from "framer-motion";
import { HeartPulse, MessageSquareCode, Waypoints } from "lucide-react";
import { ProductBlob } from "@/features/landing/product-blob";

const cards = [
  {
    title: "Architecture",
    metric: "12",
    unit: "services",
    icon: Waypoints,
    gradient: "linear-gradient(160deg, #7ef0e0 0%, #22d3ee 45%, #0ea5e9 100%)",
  },
  {
    title: "Health",
    metric: "84",
    unit: "score",
    icon: HeartPulse,
    gradient: "linear-gradient(160deg, #fbcfe8 0%, #e879f9 42%, #c084fc 100%)",
  },
  {
    title: "Chat",
    metric: "Q&A",
    unit: "grounded",
    icon: MessageSquareCode,
    gradient: "linear-gradient(160deg, #fdba74 0%, #fb7185 50%, #f472b6 100%)",
  },
];

export function HeroCollage() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto lg:mr-0">
      <ProductBlob />
      <div className="relative z-10 -mt-2 grid grid-cols-3 gap-2.5 px-2 sm:px-4">
        {cards.map((card, index) => (
          <motion.article
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
          >
            <div
              className="relative flex h-[6.5rem] flex-col justify-between overflow-hidden rounded-[1.35rem] p-3 text-zinc-950 sm:h-[7rem] sm:p-3.5"
              style={{ background: card.gradient }}
            >
              <span className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-white/40 blur-xl" />
              <card.icon className="relative size-4" aria-hidden />
              <div className="relative">
                <p className="font-display text-xl font-semibold leading-none">{card.metric}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] opacity-60">
                  {card.unit}
                </p>
                <p className="mt-1 text-[12px] font-semibold">{card.title}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
