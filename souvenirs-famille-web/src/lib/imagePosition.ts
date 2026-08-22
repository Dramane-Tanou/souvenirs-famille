import type { CSSProperties } from "react";

export function focalPointStyle(focalX?: number | null, focalY?: number | null): CSSProperties {
  const x = focalX ?? 50;
  const y = focalY ?? 50;
  return { objectPosition: `${x}% ${y}%` };
}
