import { Link } from "@tanstack/react-router";
import { Github, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Repository } from "@/types";

const plates = ["#C9A6FF", "#5eead4", "#fdba74", "#f9a8d4"];
const tilts = [-7, 5, -4, 8];

function statusLabel(status: Repository["status"]) {
  if (status === "completed") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "analyzing") return "Analyzing";
  if (status === "queued") return "Queued";
  return "Not analyzed";
}

function ext(language: string) {
  const key = language.toLowerCase();
  if (key.includes("python")) return "py";
  if (key.includes("go")) return "go";
  if (key.includes("rust")) return "rs";
  if (key.includes("java")) return "java";
  if (key.includes("type")) return "ts";
  return "ts";
}

export function RepoWindow({
  repo,
  index,
  action,
}: {
  repo: Repository;
  index: number;
  action?: ReactNode;
}) {
  const fileExt = ext(repo.language);
  const health = repo.status === "completed" && repo.healthScore > 0 ? repo.healthScore : null;
  const plate = plates[index % plates.length];
  const tilt = tilts[index % tilts.length];
  const busy = repo.status === "queued" || repo.status === "analyzing";

  return (
    <motion.div
      className="relative isolate px-3 pt-3"
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: plate,
          borderRadius: "2.4rem 1.7rem 2.2rem 1.9rem",
          transform: `rotate(${tilt}deg)`,
        }}
        aria-hidden
      />
      {action ? <div className="absolute right-4 top-5 z-10">{action}</div> : null}
      <Link
        to="/repositories/$id"
        params={{ id: repo.id }}
        className="relative block overflow-hidden rounded-[1.35rem] bg-[#2a2a32] shadow-[0_28px_50px_-24px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
      >
        <div className="flex items-center gap-2 border-b border-white/12 bg-[#32323c] px-3 py-2 pr-10">
          <span className="size-2 rounded-full bg-[#ff5f57]" />
          <span className="size-2 rounded-full bg-[#febc2e]" />
          <span className="size-2 rounded-full bg-[#28c840]" />
          <span className="ml-1 flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-white/85">
            <Github className="size-3 shrink-0 text-white/70" aria-hidden />
            <span className="truncate">
              {repo.owner}/{repo.name}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4 p-4">
          <div className="min-w-0 font-mono text-[12px] leading-relaxed text-white/80">
            <p className="font-medium text-white">{repo.name}/</p>
            <p className="pl-3 text-white/75">src/</p>
            <p className="pl-6 text-white/75">index.{fileExt}</p>
            <p className="pl-6 text-white/75">api.{fileExt}</p>
            <p className="pl-3 text-white/75">README.md</p>
            {repo.stats.files > 0 ? (
              <p className="mt-3 text-[11px] text-white/65">
                {repo.stats.files} files
                {repo.stats.linesOfCode > 0
                  ? ` · ${repo.stats.linesOfCode.toLocaleString()} lines`
                  : ""}
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-white/65">{repo.language || "Repository"}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Health
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-[#E2C9FF]">
              {health ?? "—"}
            </p>
            <p className="mt-3 flex items-center justify-end gap-1.5 text-xs text-white/80">
              {busy ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
              {statusLabel(repo.status)}
            </p>
            {busy ? (
              <p className="mt-1 text-[10px] text-white/50">Usually 2–4 min</p>
            ) : repo.language ? (
              <p className="text-[12px] text-white/65">{repo.language}</p>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
