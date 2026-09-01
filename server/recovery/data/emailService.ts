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
  const appUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || "3000"}`).replace(/\/$/, "");
  const fullRecoveryUrl = options.recoveryUrl.startsWith("http") ? options.recoveryUrl : `${appUrl}${options.recoveryUrl}`;
  const fullDirectPayUrl = options.directPayUrl.startsWith("http") ? options.directPayUrl : `${appUrl}${options.directPayUrl}`;

  // Keep these for internal use / future use when app is deployed
  void fullRecoveryUrl;
  void fullDirectPayUrl;

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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 24px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f766e, #0f9488); padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 8px 0 0 0; font-size: 22px; font-weight: 700; }
    .content { padding: 28px 24px; font-size: 15px; line-height: 1.65; color: #334155; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .row.total { margin-top: 8px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 16px; font-weight: 700; }
    .cta-container { margin: 24px 0 16px 0; text-align: center; }
    .cta-button { display: inline-block; width: 85%; max-width: 420px; background: #0f766e; color: #ffffff !important; text-align: center; padding: 14px 20px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(15,118,110,0.25); }
    .secondary-link { text-align: center; font-size: 13px; margin-top: 12px; }
    .secondary-link a { color: #0f766e; text-decoration: underline; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #99f6e4;">Payment Recovery</div>
      <h1>${options.merchantName}</h1>
    </div>
    <div class="content">
      <p>Namaste <strong>${options.recipientName}</strong>,</p>
      <p>Your recent payment of <strong>${formattedAmount}</strong> to <strong>${options.merchantName}</strong> was not completed (${options.failureReason.replace(/_/g, " ")}).</p>

      <div class="card">
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Summary</div>
        <div class="row"><span>Merchant</span><span><strong>${options.merchantName}</strong></span></div>
        <div class="row"><span>Status</span><span style="color:#e11d48; font-weight:600;">Payment Incomplete</span></div>
        <div class="row"><span>Reason</span><span style="color:#9333ea;">${options.failureReason.replace(/_/g, " ")}</span></div>
        <div class="row total"><span>Amount Due</span><span style="color:#0f766e;">${formattedAmount}</span></div>
      </div>

      <p style="font-size: 14px; color: #475569; text-align: center; margin-top: 20px;">
        To resolve this easily in Hinglish or English, click the button below to talk to our AI Assistant:
      </p>

      <div class="cta-container">
        <a href="${fullRecoveryUrl}" class="cta-button" style="background-color: #0f766e; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block;">
          🎙️ Talk to AI Assistant (Hinglish Voice)
        </a>
      </div>

      <div class="secondary-link" style="text-align: center; margin-top: 14px;">
        <a href="${fullDirectPayUrl}" style="color: #0f766e; text-decoration: underline; font-size: 13px; font-weight: 600;">
          Or Pay Directly via Secure Checkout &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 22px;">
        Already completed this payment? You can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      🔒 <strong>ReVora Security:</strong> We will never ask for your PIN, OTP, or CVV.<br>
      Sent on behalf of <strong>${options.merchantName}</strong> via ReVora AI Revenue Recovery.
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
