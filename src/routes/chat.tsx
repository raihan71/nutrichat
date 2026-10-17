import { AssistantMessage } from "@/components/assistant-message";
import { ThemeToggle } from "@/components/theme-toggle";
import { WebhookSettingsDialog } from "@/components/webhook-settings";
import {
  defaultWebhookSettings,
  sendCustomChatMessage,
  validateWebhookSettings,
  type WebhookSettings,
} from "@/lib/custom-webhook";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/chat-webhook";
import { createChatId } from "@/lib/chat-id";
import { useServerFn } from "@tanstack/react-start";
import { ClerkLoading, SignIn, SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";

import { readChatHistory, historyKey, type Msg, type ChatThread } from "@/lib/chat-history";
import { Menu, MessageSquare, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Obrolan — NutriZenChat" },
      {
        name: "description",
        content: "Tanyakan apa saja ke NutriZen tentang makanan, gizi, dan kebiasaan sehat.",
      },
      { property: "og:title", content: "Obrolan — NutriZenChat" },
      {
        property: "og:description",
        content: "Tanyakan apa saja ke NutriZen tentang makanan, gizi, dan kebiasaan sehat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chat,
});

function Chat() {
  const { user } = useUser();
  const { q } = Route.useSearch();
  const redirectUrl = q ? `/chat?${new URLSearchParams({ q })}` : "/chat";
  return (
    <>
      <ClerkLoading>
        <div role="status" className="flex min-h-screen items-center justify-center p-6">
          Memuat obrolan…
        </div>
      </ClerkLoading>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center p-6">
          <SignIn
            routing="hash"
            forceRedirectUrl={redirectUrl}
            signUpForceRedirectUrl={redirectUrl}
          />
        </div>
      </SignedOut>
      <SignedIn>
        <ChatInner key={user?.id} />
      </SignedIn>
    </>
  );
}

function ChatInner() {
  const { user } = useUser();
  const send$ = useServerFn(sendChatMessage);
  const { q } = Route.useSearch();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(q ?? "");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [webhook, setWebhook] = useState<WebhookSettings>(defaultWebhookSettings);
  const [settingsNotice, setSettingsNotice] = useState("");
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`nutrizen:webhook:v1:${user.id}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (
        (saved.mode === "default" || saved.mode === "custom") &&
        typeof saved.url === "string" &&
        ["none", "basic", "bearer"].includes(saved.auth)
      ) {
        setWebhook({
          ...defaultWebhookSettings,
          mode: saved.mode,
          url: saved.url,
          auth: saved.auth,
          outputFormat: saved.outputFormat === "table" ? "table" : undefined,
        });
      }
    } catch {
      setSettingsNotice("Pengaturan webhook tidak dapat dimuat. Menggunakan default aplikasi.");
    }
  }, [user?.id]);

  function saveWebhook(value: WebhookSettings) {
    setWebhook(value);
    try {
      localStorage.setItem(
        `nutrizen:webhook:v1:${user!.id}`,
        JSON.stringify({
          mode: value.mode,
          url: value.url,
          auth: value.auth,
          outputFormat: value.outputFormat,
        }),
      );
      setSettingsNotice("");
    } catch {
      setSettingsNotice(
        "Pengaturan berlaku untuk sesi ini, tetapi tidak dapat disimpan di browser.",
      );
    }
  }
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = readChatHistory(user.id);
      setThreads(saved);
      const latest = q ? undefined : saved[0];
      setConversationId(latest?.id ?? createChatId());
      setMessages(latest?.messages ?? []);
    } catch {
      setStorageError(true);
      setConversationId(createChatId());
    }
    setReady(true);
  }, [user?.id, q]);

  useEffect(() => {
    if (!ready || !user?.id) return;
    try {
      localStorage.setItem(historyKey(user.id), JSON.stringify(threads));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [threads, ready, user?.id]);

  useEffect(() => {
    if (!ready || !messages.length) return;
    setThreads((previous) => [
      {
        id: conversationId,
        title: messages.find((m) => m.role === "user")?.content.slice(0, 80) ?? "Obrolan",
        updatedAt: Date.now(),
        messages,
      },
      ...previous.filter((thread) => thread.id !== conversationId),
    ]);
  }, [messages, conversationId, ready]);

  function newChat() {
    if (sendingRef.current) return;
    setMessages([]);
    setInput("");
    setConversationId(createChatId());
    setSidebarOpen(false);
  }

  function openThread(thread: ChatThread) {
    if (sendingRef.current) return;
    setConversationId(thread.id);
    setMessages(thread.messages);
    setInput("");
    setSidebarOpen(false);
  }

  const history = (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <button
        disabled={loading || !ready}
        onClick={newChat}
        className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Plus className="h-4 w-4" /> Obrolan baru
      </button>
      <nav aria-label="Riwayat obrolan" className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Obrolan sebelumnya
        </p>
        {threads.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">
            Obrolan pertama Anda akan muncul di sini.
          </p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            disabled={loading}
            onClick={() => openThread(thread)}
            aria-current={thread.id === conversationId ? "page" : undefined}
            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-40 ${thread.id === conversationId ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate">{thread.title}</span>
          </button>
        ))}
      </nav>
      <WebhookSettingsDialog value={webhook} onSave={saveWebhook} disabled={loading} />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Riwayat tersimpan di browser ini.
      </p>
    </div>
  );
  useEffect(() => {
    // Do not return the browser API result: React reserves returns for cleanup.
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || sendingRef.current || !user || !conversationId) return;
    const settingsError = validateWebhookSettings(webhook);
    if (settingsError) {
      setSettingsNotice(settingsError + " Buka pengaturan webhook untuk melanjutkan.");
      return;
    }
    setSettingsNotice("");
    sendingRef.current = true;
    setInput("");
    setMessages((m) => [...m, { id: createChatId(), role: "user", content: text }]);
    setLoading(true);
    try {
      const data = {
        message: text,
        conversationId,
        userId: user.id,
        outputFormat: webhook.outputFormat,
      };
      const r =
        webhook.mode === "custom"
          ? await sendCustomChatMessage(webhook, data)
          : await send$({ data });
      setMessages((m) => [
        ...m,
        {
          id: r.message.id ?? createChatId(),
          role: "assistant",
          content: r.message.content,
          meta: r.metadata
            ? `${r.metadata.model ?? ""} · ${r.metadata.tokens ?? "?"} tokens · ${r.metadata.duration ?? "?"}s`
            : undefined,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: createChatId(),
          role: "error",
          content: e instanceof Error ? e.message : "Terjadi kesalahan",
        },
      ]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-72 shrink-0 flex-col gap-8 border-r border-border bg-card/60 p-5 md:flex">
        <Link to="/" className="font-display text-xl font-extrabold">
          nutrizen<span className="text-primary">.</span>
        </Link>
        {history}
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="glow-blob bg-glow-2 h-96 w-96 -right-20 -top-20" />
        <div className="glow-blob bg-glow-1 h-80 w-80 -left-20 bottom-0" />
        <header className="relative z-10 flex items-center justify-between border-b border-border px-6 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Buka riwayat obrolan"
                  className="rounded-lg p-2 hover:bg-secondary md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <SheetTitle>Obrolan Anda</SheetTitle>
                <SheetDescription className="sr-only">
                  Buka obrolan sebelumnya atau mulai obrolan baru.
                </SheetDescription>
                {history}
              </SheetContent>
            </Sheet>
            <span className="truncate font-semibold">NutriZen Chat</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>

        <div className="relative z-10 px-6 pt-2 text-xs text-muted-foreground">
          {webhook.mode === "custom" ? "Webhook sendiri" : "Webhook default"}
        </div>
        {settingsNotice && (
          <p role="status" className="relative z-10 px-6 py-2 text-sm text-destructive">
            {settingsNotice}
          </p>
        )}
        {storageError && (
          <p role="status" className="relative z-10 px-6 py-2 text-sm text-destructive">
            Riwayat tidak dapat disimpan di browser ini. Obrolan tetap dapat digunakan.
          </p>
        )}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
            {messages.length === 0 && (
              <div className="mt-24 text-center">
                <h1 className="text-4xl font-extrabold md:text-6xl">
                  Mau <span className="text-gradient">makan</span> apa hari ini?
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Tanyakan soal menu, makro, anggaran, atau keinginan makan Anda.
                </p>
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="self-end whitespace-pre-wrap break-words max-w-[80%] rounded-2xl rounded-br-md bg-primary px-5 py-3 font-medium text-primary-foreground"
                >
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="flex min-w-0 gap-3 max-w-[90%]">
                  <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-gradient-brand grid place-items-center text-sm">
                    🥑
                  </div>
                  <div className="min-w-0">
                    {m.role === "error" ? (
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-destructive">
                        {m.content}
                      </p>
                    ) : (
                      <AssistantMessage content={m.content} />
                    )}
                    {m.meta && <p className="mt-1 text-xs text-muted-foreground">{m.meta}</p>}
                  </div>
                </div>
              ),
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-brand grid place-items-center text-sm animate-pulse">
                  🥑
                </div>
                <span className="text-muted-foreground animate-pulse">Sedang berpikir…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-6"
        >
          <div className="flex items-end gap-2 rounded-3xl border border-border bg-card/80 p-2 backdrop-blur focus-within:border-primary transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={4000}
              aria-label="Pesan untuk NutriZen"
              placeholder="Tanya NutriZen…"
              className="min-w-0 max-h-40 flex-1 resize-none bg-transparent px-4 py-3 outline-none placeholder:text-muted-foreground"
            />
            <button
              disabled={loading || !conversationId || !input.trim()}
              className="h-11 shrink-0 rounded-full bg-primary px-6 font-bold text-primary-foreground disabled:opacity-40 transition-opacity"
            >
              Kirim
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
