import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/common/brand-mark";

export const authField = "h-11 rounded-2xl border-white/10 bg-white/[0.07] text-white placeholder:text-white/35";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#1c1c22]">
      <header className="flex h-24 items-center px-5 sm:px-8">
        <Link to="/" className="flex items-center" aria-label="CodeAtlas home">
          <BrandMark size="lg" />
        </Link>
        <Link to="/" className="ml-auto text-sm text-white/50 transition hover:text-white">
          Home
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <section className="w-full max-w-md rounded-[2rem] bg-white/[0.06] p-7 ring-1 ring-white/10 sm:p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-white/50">{footer}</div> : null}
        </section>
      </main>
    </div>
  );
}
