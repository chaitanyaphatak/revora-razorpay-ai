import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  recovered: "border-teal-200 bg-teal-50 text-teal-700",
  failed: "border-orange-200 bg-orange-50 text-orange-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  "human-review-required": "border-orange-200 bg-orange-50 text-orange-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed_action: "border-red-200 bg-red-50 text-red-700",
  escalated: "border-violet-200 bg-violet-50 text-violet-700",
  skipped: "border-slate-200 bg-slate-100 text-slate-700",
};

export function humanize(value?: string | null) {
  if (!value) return "Not set";
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function StatusPill({ status, className }: { status?: string | null; className?: string }) {
  const normalized = status?.toLowerCase().replace(/_/g, "-") ?? "";
  return (
    <span className={cn("rr-status-pill inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.02em]", statusStyles[normalized] ?? "border-slate-200 bg-slate-50 text-slate-600", className)}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {humanize(status)}
    </span>
  );
}
