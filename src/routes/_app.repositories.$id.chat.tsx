import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/common/code-block";
import { PageTransition } from "@/components/common/page-transition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatApi } from "@/lib/api/chat";
import { getAccessToken } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

export const Route = createFileRoute("/_app/repositories/$id/chat")({
  component: ChatPage,
});

const suggestedQuestions = [
  "How does authentication work?",
  "What is the overall architecture?",
  "Which files are most complex?",
  "Where should I start reading this codebase?",
];

function citationPath(href?: string) {
  if (!href || href.startsWith("http")) return null;
  const raw = href.replace(/^file:/, "").replace(/^\.\//, "");
  if (raw.includes("/") || /\.[a-z0-9]+$/i.test(raw)) return raw;
  return null;
}

function ChatPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const conversations = useQuery({ queryKey: ["conversations", id], queryFn: () => chatApi.conversations(id) });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const active = conversations.data?.find((conversation) => conversation.id === activeId);
  const thread = messages ?? active?.messages ?? [];

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isPending) return;
    const userMessage: ChatMessage = {
      id: `m_${Date.now()}`,
      role: "user",
      content: trimmed,
      at: new Date().toISOString(),
    };
    const aiMessage: ChatMessage = {
      id: `m_ai_${Date.now()}`,
      role: "assistant",
      content: "",
      at: new Date().toISOString(),
    };

    setMessages([...thread, userMessage, aiMessage]);
    setDraft("");
    setCitations([]);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(chatApi.streamUrl(id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: JSON.stringify({ question: trimmed, conversationId: activeId }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ") || line.trim() === "data: [DONE]") continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              content?: string;
              conversationId?: string;
              citations?: string[];
              error?: string;
            };
            if (data.conversationId) setActiveId(data.conversationId);
            if (data.citations?.length) setCitations(data.citations);
            if (data.error) {
              setError(data.error);
              setMessages((prev) => {
                const next = [...(prev || [])];
                const last = next[next.length - 1];
                if (last?.role === "assistant") last.content = data.error ?? last.content;
                return next;
              });
            }
            if (data.content) {
              setMessages((prev) => {
                const next = [...(prev || [])];
                const last = next[next.length - 1];
                if (last?.role === "assistant") last.content += data.content;
                return next;
              });
            }
          } catch {
            /* partial SSE chunk */
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["conversations", id] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      setError(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <PageTransition>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="rounded-[1.6rem] bg-white/[0.07] p-3 ring-1 ring-white/10">
          <div className="flex items-center justify-between px-2 py-1">
            <h2 className="text-sm font-semibold text-white">Threads</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="New conversation"
              className="size-8 text-white/70 hover:text-white"
              onClick={() => {
                setActiveId(null);
                setMessages([]);
                setCitations([]);
                setError(null);
              }}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
          <ul className="mt-2 space-y-1">
            {(conversations.data ?? []).length === 0 ? (
              <li className="px-2 py-3 text-sm text-white/40">No threads yet.</li>
            ) : (
              (conversations.data ?? []).map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(conversation.id);
                      setMessages(null);
                      setCitations([]);
                      setError(null);
                    }}
                    className={cn(
                      "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition",
                      conversation.id === activeId
                        ? "bg-[#C9A6FF] text-zinc-950"
                        : "text-white/65 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <span className="block truncate font-medium">{conversation.title}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px]",
                        conversation.id === activeId ? "text-zinc-600" : "text-white/35",
                      )}
                    >
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="flex min-h-[520px] flex-col rounded-[1.6rem] bg-white/[0.07] ring-1 ring-white/10">
          <div className="border-b border-white/10 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-white">Ask this repo</h2>
            <p className="mt-0.5 text-xs text-white/45">Answers come from files and docs we already parsed.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            {thread.length === 0 ? (
              <div>
                <p className="text-sm text-white/55">Try one of these:</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void ask(question)}
                      className="rounded-[1.2rem] bg-[#F3EDE4] px-4 py-3 text-left text-sm leading-snug text-zinc-950 transition hover:-translate-y-0.5"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              thread.map((message, index) => (
                <div
                  key={message.id}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[82%] px-4 py-3 text-sm leading-relaxed",
                      message.role === "user"
                        ? "rounded-[1.25rem_1.25rem_0.4rem_1.25rem] bg-[#C9A6FF] text-zinc-950"
                        : "rounded-[1.25rem_1.25rem_1.25rem_0.4rem] bg-black/30 text-white/85",
                    )}
                  >
                    {message.role === "user" ? (
                      message.content
                    ) : (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              const path = citationPath(href);
                              if (!path) {
                                return (
                                  <a href={href} className="text-[#C9A6FF] underline" target="_blank" rel="noreferrer">
                                    {children}
                                  </a>
                                );
                              }
                              return (
                                <Link
                                  to="/repositories/$id/files"
                                  params={{ id }}
                                  search={{ path }}
                                  className="inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-xs font-medium text-[#C9A6FF] no-underline hover:bg-white/16"
                                >
                                  {children}
                                </Link>
                              );
                            },
                            pre: ({ children }) => <>{children}</>,
                            code: ({ className, children }) => {
                              const text = String(children).replace(/\n$/, "");
                              const inline = !className && !text.includes("\n");
                              if (inline) {
                                return <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">{text}</code>;
                              }
                              return <CodeBlock code={text} language={className?.replace("language-", "") ?? "ts"} />;
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {index === thread.length - 1 && citations.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {citations.map((path) => (
                              <Link
                                key={path}
                                to="/repositories/$id/files"
                                params={{ id }}
                                search={{ path }}
                                className="rounded-full bg-[#F3EDE4] px-2.5 py-1 font-mono text-[11px] text-zinc-950 hover:bg-white"
                              >
                                {path.split("/").pop() ?? path}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            {isPending && thread[thread.length - 1]?.content === "" ? (
              <p className="flex items-center gap-2 text-xs text-white/45">
                <Loader2 className="size-3.5 animate-spin text-[#C9A6FF]" aria-hidden />
                Looking through the repo…
              </p>
            ) : null}
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          </div>

          <form
            className="flex items-end gap-2 border-t border-white/10 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about this repository…"
              aria-label="Message"
              rows={2}
              className="resize-none rounded-[1.15rem] border-white/10 bg-white/5 text-white"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
            />
            <Button type="submit" size="icon" aria-label="Send message" disabled={isPending} className="size-11 shrink-0">
              <Send className="size-4" />
            </Button>
          </form>
        </section>
      </div>
    </PageTransition>
  );
}
