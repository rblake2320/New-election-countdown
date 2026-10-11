import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { OnboardingFlow } from "../client/src/components/onboarding-flow";

// Regression for lane D's Chrome retest of 5bbb0c1: registering from
// /auth?returnTo=... jumped straight to /dashboard and skipped preferences,
// because the flow redirected during render as soon as the new account was
// signed in, and its completion handlers forced /dashboard after onComplete.
describe("OnboardingFlow", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  function setup(signedInAtStart: boolean) {
    let signedIn = signedInAtStart;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/me") return signedIn ? new Response(JSON.stringify({ user: { id: "u9", email: "new@x.test" } })) : new Response("{}", { status: 401 });
      if (url === "/api/auth/register" && init?.method === "POST") { signedIn = true; return new Response(JSON.stringify({ user: { id: "u9" } })); }
      return new Response("[]");
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const loc = memoryLocation({ path: "/auth", record: true });
    const onComplete = vi.fn();
    render(<QueryClientProvider client={qc}><Router hook={loc.hook}><OnboardingFlow onComplete={onComplete} /></Router></QueryClientProvider>);
    return { loc, onComplete };
  }

  it("shows preferences after registering, then hands control back to the caller (no forced /dashboard)", async () => {
    const { loc, onComplete } = setup(false);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@x.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-1" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "correct-horse-1" } });
    fireEvent.submit(screen.getByLabelText("Email").closest("form")!);

    await screen.findByText(/Skip for now/i);           // preference step is shown
    await new Promise(r => setTimeout(r, 50));            // let the auth refetch land (now signed in)
    expect(screen.getByText(/Skip for now/i)).toBeTruthy(); // still on preferences, not redirected
    expect(loc.history).toEqual(["/auth"]);
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Skip for now/i));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(loc.history).toEqual(["/auth"]);               // the caller, not the flow, decides where to go
  });

  it("someone already signed in skips straight to the caller's completion", async () => {
    const { loc, onComplete } = setup(true);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(loc.history).toEqual(["/auth"]);
  });
});
