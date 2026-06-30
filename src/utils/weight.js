export const KG_TO_LB = 2.20462;

export function toDisplay(kg, unit) {
  if (unit === "lb") return Math.round(kg * KG_TO_LB * 10) / 10;
  return Math.round(kg * 10) / 10;
}

export function toKg(val, unit) {
  if (unit === "lb") return Math.round((val / KG_TO_LB) * 100) / 100;
  return Math.round(val * 100) / 100;
}
