import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultWebhookSettings,
  sendCustomChatMessage,
  validateWebhookSettings,
} from "@/lib/custom-webhook";

afterEach(() => vi.unstubAllGlobals());
const data = { message: "Hello", conversationId: "thread", userId: "user" };
const settings = {
  ...defaultWebhookSettings,
  mode: "custom" as const,
  url: "https://example.com/chat",
};

describe("Custom webhook", () => {
  it("rejects non-HTTP URLs and credentials embedded in URLs", () => {
    for (const url of [
      "file:///etc/passwd",
      "javascript:alert(1)",
      "https://user:pass@example.com",
    ]) {
      expect(validateWebhookSettings({ ...settings, url })).toBeTruthy();
    }
  });
  it("sends Bearer auth and supports array replies without leaking config into the body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [{ message: { content: "Reply" } }] });
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await sendCustomChatMessage({ ...settings, auth: "bearer", token: "token" }, data),
    ).toEqual({ message: { content: "Reply" } });
    const request = fetchMock.mock.calls[0]![1];
    expect(request.headers.Authorization).toBe("Bearer token");
    expect(JSON.parse(request.body)).toEqual({ ...data, timestamp: expect.any(String) });
    expect(request.redirect).toBe("error");
    expect(request.credentials).toBe("omit");
  });
  it("reports network and malformed reply failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendCustomChatMessage(settings, data)).rejects.toThrow("CORS");
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ message: { content: 42 } }) });
    await expect(sendCustomChatMessage(settings, data)).rejects.toThrow("tidak valid");
  });
});
