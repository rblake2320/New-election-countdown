import { formatDateLocal, formatCountdown } from "@/utils/date";

test("formatDateLocal returns friendly date", () => {
  const s = formatDateLocal("2025-11-03T12:00:00Z");
  expect(s).toMatch(/\w{3}, \w{3} \d{1,2}, 2025/);
});

test("formatCountdown caps to two units", () => {
  const f = formatCountdown("2025-11-03T12:00:00Z");
  expect(f.label.split(" ").length).toBeLessThanOrEqual(2);
});