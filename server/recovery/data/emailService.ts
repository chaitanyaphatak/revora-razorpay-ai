/**
 * Email Service for Voice Recovery Channel using Resend (Free Tier)
 * - Sends live emails if RESEND_API_KEY is configured in .env
 * - Generates clean, responsive HTML email with "Talk to AI Assistant (Hinglish Voice)" CTA
 * - Graceful fallback to interactive preview if API key is not yet set
 */

export type SendEmailOptions = {
  to: string;
  recipientName: string;
  amount: number;
  currency: string;
  failureReason: string;
  merchantName: string;
  recoveryUrl: string;
  directPayUrl: string;
  sessionId: string;
  baseUrl?: string;
};

export type EmailDeliveryResult = {
  success: boolean;
  messageId?: string;
  deliveredVia: "resend" | "preview_simulated";
  subject: string;
  htmlContent: string;
  textContent: string;
  error?: string;
};

export async function sendRecoveryEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
  const fallbackProdUrl = "https://revora-razorpay-ai.vercel.app";
  const rawBase = options.baseUrl || process.env.APP_URL;
  let appUrl = rawBase && !rawBase.includes("localhost") ? rawBase : "";
  if (!appUrl) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      appUrl = process.env.APP_URL || fallbackProdUrl;
    } else {
      appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || "3000"}`;
    }
  }
  appUrl = appUrl.replace(/\/$/, "");

  const fullRecoveryUrl = options.recoveryUrl.startsWith("http") ? options.recoveryUrl : `${appUrl}${options.recoveryUrl.startsWith("/") ? "" : "/"}${options.recoveryUrl}`;
  const fullDirectPayUrl = options.directPayUrl.startsWith("http") ? options.directPayUrl : `${appUrl}${options.directPayUrl.startsWith("/") ? "" : "/"}${options.directPayUrl}`;

  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: options.currency || "INR",
    maximumFractionDigits: 0,
  });

  const formattedAmount = currencyFormatter.format(options.amount);
  const subject = `Action Required: Complete your ${formattedAmount} payment — ${options.merchantName}`;

  // Plain text fallback
  const textContent = `Namaste ${options.recipientName},

Your payment of ${formattedAmount} to ${options.merchantName} was not completed (${options.failureReason.replace(/_/g, " ")}).

To resolve this instantly in your preferred language (Hinglish / English), click below to speak with our AI Recovery Assistant:
${fullRecoveryUrl}

Or pay directly via secure checkout:
${fullDirectPayUrl}

