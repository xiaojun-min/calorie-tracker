import { describe, it, expect } from "vitest";
import { parseFraction, scaleResult } from "./claude";

describe("parseFraction", () => {
  it("parses slash fractions", () => {
    expect(parseFraction("1/2")).toBeCloseTo(0.5);
    expect(parseFraction("1/4")).toBeCloseTo(0.25);
    expect(parseFraction("1/8")).toBeCloseTo(0.125);
    expect(parseFraction("3/4")).toBeCloseTo(0.75);
    expect(parseFraction("2/3")).toBeCloseTo(2 / 3);
    expect(parseFraction("1 / 8")).toBeCloseTo(0.125);
  });

  it("parses decimal strings", () => {
    expect(parseFraction("0.5")).toBeCloseTo(0.5);
    expect(parseFraction("0.125")).toBeCloseTo(0.125);
    expect(parseFraction("0.25")).toBeCloseTo(0.25);
    expect(parseFraction("1")).toBe(1);
    expect(parseFraction("2")).toBe(2);
  });

  it("parses word fractions", () => {
    expect(parseFraction("half")).toBeCloseTo(0.5);
    expect(parseFraction("a half")).toBeCloseTo(0.5);
    expect(parseFraction("one half")).toBeCloseTo(0.5);
    expect(parseFraction("quarter")).toBeCloseTo(0.25);
    expect(parseFraction("a quarter")).toBeCloseTo(0.25);
    expect(parseFraction("one quarter")).toBeCloseTo(0.25);
    expect(parseFraction("one fourth")).toBeCloseTo(0.25);
    expect(parseFraction("third")).toBeCloseTo(1 / 3);
    expect(parseFraction("a third")).toBeCloseTo(1 / 3);
    expect(parseFraction("one third")).toBeCloseTo(1 / 3);
    expect(parseFraction("eighth")).toBeCloseTo(0.125);
    expect(parseFraction("one eighth")).toBeCloseTo(0.125);
    expect(parseFraction("two thirds")).toBeCloseTo(2 / 3);
    expect(parseFraction("three quarters")).toBeCloseTo(0.75);
    expect(parseFraction("three fourths")).toBeCloseTo(0.75);
  });

  it("is case-insensitive", () => {
    expect(parseFraction("HALF")).toBeCloseTo(0.5);
    expect(parseFraction("One Quarter")).toBeCloseTo(0.25);
  });

  it("returns null for unrecognised text", () => {
    expect(parseFraction("a large handful")).toBeNull();
    expect(parseFraction("some")).toBeNull();
    expect(parseFraction("big slice")).toBeNull();
  });

  it("returns null for empty / falsy input", () => {
    expect(parseFraction("")).toBeNull();
    expect(parseFraction(null)).toBeNull();
    expect(parseFraction(undefined)).toBeNull();
  });

  it("1/8 and 0.125 parse to the same value", () => {
    expect(parseFraction("1/8")).toBeCloseTo(parseFraction("0.125"));
  });

  it("one eighth and 0.125 parse to the same value", () => {
    expect(parseFraction("one eighth")).toBeCloseTo(parseFraction("0.125"));
  });
});

describe("scaleResult", () => {
  const whole = {
    name: "Watermelon",
    emoji: "🍉",
    calories: 800,
    protein: 16,
    carbs: 200,
    fat: 4,
    fiber: 8,
    sugar: 160,
    sodium: 40,
    saturated_fat: 0,
    health_rating: 9,
  };

  it("scales all nutrition fields by fraction", () => {
    const result = scaleResult(whole, 0.5, "half");
    expect(result.calories).toBe(400);
    expect(result.protein).toBe(8);
    expect(result.carbs).toBe(100);
    expect(result.fat).toBe(2);
    expect(result.fiber).toBe(4);
    expect(result.sugar).toBe(80);
    expect(result.sodium).toBe(20);
    expect(result.saturated_fat).toBe(0);
  });

  it("1/8 and 0.125 produce identical scaled results", () => {
    const a = scaleResult(whole, parseFraction("1/8"), "1/8");
    const b = scaleResult(whole, parseFraction("0.125"), "0.125");
    expect(a.calories).toBe(b.calories);
    expect(a.protein).toBe(b.protein);
    expect(a.carbs).toBe(b.carbs);
    expect(a.fat).toBe(b.fat);
  });

  it("appends portion to name", () => {
    const result = scaleResult(whole, 0.25, "1/4");
    expect(result.name).toContain("1/4");
    expect(result.name).toContain("Watermelon");
  });

  it("truncates name to 40 chars", () => {
    const longName = { ...whole, name: "A".repeat(35) };
    const result = scaleResult(longName, 0.5, "half");
    expect(result.name.length).toBeLessThanOrEqual(40);
  });

  it("handles missing (zero) nutrition keys gracefully", () => {
    const sparse = { name: "Snack", emoji: "🍿", calories: 100 };
    const result = scaleResult(sparse, 0.5, "half");
    expect(result.calories).toBe(50);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
  });

  it("does not mutate the original object", () => {
    scaleResult(whole, 0.5, "half");
    expect(whole.calories).toBe(800);
    expect(whole.name).toBe("Watermelon");
  });

  it("rounds to nearest integer", () => {
    const odd = { ...whole, calories: 100, protein: 7 };
    const result = scaleResult(odd, 1 / 3, "third");
    expect(Number.isInteger(result.calories)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
  });
});
