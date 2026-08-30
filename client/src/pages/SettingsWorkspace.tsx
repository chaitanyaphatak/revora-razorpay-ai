import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";

const settings = [
  { icon: Database, title: "Data source", value: "Supabase PostgreSQL", detail: "Payment and B2B receivables records are read server-side. Database credentials are never exposed in the public workspace.", tone: "text-teal-700 bg-teal-50" },
  { icon: Sparkles, title: "AI explanation", value: "Gemini, server-side", detail: "Gemini explains bounded recovery context. Deterministic policy remains the action authority.", tone: "text-violet-700 bg-violet-50" },
  { icon: ShieldCheck, title: "Recovery operation", value: "Simulation-only", detail: "The workspace can record policy-approved simulations and audit records; it cannot send a payment request or collect money.", tone: "text-amber-700 bg-amber-50" },
];

export default function SettingsWorkspace() {
  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <section className="rr-surface p-6 sm:p-8"><p className="rr-eyebrow">Workspace configuration</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-[-.05em] text-slate-950">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A transparent summary of the fixed public ReVora workspace configuration. Secrets, provider connections, recovery policy controls, and account administration are intentionally unavailable here.</p></div><Badge variant="outline" className="self-start border-amber-100 bg-amber-50 text-amber-800">Read-only workspace</Badge></div></section>
    <section className="grid gap-4 md:grid-cols-3">{settings.map(setting => <article className="rr-surface p-5" key={setting.title}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${setting.tone}`}><setting.icon className="h-5 w-5" /></span><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{setting.title}</p><h2 className="mt-1 text-base font-semibold text-slate-900">{setting.value}</h2><p className="mt-3 text-xs leading-5 text-slate-500">{setting.detail}</p></article>)}</section>
    <section className="rr-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileCheck2 className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-slate-800">Need a policy or invoice review?</p><p className="mt-1 text-xs leading-5 text-slate-500">Use the recovery control center for audit history or the invoice workspace for B2B receivables analysis.</p></div></div><div className="flex gap-2"><Button asChild variant="outline" className="rounded-lg"><Link href="/control-center">Audit center</Link></Button><Button asChild className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"><Link href="/invoices">Invoices</Link></Button></div></section>
  </div>;
}
