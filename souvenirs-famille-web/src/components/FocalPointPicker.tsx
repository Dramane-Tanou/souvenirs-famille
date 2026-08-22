"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface FocalPointPickerProps {
  src: string;
  value: { x: number; y: number };
  onChange: (point: { x: number; y: number }) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function FocalPointPicker({ src, value, onChange }: FocalPointPickerProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);

  function pointFromEvent(clientX: number, clientY: number) {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
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
  }, [dragging]);

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
          className="w-full max-h-80 object-contain mx-auto pointer-events-none"
          draggable={false}
        />
        <motion.div
          className="absolute w-7 h-7 rounded-full border-2 border-white bg-brand shadow-lg pointer-events-none"
          style={{ left: `${value.x}%`, top: `${value.y}%`, transform: "translate(-50%, -50%)" }}
          initial={{ scale: 0 }}
          animate={{ scale: dragging ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-40" />
        </motion.div>
      </div>
      <p className="text-sm text-gray-500 text-center">
        Clique ou glisse sur la photo pour indiquer la zone à mettre en avant.
      </p>
    </div>
  );
}
