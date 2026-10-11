import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnboardingPreferences } from "../client/src/components/onboarding-preferences";

// Regression for lane D's Chrome retest of d25246f: clicking Next on step 3
// POSTed /api/user/preferences/onboarding and finished, skipping step 4. React
// reused the Next <button> for Complete, so its type became "submit" during the
// click and the browser submitted the form.
// jsdom lacks ResizeObserver, which Radix form controls call on mount.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

describe("OnboardingPreferences step navigation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("Next on step 3 shows step 4 and saves nothing; only Complete saves", async () => {
    const posts: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") posts.push(url);
      return new Response("{}");
    }));
    const onComplete = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><OnboardingPreferences onComplete={onComplete} onSkip={() => {}} /></QueryClientProvider>);
    const user = userEvent.setup();

    for (let step = 1; step <= 3; step++) {
      expect(screen.getByText(`Step ${step} of 4`)).toBeTruthy();
      await user.click(screen.getByTestId("next-button"));   // real click: default action runs
    }
    expect(screen.getByText("Step 4 of 4")).toBeTruthy();
    expect(posts).toEqual([]);
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("complete-button"));
    await waitFor(() => expect(posts).toEqual(["/api/user/preferences/onboarding"]));
  });

  it("a form submit on an early step (Enter in a field) never saves", async () => {
    const posts: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => { if (init?.method === "POST") posts.push(url); return new Response("{}"); }));
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><OnboardingPreferences onComplete={() => {}} onSkip={() => {}} /></QueryClientProvider>);
    fireEvent.submit(screen.getByTestId("navigation-buttons").closest("form")!);
    await new Promise(r => setTimeout(r, 300));
    expect(posts).toEqual([]);
    expect(screen.queryByText("Step 4 of 4")).toBeNull();
  });
});
