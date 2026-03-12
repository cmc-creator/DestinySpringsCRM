import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function stageBadgeClass(stage: string): string {
  const map: Record<string, string> = {
    DISCOVERY: "badge-muted",
    QUALIFICATION: "badge-warn",
    DEMO: "badge-warn",
    PROPOSAL: "badge-active",
    NEGOTIATION: "badge-active",
    CLOSED_WON: "badge-success",
    CLOSED_LOST: "badge-danger",
    ON_HOLD: "badge-muted",
  };
  return map[stage] ?? "badge-muted";
}

export function leadStatusBadge(status: string): string {
  const map: Record<string, string> = {
    NEW: "badge-active",
    CONTACTED: "badge-warn",
    QUALIFIED: "badge-warn",
    PROPOSAL_SENT: "badge-active",
    NEGOTIATING: "badge-active",
    WON: "badge-success",
    LOST: "badge-danger",
    UNQUALIFIED: "badge-muted",
  };
  return map[status] ?? "badge-muted";
}
