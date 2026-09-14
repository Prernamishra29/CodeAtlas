import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SpotlightCard } from "@/components/common/spotlight-card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  index = 0,
  className,
  visual,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: string;
  index?: number;
  className?: string;
  visual?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <SpotlightCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {Icon ? (
            <span className="icon-well size-8">
              <Icon className="size-3.5" aria-hidden />
            </span>
          ) : null}
        </div>
        {visual ? (
          <div className="mt-3">{visual}</div>
        ) : (
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {trend ? <span className="text-success">{trend}</span> : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
