import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  trend?: { value: string; positive?: boolean };
  icon: LucideIcon;
  tone: "teal" | "blue" | "coral" | "slate";
};

const tones = {
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  coral: "bg-orange-50 text-orange-700 ring-orange-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function MetricCard({ label, value, description, trend, icon: Icon, tone }: MetricCardProps) {
  return (
    <article className="metric-card group relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/78 p-5 shadow-[0_18px_45px_-35px_rgba(20,48,73,0.45)] backdrop-blur-xl">
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-[1.7rem] border border-white/70 bg-white/35 rotate-45 transition-transform duration-300 group-hover:rotate-[58deg]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.06em] text-slate-900 sm:text-[1.7rem]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{description}</p>
        {trend ? (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trend.positive === false ? "text-orange-600" : "text-teal-700"}`}>
            {trend.positive === false ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            {trend.value}
          </span>
        ) : null}
      </div>
    </article>
  );
}
