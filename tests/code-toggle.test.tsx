import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CodeToggle from "../client/src/components/CodeToggle";

describe("CodeToggle tab buttons", () => {
  afterEach(() => cleanup());

  it("falsy non-boolean response/json never render as stray text", () => {
    const { container } = render(<CodeToggle curl="curl https://example.test" response={0} json={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Show code" }));
    const bar = container.querySelector(".flex.gap-2")!;
    expect(bar.textContent).toBe("cURL");
  });

  it("truthy response and json still get their tabs", () => {
    render(<CodeToggle response={{ ok: true }} json={{ a: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Show code" }));
    expect(screen.getByRole("button", { name: "Response" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "JSON" })).toBeTruthy();
  });
});
