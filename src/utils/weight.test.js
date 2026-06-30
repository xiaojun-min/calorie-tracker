import { describe, it, expect } from "vitest";
import { toDisplay, toKg, KG_TO_LB } from "./weight";

describe("toDisplay", () => {
  it("rounds kg to 1 decimal place", () => {
    expect(toDisplay(70, "kg")).toBe(70);
    expect(toDisplay(70.567, "kg")).toBe(70.6);
    expect(toDisplay(70.54, "kg")).toBe(70.5);
  });

  it("converts kg to lb and rounds to 1 decimal", () => {
    expect(toDisplay(70, "lb")).toBe(Math.round(70 * KG_TO_LB * 10) / 10);
    expect(toDisplay(100, "lb")).toBe(Math.round(100 * KG_TO_LB * 10) / 10);
  });

  it("defaults to kg display when unit is kg", () => {
    expect(toDisplay(65, "kg")).toBe(65);
  });
});

describe("toKg", () => {
  it("returns value unchanged for kg unit, rounded to 2 decimal places", () => {
    expect(toKg(70, "kg")).toBe(70);
    expect(toKg(70.567, "kg")).toBe(70.57);
    expect(toKg(70.564, "kg")).toBe(70.56);
  });

  it("converts lb to kg, rounded to 2 decimal places", () => {
    const expected = Math.round((154 / KG_TO_LB) * 100) / 100;
    expect(toKg(154, "lb")).toBe(expected);
  });

  it("round-trips: toKg(toDisplay(kg, lb), lb) ≈ kg", () => {
    const original = 68.5;
    const displayed = toDisplay(original, "lb");
    const backToKg = toKg(displayed, "lb");
    // allow small rounding error from display rounding
    expect(backToKg).toBeCloseTo(original, 0);
  });
});

describe("unit toggle invariant", () => {
  it("converting a value to lb and back to kg yields the same entry weight", () => {
    const stored = 75; // kg
    const inLb = toDisplay(stored, "lb");
    const backKg = toKg(inLb, "lb");
    expect(backKg).toBeCloseTo(stored, 0);
  });
});
