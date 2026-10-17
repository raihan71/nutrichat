import type { WebhookReply } from "./chat-webhook";

export type WebhookSettings = {
  mode: "default" | "custom";
  url: string;
  auth: "none" | "basic" | "bearer";
  username: string;
  password: string;
  token: string;
};

export const defaultWebhookSettings: WebhookSettings = {
  mode: "default",
  url: "",
  auth: "none",
  username: "",
  password: "",
  token: "",
};

export function validateWebhookSettings(settings: WebhookSettings): string | undefined {
  if (settings.mode === "default") return;
  try {
    const url = new URL(settings.url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash)
      return "Gunakan URL HTTP/HTTPS tanpa kredensial atau fragment.";
    if (
      typeof location !== "undefined" &&
      location.protocol === "https:" &&
      url.protocol !== "https:"
    )
      return "Gunakan HTTPS agar webhook dapat diakses dari halaman ini.";
  } catch {
    return "Masukkan URL webhook yang valid.";
  }
  if (
    settings.auth === "basic" &&
    (!settings.username || !settings.password || settings.username.includes(":"))
  )
    return "Isi username (tanpa titik dua) dan password Basic Auth.";
  if (settings.auth === "bearer" && (!settings.token.trim() || /[\r\n]/.test(settings.token)))
    return "Masukkan Bearer token yang valid.";
  return undefined;
}

export async function sendCustomChatMessage(
  settings: WebhookSettings,
  data: { message: string; conversationId: string; userId: string },
): Promise<WebhookReply> {
  const error = validateWebhookSettings(settings);
  if (error) throw new Error(error);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.auth === "basic") {
    const bytes = new TextEncoder().encode(`${settings.username}:${settings.password}`);
    headers["Authorization"] =
      `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))}`;
  }
  if (settings.auth === "bearer") headers["Authorization"] = `Bearer ${settings.token.trim()}`;
  let response: Response;
  try {
    response = await fetch(settings.url, {
      method: "POST",
      headers,
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
    });
  } catch {
    throw new Error("Webhook tidak dapat diakses. Periksa koneksi, URL, dan izin CORS webhook.");
  }
  if (!response.ok) throw new Error(`Webhook error (${response.status})`);
  const json = await response.json();
  const reply = Array.isArray(json) ? json[0] : json;
  if (typeof reply?.message?.content !== "string" || !reply.message.content)
    throw new Error("Balasan dari webhook kosong atau tidak valid");
  return reply as WebhookReply;
}
