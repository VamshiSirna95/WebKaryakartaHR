import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number in Indian notation: ₹X,XX,XXX
 */
export function formatINR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";

  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split(".");

  // Indian grouping: last 3 digits, then groups of 2
  let result = "";
  const len = intPart.length;
  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.slice(remaining.length - 2) + "," + result;
      remaining = remaining.slice(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      result = remaining + "," + result;
    }
  }

  // Only show decimals if non-zero
  const formatted =
    decPart && decPart !== "00" ? `${result}.${decPart}` : result;
  return `${isNegative ? "-" : ""}₹${formatted}`;
}

/**
 * Format a number in Indian notation without currency symbol
 */
export function formatIndianNumber(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";

  const isNegative = num < 0;
  const abs = Math.abs(num);
  const intPart = Math.floor(abs).toString();

  let result = "";
  const len = intPart.length;
  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.slice(remaining.length - 2) + "," + result;
      remaining = remaining.slice(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      result = remaining + "," + result;
    }
  }

  return `${isNegative ? "-" : ""}${result}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get initials from a full name (first + last initial)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Deterministic avatar gradient based on initials
 */
const AVATAR_GRADIENTS = [
  ["#0A84FF", "#64D2FF"], // blue→teal
  ["#FF375F", "#BF5AF2"], // pink→purple
  ["#30D158", "#64D2FF"], // green→teal
  ["#BF5AF2", "#0A84FF"], // purple→blue
  ["#FF9F0A", "#FFD60A"], // orange→amber
  ["#FF453A", "#FF375F"], // red→pink
];

export function getAvatarGradient(initials: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index] as [string, string];
}
