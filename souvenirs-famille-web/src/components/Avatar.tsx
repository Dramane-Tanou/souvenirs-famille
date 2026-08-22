"use client";

import { storageUrl } from "@/lib/api";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "w-6 h-6 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-2xl",
};

interface AvatarProps {
  name: string;
  avatarPath?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name, avatarPath, size = "md", className = "" }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (avatarPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={storageUrl(avatarPath)}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-brand flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}
    >
      {initialsOf(name)}
    </div>
  );
}
