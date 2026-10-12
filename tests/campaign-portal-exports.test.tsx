import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CampaignPortal } from "../client/src/components/campaign-portal";

// ET-38 owner decision: data exports are not built, so the tab stays visible but
// disabled with "Coming soon", and the page offers no export for sale.
// The register body follows the success shape in server/routes.ts
// (POST /api/campaign/register); it is not a recorded response, because lane B
// may only GET the shared server. Later calls answer as the server does today for
// a registered key (ET-40: the key is never stored).
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

const registered = {
  success: true,
  message: "Campaign registered successfully",
  data: {
    apiKey: "camp_1760227200000_abcdefghijkl",
    campaignId: 1760227200000,
    subscription: { tier: "pro", features: ["District-level analytics", "Demographic breakdowns", "Daily reports", "Email alerts"], isActive: true, monthlyLimit: 5000 },
    electionInfo: { id: 2, title: "U.S. Senate Election - Alaska", location: "AK", date: "2026-11-03T00:00:00.000Z" },
  },
};

async function registerAndOpenPortal() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/campaign/register") return new Response(JSON.stringify(registered), { status: 200 });
    return new Response(JSON.stringify({ error: "Invalid API key or inactive account" }), { status: 400 });
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CampaignPortal /></QueryClientProvider>);
  for (const input of screen.getAllByRole("textbox")) fireEvent.change(input, { target: { value: input.getAttribute("type") === "email" ? "ops@example.org" : "Example Campaign" } });
  fireEvent.click(screen.getByRole("button", { name: /register/i }));
  return screen.findByRole("tablist");
}

describe("campaign portal exports and error states (ET-38)", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows the exports tab disabled and labelled Coming soon", async () => {
    const tabs = await registerAndOpenPortal();
    const exportsTab = within(tabs).getByRole("tab", { name: /data exports/i });
    expect(exportsTab).toHaveAccessibleName("Data Exports Coming soon");
    expect(exportsTab).toBeDisabled();
    fireEvent.mouseDown(exportsTab, { button: 0 });
    fireEvent.click(exportsTab);
    expect(exportsTab).toHaveAttribute("aria-selected", "false");
  });

  it("a rejected analytics request is an error with retry, not \"No analytics data\"", async () => {
    await registerAndOpenPortal();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Analytics could not be loaded (400): Invalid API key or inactive account.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByText("No analytics data available")).toBeNull();
  });

  it("offers nothing for sale: no Purchase button and no export prices", async () => {
    const tabs = await registerAndOpenPortal();
    // Try to open it the way a customer would; inactive tab panels are not mounted.
    const exportsTab = within(tabs).getByRole("tab", { name: /data exports/i });
    fireEvent.mouseDown(exportsTab, { button: 0, ctrlKey: false });
    fireEvent.keyDown(exportsTab, { key: "Enter" });
    fireEvent.click(exportsTab);
    expect(screen.queryByRole("button", { name: /purchase/i })).toBeNull();
    expect(screen.queryByText(/\$(25|50|75|100)\b/)).toBeNull();
    expect(screen.queryByText(/Purchase and download/i)).toBeNull();
  });
});
