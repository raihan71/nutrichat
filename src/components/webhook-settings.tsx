import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validateWebhookSettings, type WebhookSettings } from "@/lib/custom-webhook";

export function WebhookSettingsDialog({
  value,
  onSave,
  disabled,
}: {
  value: WebhookSettings;
  onSave: (value: WebhookSettings) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDraft(value);
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <button
          disabled={disabled}
          aria-label="Pengaturan webhook"
          title="Pengaturan webhook"
          className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Pengaturan webhook
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengaturan webhook</DialogTitle>
          <DialogDescription>
            Pilih webhook dan format jawaban untuk pesan berikutnya.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const cleaned = { ...draft, url: draft.url.trim() };
            const problem = validateWebhookSettings(cleaned);
            if (problem) {
              setError(problem);
              return;
            }
            onSave(cleaned);
            setOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="webhook-mode">Webhook yang digunakan</Label>
            <select
              id="webhook-mode"
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              value={draft.mode}
              onChange={(e) =>
                setDraft({ ...draft, mode: e.target.value as WebhookSettings["mode"] })
              }
            >
              <option value="default">Default aplikasi</option>
              <option value="custom">Webhook sendiri</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="output-format">Format jawaban AI</Label>
            <select
              id="output-format"
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              value={draft.outputFormat ?? "auto"}
              onChange={(e) =>
                setDraft({ ...draft, outputFormat: e.target.value as "auto" | "table" })
              }
            >
              <option value="auto">Otomatis</option>
              <option value="table">Tabel</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Preferensi dikirim ke webhook. Pilih Tabel untuk meminta jawaban berupa tabel
              Markdown.
            </p>
          </div>
          {draft.mode === "default" ? (
            <p className="text-sm text-muted-foreground">
              Menggunakan webhook dan autentikasi yang dikonfigurasi di server.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">URL webhook</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  required
                  placeholder="https://example.com/webhook/chat"
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-auth">Autentikasi</Label>
                <select
                  id="webhook-auth"
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  value={draft.auth}
                  onChange={(e) =>
                    setDraft({ ...draft, auth: e.target.value as WebhookSettings["auth"] })
                  }
                >
                  <option value="none">Tanpa autentikasi</option>
                  <option value="basic">Basic Auth</option>
                  <option value="bearer">Bearer token</option>
                </select>
              </div>
              {draft.auth === "basic" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-user">Username</Label>
                    <Input
                      id="webhook-user"
                      required
                      autoComplete="off"
                      value={draft.username}
                      onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-password">Password</Label>
                    <Input
                      id="webhook-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={draft.password}
                      onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                    />
                  </div>
                </>
              )}
              {draft.auth === "bearer" && (
                <div className="space-y-2">
                  <Label htmlFor="webhook-token">Bearer token</Label>
                  <Input
                    id="webhook-token"
                    type="password"
                    required
                    autoComplete="off"
                    value={draft.token}
                    onChange={(e) => setDraft({ ...draft, token: e.target.value })}
                  />
                </div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pesan dikirim ke URL ini dari browser. Webhook harus mengizinkan CORS. Password dan
                token hanya berlaku sampai halaman dimuat ulang.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
