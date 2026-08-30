import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Activity, BarChart3, Bot, ClipboardCheck, CreditCard, Gauge, LayoutDashboard, MessageSquareText, ReceiptText, Settings2, ShieldAlert, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const destinations = [
  { label: "Overview", hint: "Revenue command center", icon: LayoutDashboard, path: "/" },
  { label: "Revenue risk", hint: "Prioritized revenue opportunities", icon: ShieldAlert, path: "/risk" },
  { label: "Recovery center", hint: "Active recovery pipeline", icon: Gauge, path: "/recovery" },
  { label: "Customers", hint: "Customer revenue health", icon: Users, path: "/customers" },
  { label: "Payments", hint: "Payment events and failures", icon: CreditCard, path: "/payments" },
  { label: "Invoices", hint: "B2B receivables recovery", icon: ReceiptText, path: "/invoices" },
  { label: "Promise-to-Pay tracker", hint: "Receivables commitments", icon: ReceiptText, path: "/invoices/promises" },
  { label: "AI agents", hint: "AI decisions and activity", icon: Bot, path: "/ai-agents" },
  { label: "Assistant", hint: "Ask Gemini about recovery", icon: Bot, path: "/assistant" },
  { label: "Analytics", hint: "Risk, policy, recovery, and receivables intelligence", icon: BarChart3, path: "/analytics" },
  { label: "Activity", hint: "Timestamped simulation and audit evidence", icon: Activity, path: "/activity" },
  { label: "Settings", hint: "Preview configuration", icon: Settings2, path: "/settings" },
];

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent showCloseButton={false} className="command-dialog max-w-xl overflow-hidden border-slate-200 bg-white p-0 shadow-2xl">
      <DialogTitle className="sr-only">Search ReVora</DialogTitle>
      <Command className="rounded-none border-0 bg-transparent">
        <CommandInput placeholder="Search customers, payments, invoices..." className="h-14 text-sm" />
        <CommandList className="max-h-80 p-2">
          <CommandEmpty>No matching command found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {destinations.map(item => <CommandItem key={item.path} value={`${item.label} ${item.hint}`} onSelect={() => { navigate(item.path); setOpen(false); }} className="mb-1 cursor-pointer rounded-xl px-3 py-3">
              <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><item.icon className="h-4 w-4 text-slate-600" /></span>
              <span><span className="block text-sm font-semibold text-slate-800">{item.label}</span><span className="block text-xs text-slate-500">{item.hint}</span></span>
            </CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => { navigate("/simulator"); setOpen(false); }} className="cursor-pointer rounded-xl px-3 py-3"><Sparkles className="mr-3 h-4 w-4 text-violet-600" />Run What-If simulation</CommandItem>
            <CommandItem onSelect={() => { navigate("/manual-simulation"); setOpen(false); }} className="cursor-pointer rounded-xl px-3 py-3"><ClipboardCheck className="mr-3 h-4 w-4 text-teal-600" />Record manual simulated outcome</CommandItem>
            <CommandItem onSelect={() => { navigate("/ai-brief"); setOpen(false); }} className="cursor-pointer rounded-xl px-3 py-3"><Bot className="mr-3 h-4 w-4 text-violet-600" />Generate AI brief</CommandItem>
            <CommandItem onSelect={() => { navigate("/assistant"); setOpen(false); }} className="cursor-pointer rounded-xl px-3 py-3"><MessageSquareText className="mr-3 h-4 w-4 text-violet-600" />Ask merchant assistant</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>;
}
