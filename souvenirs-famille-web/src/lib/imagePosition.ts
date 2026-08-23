import type { CSSProperties } from "react";

/**
 * Style à appliquer à un <img className="object-cover"> pour qu'il affiche le
 * cadrage choisi par la famille (point de centrage + zoom). object-position
 * place le point (x%, y%) de l'image au point (x%, y%) du conteneur ; ajouter
 * un transform:scale() avec le MÊME point comme transform-origin agrandit
 * l'image en gardant ce point fixe à l'écran — donc le point qui apparaît
 * visuellement au centre du zoom reste exactement celui choisi lors du
 * recadrage (src/components/PhotoCropper.tsx).
 */
export function focalPointStyle(
  focalX?: number | null,
  focalY?: number | null,
  zoom?: number | null
): CSSProperties {
  const x = focalX ?? 50;
  const y = focalY ?? 50;
  const z = zoom ?? 1;
  return {
    objectPosition: `${x}% ${y}%`,
    transform: z !== 1 ? `scale(${z})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  };
}
