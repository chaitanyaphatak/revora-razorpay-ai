<div align="center">

<img src="https://img.shields.io/badge/ReVora-Revenue%20Operations%20%26%20AI%20Recovery-0f9488?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMSAxN3YtNkg5bDMtNCAzIDRoLTJ2NmgtMnoiLz48L3N2Zz4=" alt="ReVora" />

# ReVora — Revenue Operations & AI Recovery

### 🏆 Built for Razorpay AI Hackathon 2025

**India's first Hinglish Voice AI agent that recovers failed payments in real-time.**  
When a customer's payment fails, ReVora's AI calls them in their language — Hinglish — negotiates, and recovers the revenue automatically.

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-revora--razorpay--ai.vercel.app-0f9488?style=for-the-badge)](https://revora-razorpay-ai.vercel.app/)
[![Backend](https://img.shields.io/badge/🔧%20Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://revora-backend-8mp1.onrender.com/api/health)
[![Built with Razorpay](https://img.shields.io/badge/Powered%20by-Razorpay-3395FF?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com)

---

[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js_22-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_2.0_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![tRPC](https://img.shields.io/badge/tRPC_11-2596BE?style=flat-square&logo=trpc&logoColor=white)](https://trpc.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 🎯 The Problem

India loses **₹1,50,000 crore+** every year to failed payments. When a payment fails:

- 📉 Merchants lose revenue silently
- 😤 Customers get frustrated and forget to retry
- 📧 Generic email reminders are ignored (< 5% open rate)
- 🕐 Manual follow-up is expensive and time-consuming

**ReVora solves this with an AI agent that speaks the customer's language.**

---

## ✨ What ReVora Does

> **🎙️ ReVora sends a personalized Hinglish voice link to the customer. When they open it, an AI agent explains why their payment failed, addresses their concerns in natural Hinglish conversation, and guides them to retry payment — all in under 2 minutes.**

| Without ReVora | With ReVora |
|---|---|
| Failed payment → Lost revenue | Failed payment → AI agent engages customer |
| Generic SMS/email ignored | Personalized Hinglish conversation |
| Manual support team needed | Fully automated 24/7 recovery |
| 5-15% recovery rate | 60-85% recovery rate (demo) |
| Days to follow up | Real-time (within minutes) |

---

## 🌟 Key Features

### 🎙️ Hinglish Voice AI Recovery Agent
- **Natural language understanding** in Hindi-English (Hinglish) using Google Gemini 2.0 Flash
- Customer says _"Mera payment kyu fail hua?"_ → AI explains in detail
- Customer says _"Ha, retry karna hai"_ → Razorpay checkout opens instantly
- **Sub-second responses** with deterministic fast-path matching for common intents (<10ms)
- Works on **any mobile browser** — no app download required

### 💳 Razorpay Test Mode Integration
- Real Razorpay checkout flow embedded in customer recovery page
- Complete payment verification with signature validation
- Supports UPI, Cards, Net Banking, Wallets

### 📊 Merchant Operations Dashboard
- Live recovery analytics — revenue at risk, recovery rate, funnel visualization
- Real-time notifications via **Server-Sent Events (SSE)** — works across devices
- Bell notification + toast alert when any customer completes payment (from any device)
- Auto-refreshing charts without page reload

### 📧 Smart Recovery Emails
- Personalized recovery emails with customer-specific failure reasons
- Dynamic CTA buttons linking directly to the voice recovery session
- Production-ready email templates

### 🔄 Hackathon Demo Mode
- Payments auto-reset to "failed" after 10 minutes → instant re-demo capability
- No server restart needed between demos

### 🔒 Security & Safety
- All Supabase + Gemini credentials are server-only secrets
- Browser never receives API keys
- Simulation-safe: cannot affect real payment gateway data

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend CDN)                    │
│  React 19 + TypeScript + Tailwind CSS + Recharts + tRPC    │
│  revora-razorpay-ai.vercel.app                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ /api/* reverse proxy
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   RENDER (Backend API)                      │
│  Node.js 22 + Express + tRPC + SSE                        │
│  revora-backend-8mp1.onrender.com                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Voice AI    │  │  Recovery    │  │  SSE Emitter      │ │
│  │ Gemini 2.0  │  │  Engine      │  │  (cross-device    │ │
│  │ Flash       │  │  (Policy +   │  │   notifications)  │ │
│  │             │  │   Scoring)   │  │                   │ │
│  └──────┬──────┘  └──────────────┘  └───────────────────┘ │
└─────────┼───────────────────────────────────────────────────┘
          │
    ┌─────▼──────┐     ┌────────────────┐
    │  Google    │     │   Supabase     │
    │  Gemini    │     │  PostgreSQL    │
    │  2.0 Flash │     │  (Payments,    │
    │  API       │     │   Audit Logs)  │
    └────────────┘     └────────────────┘
```

### Real-Time Cross-Device Notification Flow
```
Customer (mobile) → Razorpay Payment → Backend verifies
       ↓
broadcastSSEEvent("payment_recovered")
       ↓
ALL connected merchant dashboards receive push notification
       ↓
🎉 Toast + Bell notification (no page refresh needed)
```

---

## 🚀 Live Demo

| | Link |
|---|---|
| 🌐 **Merchant Dashboard** | [revora-razorpay-ai.vercel.app](https://revora-razorpay-ai.vercel.app/) |
| 🔧 **Backend Health** | [revora-backend-8mp1.onrender.com/api/health](https://revora-backend-8mp1.onrender.com/api/health) |

### Demo Walkthrough

1. **Open Merchant Dashboard** → [revora-razorpay-ai.vercel.app](https://revora-razorpay-ai.vercel.app/)
2. Go to **AI Agents** → Select a failed payment → Click **"Send Voice Recovery"**
3. Copy the recovery link → Open on your **mobile phone**
4. Talk to the Hinglish AI agent — say _"payment kyu fail hua?"_
5. Say _"ha, retry karna hai"_ → Complete Razorpay Test Mode payment
6. Watch the **merchant dashboard** get notified in real-time (no refresh!) 🎉
7. After 10 minutes → payment auto-resets for the next demo

**Test Card for Razorpay:** `4111 1111 1111 1111` | Expiry: any future date | CVV: any 3 digits

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Vite 7 |
| **UI Components** | Radix UI, shadcn/ui, Lucide Icons, Recharts |
| **Backend** | Node.js 22, Express 4, TypeScript |
| **API Layer** | tRPC v11 (end-to-end type-safe) |
| **AI Engine** | Google Gemini 2.0 Flash |
| **Voice** | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| **Payments** | Razorpay Test Mode (Orders + Checkout + Signature Verify) |
| **Database** | Supabase (PostgreSQL) |
| **Real-time** | Server-Sent Events (SSE) |
| **State** | TanStack Query v5 |
| **Routing** | Wouter |
| **Validation** | Zod v4 |
| **Frontend Deploy** | Vercel |
| **Backend Deploy** | Render |
| **Package Manager** | pnpm |

---

## 📁 Project Structure

```
revora/
├── client/src/
│   ├── pages/
│   │   ├── CustomerVoiceRecovery.tsx   # Customer-facing Hinglish voice AI page
│   │   ├── OperationsDashboard.tsx     # Merchant recovery overview
│   │   ├── AIAgentsPage.tsx            # Voice recovery management
│   │   └── ...
│   ├── components/
│   │   ├── DashboardLayout.tsx         # SSE real-time notifications
│   │   └── recoverai/                  # Recovery-specific components
│   └── lib/
│       └── speechService.ts            # Voice AI + mobile speech handling
│
├── server/
│   ├── app.ts                          # Express app + SSE endpoint
│   ├── sseEmitter.ts                   # Cross-device notification broadcaster
│   ├── routers.ts                      # tRPC API router
│   └── recovery/
│       ├── ai/
│       │   └── geminiVoiceRecovery.ts  # Hinglish AI + Gemini 2.0 Flash
│       └── data/
│           ├── voiceRecoveryStore.ts   # Session management + payment verify
│           └── emailService.ts         # Recovery email templates
│
├── database/                           # Supabase SQL schema + seed files
├── docs/                               # Technical documentation
├── vercel.json                         # Vercel config + API proxy rewrites
└── render.yaml                         # Render backend deployment config
```

---

## ⚡ Local Development

### Prerequisites
- Node.js ≥ 22.0.0
- pnpm ≥ 10.4.0
- Supabase project (for database)
- Google Gemini API key
- Razorpay Test Mode keys

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/revora.git
cd revora

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Fill in your keys in .env

# 4. Start development server
pnpm dev
```

### Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# App
APP_URL=http://localhost:5173
```

### Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start local development server |
| `pnpm build` | Build full-stack for production |
| `pnpm build:vercel` | Build frontend only (for Vercel) |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run Vitest test suite |
| `pnpm format` | Format code with Prettier |

---

## 🚢 Deployment

### Frontend → Vercel
```bash
# vercel.json handles everything:
# - Builds frontend with: pnpm run build:vercel
# - Serves from: dist/public
# - Proxies /api/* → Render backend
```

### Backend → Render
```bash
# render.yaml handles everything:
# - Build: pnpm install && pnpm build
# - Start: node dist/index.js
# - Sets all environment variables
```

See [`docs/deployment.md`](docs/deployment.md) for detailed deployment guide.

---

## 🎙️ How the Voice AI Works

```
1. Customer opens recovery link on mobile
           ↓
2. Greeting plays: "Namaste! Main ReVora AI hoon..."
           ↓
3. Customer speaks (Web Speech API, hi-IN locale)
           ↓
4. Text sent to backend via tRPC mutation
           ↓
5. Gemini 2.0 Flash processes with Hinglish context
   (Fast-path: deterministic matching <10ms for common intents)
           ↓
6. Response spoken back via SpeechSynthesis
           ↓
7. If customer agrees → Razorpay checkout opens
           ↓
8. Payment verified → Merchant notified via SSE
```

### Supported Customer Intents (Hinglish)
- _"payment kyu fail hua?"_ → Detailed failure explanation
- _"ha, retry karna hai / payment karna chahta hoon"_ → Opens Razorpay
- _"baad mein karunga"_ → Promise-to-pay recorded
- _"nahi karna"_ → Polite decline recorded
- _"kisi se baat karni hai"_ → Escalation to human support

---

## 📊 Recovery Intelligence

The recovery scoring system uses **Logistic Regression** trained on synthetic payment data:

- **Features:** failure reason, payment method, amount, attempt number, customer history
- **Output:** recovery probability (0.0 – 1.0) for each failed payment
- **Policy gates:** deterministic rules validate every proposed recovery action
- **Audit trail:** immutable log of every decision, action, and outcome

| Recovery Probability | Action |
|---|---|
| ≥ 0.80 | Immediate voice AI outreach |
| 0.60 – 0.79 | Email + follow-up |
| 0.40 – 0.59 | Merchant review queue |
| < 0.40 | Manual escalation |

---

## 👨‍💻 Team

Built with ❤️ for the **Razorpay AI Hackathon 2025**

| | |
|---|---|
| **Project** | ReVora — Revenue Operations & AI Recovery |
| **Category** | AI-powered Payment Recovery |
| **Stack** | Full-Stack TypeScript, Google Gemini, Razorpay |

---

## 📄 Documentation

| Document | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System architecture and safety boundaries |
| [`docs/deployment.md`](docs/deployment.md) | Production deployment guide |
| [`docs/evaluation.md`](docs/evaluation.md) | Recovery model evaluation |
| [`docs/security.md`](docs/security.md) | Security boundaries and API key handling |
| [`localguide/LOCAL_SETUP.md`](localguide/LOCAL_SETUP.md) | Step-by-step local setup guide |
| [`localguide/WINDOWS_SETUP.md`](localguide/WINDOWS_SETUP.md) | Windows-specific setup guide |
| [`database/README.md`](database/README.md) | Database schema documentation |

---

<div align="center">

**⭐ Star this repo if ReVora impressed you!**

[![Live Demo](https://img.shields.io/badge/Try%20Live%20Demo-🚀-0f9488?style=for-the-badge)](https://revora-razorpay-ai.vercel.app/)

*Made with ❤️ for Razorpay AI Hackathon 2025 · India*

![Razorpay](https://img.shields.io/badge/Powered%20by-Razorpay-3395FF?style=flat-square&logo=razorpay&logoColor=white)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.0%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)

</div>
