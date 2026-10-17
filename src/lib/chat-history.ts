import { z } from "zod";

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "error"]),
  content: z.string(),
  meta: z.string().optional(),
});
const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  messages: z.array(messageSchema),
});
export type Msg = z.infer<typeof messageSchema>;
export type ChatThread = z.infer<typeof threadSchema>;
export const historyKey = (userId: string) => `nutrizen:chat-history:v1:${userId}`;

export function readChatHistory(userId: string): ChatThread[] {
  const raw = localStorage.getItem(historyKey(userId));
  if (!raw) return [];
  return z.array(threadSchema).parse(JSON.parse(raw));
}
