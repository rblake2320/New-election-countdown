import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import FilterSidebar from "../client/src/components/filter-sidebar-new";

// ET-31: the panel renders twice (desktop column + mobile drawer). With fixed ids
// every label pointed at the first copy and the second copy's checkboxes had no
// accessible name.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

describe("FilterSidebar rendered twice", () => {
  afterEach(() => cleanup());
  it("each copy has unique ids and named checkboxes", () => {
    render(<><div data-testid="a"><FilterSidebar filters={{} as any} onFiltersChange={() => {}} /></div>
             <div data-testid="b"><FilterSidebar filters={{} as any} onFiltersChange={() => {}} /></div></>);
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const copy of ["a", "b"]) {
      const scope = within(screen.getByTestId(copy));
      for (const name of ["Federal", "State", "Local", "Democratic", "Republican", "General Elections"]) {
        expect(scope.getByRole("checkbox", { name })).toBeTruthy();
      }
    }
  });
});
