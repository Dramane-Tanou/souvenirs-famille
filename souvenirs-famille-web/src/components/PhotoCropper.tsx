"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

export interface CropValue {
  x: number;
  y: number;
  zoom: number;
}

interface PhotoCropperProps {
  src: string;
  value: CropValue;
  onChange: (value: CropValue) => void;
  /** Largeur / hauteur du cadre de recadrage (1 = carré, par défaut). */
  aspect?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fraction de l'image (largeur, hauteur), en 0..1, visible dans le cadre à
 * zoom 1 — c'est la même géométrie qu'un object-fit:cover : un des deux axes
 * montre l'image en entier (1), l'autre est rogné.
 */
function baseVisibleFractions(imageAspect: number, frameAspect: number) {
  if (imageAspect > frameAspect) {
    return { w: frameAspect / imageAspect, h: 1 };
  }
  return { w: 1, h: imageAspect / frameAspect };
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Outil de recadrage façon iPhone : la photo entière reste manipulable
 * (glisser pour déplacer, pincer ou molette pour zoomer) sous un cadre fixe
 * qui représente exactement la zone finale visible. Contrairement à un simple
 * point focal, ceci permet de vraiment zoomer sur un détail — pas seulement
 * choisir quelle partie centrer.
 */
export function PhotoCropper({ src, value, onChange, aspect = 1 }: PhotoCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function handleImageLoad() {
    const img = imgRef.current;
    if (img && img.naturalWidth && img.naturalHeight) {
      setImageAspect(img.naturalWidth / img.naturalHeight);
    }
  }

  // Le cadre doit respecter `aspect`, mais un ratio très étroit (ex. une case
  // de mise en page en bandeau) ferait sinon exploser sa hauteur en CSS pur
  // (aspect-ratio + largeur pleine, sans limite) au point de repousser le
  // bouton "Enregistrer" hors de l'écran. On calcule donc une taille en
  // pixels qui respecte `aspect` tout en restant dans la largeur disponible
  // ET dans une hauteur raisonnable — même principe qu'un object-fit:contain.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function recompute() {
      const availableWidth = container!.clientWidth;
      const maxHeight = Math.min(window.innerHeight * 0.45, 420);
      if (!availableWidth || !maxHeight) return;

      let width = availableWidth;
      let height = width / aspect;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspect;
      }
      setFrameSize({ width, height });
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [aspect]);

  const applyZoom = useCallback(
    (nextZoom: number) => {
      if (!imageAspect) return;
      const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const base = baseVisibleFractions(imageAspect, aspect);
      const visW = base.w / clampedZoom;
      const visH = base.h / clampedZoom;
      const x = clamp(valueRef.current.x / 100, (visW / 2) * 100, 100 - (visW / 2) * 100);
      const y = clamp(valueRef.current.y / 100, (visH / 2) * 100, 100 - (visH / 2) * 100);
      onChange({ x, y, zoom: clampedZoom });
    },
    [imageAspect, aspect, onChange]
  );

  function panBy(dxPx: number, dyPx: number) {
    if (!imageAspect) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;

    const { x, y, zoom } = valueRef.current;
    const base = baseVisibleFractions(imageAspect, aspect);
    const visW = base.w / zoom;
    const visH = base.h / zoom;
    const imgWidthPx = rect.width / visW;
    const imgHeightPx = rect.height / visH;

    const deltaU = (-dxPx / imgWidthPx) * 100;
    const deltaV = (-dyPx / imgHeightPx) * 100;

    const newX = clamp(x + deltaU, (visW / 2) * 100, 100 - (visW / 2) * 100);
    const newY = clamp(y + deltaV, (visH / 2) * 100, 100 - (visH / 2) * 100);
    onChange({ x: newX, y: newY, zoom });
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchDistanceRef.current = distanceBetween(a, b);
    }
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    const previous = pointersRef.current.get(e.pointerId)!;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const distance = distanceBetween(a, b);
      if (pinchDistanceRef.current) {
        const ratio = distance / pinchDistanceRef.current;
        applyZoom(valueRef.current.zoom * ratio);
      }
      pinchDistanceRef.current = distance;
      return;
    }

    if (pointersRef.current.size === 1) {
      panBy(e.clientX - previous.x, e.clientY - previous.y);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchDistanceRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      setDragging(false);
    }
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      applyZoom(valueRef.current.zoom - e.deltaY * 0.0015);
    }

    frame.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleWheel);
  }, [applyZoom]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full flex justify-center">
        <div
          ref={frameRef}
          style={frameSize ? { width: frameSize.width, height: frameSize.height } : { width: "100%", aspectRatio: aspect }}
          className={`relative overflow-hidden rounded-xl bg-gray-900 touch-none select-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Photo à recadrer"
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              objectPosition: `${value.x}% ${value.y}%`,
              transform: value.zoom !== 1 ? `scale(${value.zoom})` : undefined,
              transformOrigin: `${value.x}% ${value.y}%`,
            }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          {/* Grille façon règle des tiers, repère visuel classique de recadrage. */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ZoomOut size={16} className="text-gray-400 flex-shrink-0" />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={value.zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          className="w-full accent-brand"
          aria-label="Zoom"
        />
        <ZoomIn size={16} className="text-gray-400 flex-shrink-0" />
      </div>
      <p className="text-sm text-gray-500 text-center">
        Glisse la photo pour la repositionner, pince ou utilise le curseur pour zoomer.
      </p>
    </div>
  );
}
