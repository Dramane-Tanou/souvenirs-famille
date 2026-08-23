"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface FocalPointPickerProps {
  src: string;
  value: { x: number; y: number };
  onChange: (point: { x: number; y: number }) => void;
}

interface ContentBox {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// L'image est affichée en object-contain dans une boîte dont l'aspect ne
// correspond généralement pas à celui de la photo (ex. portrait dans une
// modale large) : des bandes vides apparaissent donc de chaque côté du
// contenu réel. Sans ce calcul, un clic près du bord de la boîte tombe dans
// cette zone vide et enregistre un point focal qui ne correspond à rien sur
// la vraie photo — c'est ce qui rendait le recadrage imprécis, voire
// inopérant, pour la plupart des photos de téléphone (portrait ou paysage).
function computeContentBox(img: HTMLImageElement): ContentBox | null {
  const rect = img.getBoundingClientRect();
  if (!rect.width || !rect.height || !img.naturalWidth || !img.naturalHeight) return null;

  const containerAspect = rect.width / rect.height;
  const imageAspect = img.naturalWidth / img.naturalHeight;

  let width = rect.width;
  let height = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > containerAspect) {
    height = rect.width / imageAspect;
    offsetY = (rect.height - height) / 2;
  } else {
    width = rect.height * imageAspect;
    offsetX = (rect.width - width) / 2;
  }

  return { width, height, offsetX, offsetY };
}

export function FocalPointPicker({ src, value, onChange }: FocalPointPickerProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [box, setBox] = useState<ContentBox | null>(null);

  const recomputeBox = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    const nextBox = computeContentBox(img);
    if (nextBox) setBox(nextBox);
  }, []);

  useEffect(() => {
    recomputeBox();
    const img = imageRef.current;
    if (!img) return;
    const observer = new ResizeObserver(recomputeBox);
    observer.observe(img);
    return () => observer.disconnect();
  }, [recomputeBox, src]);

  function pointFromEvent(clientX: number, clientY: number) {
    const img = imageRef.current;
    if (!img || !box) return null;
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = clamp(((clientX - rect.left - box.offsetX) / box.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top - box.offsetY) / box.height) * 100, 0, 100);
    return { x: Math.round(x), y: Math.round(y) };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const point = pointFromEvent(e.clientX, e.clientY);
    if (point) onChange(point);
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e: PointerEvent) {
      const point = pointFromEvent(e.clientX, e.clientY);
      if (point) onChange(point);
    }
    function handleUp() {
      setDragging(false);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, box]);

  return (
    <div className="space-y-2">
      <div
        className="relative inline-block w-full rounded-xl overflow-hidden bg-gray-100 cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt="Choisis la zone à mettre en avant"
          onLoad={recomputeBox}
          className="w-full max-h-80 object-contain mx-auto pointer-events-none"
          draggable={false}
        />
        {box && (
          <motion.div
            className="absolute w-7 h-7 rounded-full border-2 border-white bg-brand shadow-lg pointer-events-none"
            style={{
              left: `${box.offsetX + (value.x / 100) * box.width}px`,
              top: `${box.offsetY + (value.y / 100) * box.height}px`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: dragging ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-40" />
          </motion.div>
        )}
      </div>
      <p className="text-sm text-gray-500 text-center">
        Clique ou glisse sur la photo pour indiquer la zone à mettre en avant.
      </p>
    </div>
  );
}
