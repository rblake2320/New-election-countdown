import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Countdown from "@/components/Countdown";

vi.useFakeTimers();

test("shows mm:ss when under 60 minutes", () => {
  const future = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  render(<Countdown when={future} />);
  expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
});

test("shows Dd Hh when days remain", () => {
  const future = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();
  render(<Countdown when={future} />);
  expect(screen.getByText(/\d+d \d+h/)).toBeInTheDocument();
});

test("handles invalid date gracefully", () => {
  render(<Countdown when={undefined} />);
  expect(screen.getByText(/TBD|Today/)).toBeInTheDocument();
});