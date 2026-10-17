import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WebhookReply = {
  success: boolean;
  conversationId: string;
  message: { id: string; role: string; content: string };
  metadata?: { model?: string; tokens?: number; duration?: number };
};

// Runs on the server so the webhook's basic-auth credentials never reach the browser.
export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        message: z.string().min(1).max(4000),
        conversationId: z.string().min(1).max(100),
        userId: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<WebhookReply> => {
    const url = process.env["N8N_WEBHOOK_URL"];
    const user = process.env["N8N_BASIC_AUTH_USER"] ?? "";
    const pass = process.env["N8N_BASIC_AUTH_PASSWORD"] ?? "";
    if (!url) throw new Error("Webhook URL is not configured");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
      },
      body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Webhook error (${res.status})`);
    const json = await res.json();
    const reply = (Array.isArray(json) ? json[0] : json) as WebhookReply;
    if (!reply?.message?.content) throw new Error("Balasan dari webhook kosong");
    return reply;
  });
