import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  filename,
  language = "ts",
  className,
}: {
  code: string;
  filename?: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <figure className={cn("overflow-hidden rounded-[1.45rem] bg-white/[0.07] ring-1 ring-white/10", className)}>
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
        <figcaption className="truncate font-mono text-xs text-white/70">
          {filename ?? `snippet.${language}`}
        </figcaption>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Copy code"
          className="size-7"
          onClick={copy}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code className="font-mono text-white/80">{code}</code>
      </pre>
    </figure>
  );
}
