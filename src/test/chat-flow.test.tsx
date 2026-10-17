import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

const state = vi.hoisted(() => ({
  userId: "user_test",
  signedIn: true,
  loading: false,
  send: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
  ClerkLoading: ({ children }: { children: ReactNode }) => (state.loading ? children : null),
  SignedIn: ({ children }: { children: ReactNode }) =>
    state.signedIn && !state.loading ? children : null,
  SignedOut: ({ children }: { children: ReactNode }) =>
    !state.signedIn && !state.loading ? children : null,
  SignIn: (props: unknown) => {
    state.signIn(props);
    return <div>Sign in</div>;
  },
  UserButton: () => null,
  useUser: () => ({ user: { id: state.userId }, isSignedIn: state.signedIn }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => state.send }));
vi.mock("@/lib/chat-webhook", () => ({ sendChatMessage: vi.fn() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

import { Route } from "@/routes/chat";
import { Route as IndexRoute } from "@/routes/index";
import { createChatId } from "@/lib/chat-id";
const Chat = Route.options.component as ComponentType;

beforeEach(() => {
  localStorage.clear();
  state.userId = "user_test";
  state.signedIn = true;
  state.loading = false;
  state.send.mockReset();
  state.signIn.mockClear();
  vi.spyOn(Route, "useSearch").mockReturnValue({ q: "Sarapan cepat" });
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Chat flow", () => {
  it("sends through the custom webhook and persists no credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "Custom reply" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Pengaturan webhook" }));
    fireEvent.change(screen.getByLabelText("Webhook yang digunakan"), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("URL webhook"), {
      target: { value: "https://example.com/chat" },
    });
    fireEvent.change(screen.getByLabelText("Autentikasi"), { target: { value: "basic" } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "tester" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await screen.findByText("Custom reply");
    expect(state.send).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/chat",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa("tester:secret"),
        },
      }),
    );
    expect(JSON.parse(localStorage.getItem("nutrizen:webhook:v1:user_test")!)).toEqual({
      mode: "custom",
      url: "https://example.com/chat",
      auth: "basic",
    });
    view.unmount();
    render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Buka pengaturan webhook untuk melanjutkan/)).toBeInTheDocument();
  });

  it("remembers the light theme after remounting", () => {
    const view = render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Aktifkan mode terang" }));
    expect(document.documentElement).toHaveClass("light");
    expect(localStorage.getItem("nutrizen:theme")).toBe("light");
    view.unmount();
    render(<Chat />);
    expect(screen.getByRole("button", { name: "Aktifkan mode gelap" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aktifkan mode gelap" }));
    expect(document.documentElement).toHaveClass("dark");
  });

  it("shows Mulai Chat on the homepage for signed-in users", () => {
    const Index = IndexRoute.options.component as ComponentType;
    const view = render(<Index />);
    expect(screen.queryByText("Masuk")).not.toBeInTheDocument();
    expect(screen.getAllByText("Mulai Chat")).toHaveLength(2);
    state.signedIn = false;
    view.rerender(<Index />);
    expect(screen.getByText("Masuk")).toBeInTheDocument();
    expect(screen.getByText("Mulai Sekarang")).toBeInTheDocument();
  });

  it("opens an accessible history drawer", () => {
    render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Buka riwayat obrolan" }));
    expect(screen.getByRole("dialog", { name: "Obrolan Anda" })).toBeInTheDocument();
  });

  it("restores history and continues the original conversation after reload", async () => {
    state.send.mockResolvedValue({ message: { content: "Balasan tersimpan" } });
    const view = render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await screen.findByText("Balasan tersimpan");
    const originalId = state.send.mock.calls[0]![0].data.conversationId;
    fireEvent.click(screen.getByRole("button", { name: "Obrolan baru" }));
    expect(screen.queryByText("Balasan tersimpan")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sarapan cepat" }));
    expect(screen.getByText("Balasan tersimpan")).toBeInTheDocument();
    view.unmount();
    vi.mocked(Route.useSearch).mockReturnValue({});
    render(<Chat />);
    expect(await screen.findByText("Balasan tersimpan")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Menu lainnya" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await waitFor(() => expect(state.send).toHaveBeenCalledTimes(2));
    expect(state.send.mock.calls[1]![0].data.conversationId).toBe(originalId);
  });

  it("keeps history separate when the signed-in account changes", async () => {
    state.send.mockResolvedValue({ message: { content: "Pesan pribadi" } });
    const view = render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await screen.findByText("Pesan pribadi");
    state.userId = "another_user";
    view.rerender(<Chat />);
    expect(screen.queryByText("Pesan pribadi")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sarapan cepat" })).not.toBeInTheDocument();
  });

  it("still sends messages when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    state.send.mockResolvedValue({ message: { content: "Tetap bisa chat" } });
    render(<Chat />);
    expect(screen.getByText(/Riwayat tidak dapat disimpan/)).toHaveAttribute("role", "status");
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await screen.findByText("Tetap bisa chat");
  });

  it("hydrates the loading screen before resolving authentication", async () => {
    state.loading = true;
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Chat />);
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    const errors = vi.spyOn(console, "error");
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <Chat />, { onRecoverableError });
      });
      expect(container.textContent).toContain("Memuat obrolan");
      state.loading = false;
      state.signedIn = false;
      await act(async () => {
        root!.render(<Chat />);
      });
      expect(container.textContent).toContain("Sign in");
      state.signedIn = true;
      await act(async () => {
        root!.render(<Chat />);
      });
      expect(container.querySelector("textarea")?.value).toBe("Sarapan cepat");
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
    }
  });

  it("never treats a scroll result as effect cleanup", async () => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    state.send.mockResolvedValue({ message: { content: "Balasan" } });
    const view = render(
      <StrictMode>
        <Chat />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await screen.findByText("Balasan");
    view.unmount();
  });

  it("opens and sends on HTTP origins without randomUUID", async () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const id = createChatId();
    expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    state.send.mockResolvedValue({ message: { content: "Balasan" } });
    render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await screen.findByText("Balasan");
    expect(state.send).toHaveBeenCalledWith({
      data: {
        message: "Sarapan cepat",
        conversationId: expect.any(String),
        userId: "user_test",
      },
    });
  });

  it("preserves the selected prompt through sign-in and sign-up", () => {
    state.signedIn = false;
    render(<Chat />);
    expect(state.signIn).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRedirectUrl: "/chat?q=Sarapan+cepat",
        signUpForceRedirectUrl: "/chat?q=Sarapan+cepat",
      }),
    );
  });

  it("shows a loading state while authentication initializes", () => {
    state.loading = true;
    render(<Chat />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat obrolan");
  });

  it("prevents resetting a pending conversation and recovers after failure", async () => {
    let reject: (error: Error) => void = () => {};
    state.send.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    expect(screen.getByRole("button", { name: "Obrolan baru" })).toBeDisabled();
    reject(new Error("Webhook unavailable"));
    await screen.findByText("Webhook unavailable");
    await waitFor(() => expect(screen.getByRole("button", { name: "Obrolan baru" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Obrolan baru" }));
    expect(screen.queryByText("Webhook unavailable")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
