import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Link2, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type EmailPreviewData = {
  sessionId: string;
  subject: string;
  recipientName: string;
  recipientEmail: string;
  amount: number;
  failureReason: string;
  merchantName: string;
  recoveryUrl: string;
  directPayUrl: string;
  bodyText: string;
  deliveredVia?: string;
  messageId?: string;
};

export function EmailPreviewModal({
  open,
  onOpenChange,
  emailData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: EmailPreviewData | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!emailData) return null;

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const fullRecoveryUrl = emailData.recoveryUrl.startsWith("http")
    ? emailData.recoveryUrl
    : `${window.location.origin}${emailData.recoveryUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(fullRecoveryUrl);
    setCopied(true);
    toast.success("Recovery link copied!", {
      description: "Share this link with the customer manually if needed.",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const isLiveEmail = emailData.deliveredVia === "resend";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-slate-900 p-5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
              <Mail className="h-5 w-5 text-teal-100" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                {isLiveEmail ? "✓ Real Email Dispatched via Resend" : "Email Preview"}
              </p>
              <DialogTitle className="text-base font-semibold text-white">
                Recovery Email Sent to Customer
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Email Delivery Status */}
          <div
            className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-xs ${
              isLiveEmail
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${isLiveEmail ? "text-emerald-600" : "text-amber-500"}`} />
            <div>
              <p className={`font-bold ${isLiveEmail ? "text-emerald-900" : "text-amber-900"}`}>
                {isLiveEmail
                  ? `Email delivered to ${emailData.recipientEmail}`
                  : `Email not sent yet — add RESEND_API_KEY to .env to send`}
              </p>
              {isLiveEmail && emailData.messageId && (
                <p className="font-mono text-[10px] text-emerald-700 mt-0.5">
                  Message ID: {emailData.messageId}
                </p>
              )}
            </div>
          </div>

          {/* Email Headers */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">To:</span>
              <span className="font-medium text-slate-800">
                {emailData.recipientName} &lt;{emailData.recipientEmail}&gt;
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-500">Subject:</span>
              <span className="font-bold text-slate-900 text-right max-w-[280px]">{emailData.subject}</span>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-3 shadow-sm">
            <p>
              Namaste <strong>{emailData.recipientName}</strong>,
            </p>
            <p>
              Your recent payment of <strong>{currency.format(emailData.amount)}</strong> to{" "}
              <strong>{emailData.merchantName}</strong> was not completed due to{" "}
              <em>{emailData.failureReason.replace(/_/g, " ")}</em>.
            </p>
            <p className="text-xs text-slate-500">
              The customer has received a link to resolve this with our AI Recovery Assistant in Hinglish or English.
            </p>
            <div className="border-t border-slate-100 pt-3 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>Powered by ReVora Recovery Engine via Resend</span>
            </div>
          </div>

          {/* Merchant Action: Copy Customer Link only */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-teal-600" />
              Copy Customer Recovery Link
            </p>
            <p className="text-[11px] text-slate-500">
              Share this link with the customer via WhatsApp, SMS, or any other channel if needed.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-mono text-slate-600 overflow-hidden">
              <span className="truncate flex-1">{fullRecoveryUrl}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="w-full rounded-xl border-teal-200 text-teal-800 hover:bg-teal-50 text-xs font-semibold"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Customer Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
