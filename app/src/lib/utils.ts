import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function invariant(condition: any, message?: string): asserts condition {
  if (condition) {
    return;
  }
  throw new Error(message || "Invariant failed");
}
