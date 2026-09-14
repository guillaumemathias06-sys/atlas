import { describe, it, expect } from "vitest";
import { mean, median, stddev, percentileOf, min, max } from "@/lib/utils/stats";

describe("stats utils", () => {
  it("computes mean/median correctly", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3])).toBe(2);
  });

  it("handles empty arrays without throwing", () => {
    expect(mean([])).toBe(0);
    expect(median([])).toBe(0);
    expect(stddev([])).toBe(0);
    expect(min([])).toBe(0);
    expect(max([])).toBe(0);
  });

  it("computes percentile: lower price = lower percentile", () => {
    const history = [100, 200, 300, 400, 500];
    expect(percentileOf(100, history)).toBe(20);
    expect(percentileOf(500, history)).toBe(100);
  });
});