Zero credentials stored. Powered by ReVora AI Revenue Recovery.`;

  // HTML email with direct CTA buttons to Voice Recovery & Direct Checkout
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 32px 12px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); }
    .header { background: #090d16; padding: 32px 28px 26px 28px; text-align: left; color: #ffffff; position: relative; }
    .header-badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; line-height: 1.25; }
    .header-sub { font-size: 13px; color: #94a3b8; margin-top: 6px; }
    .content { padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #334155; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .reason-box { background: #fff1f2; border: 1px solid #ffe4e6; border-left: 4px solid #f43f5e; border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #9f1239; line-height: 1.5; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 24px 0; }
    .card-title { font-size: 11px; color: #64748b; margin-bottom: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: #475569; }
    .row strong { color: #0f172a; }
    .row.total { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 18px; font-weight: 800; color: #0f172a; }
    .row.total .amount { color: #059669; }
    .cta-container { margin: 30px 0 20px 0; text-align: center; }
    .cta-button { display: inline-block; width: 100%; max-width: 440px; box-sizing: border-box; background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #ffffff !important; text-align: center; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: -0.2px; box-shadow: 0 10px 20px -5px rgba(13, 148, 136, 0.35); }
    .secondary-container { text-align: center; margin-top: 14px; }
    .secondary-link { color: #0f766e; text-decoration: none; font-size: 13px; font-weight: 600; }
    .secondary-link:hover { text-decoration: underline; }
    .trust-pill { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #166534; text-align: center; margin-top: 24px; }
    .footer { background: #f8fafc; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
    .footer strong { color: #334155; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Top Brand Header -->
      <div class="header">
        <span class="header-badge">⚡ Instant AI Recovery</span>
        <h1>Payment Incomplete</h1>
        <div class="header-sub">Order via <strong>${options.merchantName}</strong> · Ref #${options.sessionId.slice(-8).toUpperCase()}</div>
      </div>

      <!-- Main Body -->
      <div class="content">
        <div class="greeting">Namaste ${options.recipientName},</div>
        <p style="margin: 0 0 14px 0;">
          Your recent checkout of <strong>${formattedAmount}</strong> on <strong>${options.merchantName}</strong> could not be processed by your bank.
        </p>

        <!-- Failure Reason Alert Box -->
        <div class="reason-box">
          <strong>Why it failed:</strong> ${options.failureReason.replace(/_/g, " ")}. No funds were deducted from your account.
        </div>

        <!-- Order Summary Breakdown Card -->
        <div class="card">
          <div class="card-title">Transaction Details</div>
          <div class="row"><span>Merchant</span><strong>${options.merchantName}</strong></div>
          <div class="row"><span>Customer Name</span><strong>${options.recipientName}</strong></div>
          <div class="row"><span>Gateway Status</span><span style="color: #e11d48; font-weight: 700;">Pending Retry</span></div>
          <div class="row total"><span>Amount Due</span><span class="amount">${formattedAmount}</span></div>
        </div>

        <p style="font-size: 14px; color: #475569; text-align: center; margin: 24px 0 16px 0;">
          Speak directly with <strong>ReVora Sahayak™</strong> in Hinglish or English to resolve this in under 2 minutes:
        </p>

        <!-- Primary Voice AI CTA Button -->
        <div class="cta-container">
          <a href="${fullRecoveryUrl}" class="cta-button" target="_blank">
            🎙️ Talk to AI Assistant (Hinglish Voice)
          </a>
        </div>

        <!-- Secondary Direct Checkout Link -->
        <div class="secondary-container">
          <a href="${fullDirectPayUrl}" class="secondary-link" target="_blank">
            💳 Or Pay Directly via Razorpay Standard Checkout &rarr;
          </a>
        </div>

        <!-- Trust & Safety Pill -->
        <div class="trust-pill">
          🔒 <strong>256-Bit Bank Encryption:</strong> Official Razorpay gateway. We will never ask for your UPI PIN, OTP, or CVV.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        Powered by <strong>ReVora — Revenue Operations & AI Recovery</strong>.<br>
        Sent securely on behalf of <strong>${options.merchantName}</strong>. If you already completed this payment, you can safely disregard this email.
      </div>
    </div>
  </div>
</body>
</html>`;

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "ReVora Recovery <onboarding@resend.dev>";

  console.log(`[EmailService] Attempting email to: ${options.to} | from: ${fromEmail} | key configured: ${Boolean(resendApiKey && resendApiKey.startsWith("re_"))}`);

  if (resendApiKey && resendApiKey.trim().startsWith("re_")) {
    try {
      const payload = {
        from: fromEmail,
        to: [options.to],
        subject,
        html: htmlContent,
        text: textContent,
      };
      console.log(`[EmailService] Sending via Resend API to: ${options.to}`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      if (response.ok) {
        let data: { id?: string } = {};
        try { data = JSON.parse(responseText); } catch {}
        console.log(`[EmailService] ✅ Resend SUCCESS → to: ${options.to}, ID: ${data.id}`);
        return {
          success: true,
          messageId: data.id,
          deliveredVia: "resend",
          subject,
          htmlContent,
          textContent,
        };
      } else {
        console.error(`[EmailService] ❌ Resend FAILED (${response.status}): ${responseText}`);
        return {
          success: false,
          deliveredVia: "preview_simulated",
          subject,
          htmlContent,
          textContent,
          error: `Resend HTTP ${response.status}: ${responseText}`,
        };
      }
    } catch (err: any) {
      console.error("[EmailService] ❌ Resend network error:", err.message);
      return {
        success: false,
        deliveredVia: "preview_simulated",
        subject,
        htmlContent,
        textContent,
        error: err.message,
      };
    }
  }

  // If no RESEND_API_KEY is configured, return simulated preview mode
  return {
    success: true,
    deliveredVia: "preview_simulated",
    subject,
    htmlContent,
    textContent,
  };
}
