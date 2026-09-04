<div align="center">

# ⚡ ReVora — Revenue Operations & AI Recovery

### 🏆 Built for Razorpay AI Hackathon 2026
**Created by [Chaitanya Phatak](https://github.com/chaitanyaphatak)**

**India's first Hinglish Voice AI agent that recovers failed payments in real-time.**  
When a customer's payment fails, ReVora's AI agent initiates a natural Hinglish conversation, addresses doubts, negotiates alternatives, and recovers revenue automatically.

<br />

[![Created by Chaitanya Phatak](https://img.shields.io/badge/Created%20by-Chaitanya%20Phatak-4f46e5?style=for-the-badge&logo=github&logoColor=white)](https://github.com/chaitanyaphatak)
[![Custom Domain](https://img.shields.io/badge/🌐%20Live%20Domain-revora.strynex.online-0f9488?style=for-the-badge&logo=googlechrome&logoColor=white)](https://revora.strynex.online)
[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://revora-razorpay-ai.vercel.app/)
[![Backend](https://img.shields.io/badge/🔧%20Live%20Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://revora-backend-8mp1.onrender.com/api/health)
[![Powered by Razorpay](https://img.shields.io/badge/Powered%20by-Razorpay-0C2340?style=for-the-badge&logo=razorpay&logoColor=3395FF)](https://razorpay.com)

<br />

[![React](https://img.shields.io/badge/React%2019-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js%2022-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini%202.0%20Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![tRPC](https://img.shields.io/badge/tRPC%20v11-2596BE?style=flat-square&logo=trpc&logoColor=white)](https://trpc.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite%207-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)

</div>

---

## 🎯 The Problem

India loses **₹1,50,000 crore+** every year to failed digital transactions and checkout drop-offs:

- 📉 **Silent Revenue Leakage:** 15–30% of attempted payments fail due to server timeouts, UPI limits, or card declines.
- 😤 **Customer Friction:** Frustrated buyers rarely return on their own.
- 📧 **Ineffective Recovery:** Generic email and SMS reminders suffer from sub-5% conversion rates.
- 🕐 **Manual Burden:** Human support teams cannot reach out within the critical 5-minute recovery window.

**ReVora solves this with an intelligent, voice-first AI agent that speaks the customer's language.**

---

## ✨ What ReVora Does

> **🎙️ When a transaction fails, ReVora sends an interactive Hinglish voice recovery link. The AI agent immediately greets the customer, explains the exact failure reason in friendly Hinglish, addresses hesitation, and opens an in-call Razorpay checkout to complete payment in under 2 minutes.**

| Traditional Recovery | ReVora AI Recovery |
|---|---|
| ❌ Failed payment → Lost revenue | ✅ Instant AI outreach within seconds |
| ❌ Static emails with <5% conversion | ✅ Interactive Hinglish voice conversation |
| ❌ Manual support escalation | ✅ 24/7 automated intelligent resolution |
| ❌ 5–15% average recovery rate | ✅ 60–85% target recovery rate |
| ❌ Hours/days delay | ✅ Sub-2-minute complete payment recovery |

---

## 🎯 Project Objectives & ReVora Sahayak

Every failed payment is lost revenue. ReVora's primary mission is to autonomously convert dropped Razorpay checkouts into completed orders before the customer abandons the purchase.

Powered by **ReVora Sahayak**—our conversational AI assistant—the platform reaches out in real-time, addresses hesitations, and provides instant 1-click checkout recovery.

### 🌟 Core Objectives:
1. **Zero-Lag Autonomous Recovery:** Detect Razorpay failure webhooks and trigger personalized outreach within 90 seconds, capturing customers while their purchase intent is peaked.
2. **Context-Aware Intelligence (ReVora Sahayak):** Automatically diagnose failure reasons (bank server downtime, UPI limits, network timeouts) and explain them in clear, friendly language with the best alternate payment routes.
3. **Eliminating Churn & Preserving Trust:** Turn a frustrating checkout error screen into an empathetic, interactive support experience that protects brand loyalty.
4. **End-to-End Merchant Visibility:** Provide business owners with a live operations dashboard tracking recovered GMV, recovery conversion rates %, and drop-off analytics via real-time SSE streams.

---

## 🌟 Key Features

### 🎙️ Hinglish Voice AI Recovery Agent
- **Natural Language Understanding:** Powered by Google Gemini 2.0 Flash for fluid Hindi-English (Hinglish) conversations.
- **Context-Aware Reasoning:** Explains exact failure reasons (e.g., *"Aapka HDFC bank server response timeout hua tha"*).
- **Sub-Second Latency:** Deterministic fast-path caching (<10ms) for high-frequency user intents.
- **Cross-Platform Mobile Web:** Web Speech API integration with zero app downloads required.

### 💳 Deep Razorpay Test Mode Integration
- Embedded Razorpay standard checkout overlay directly within the voice recovery session.
- Server-side cryptographic signature verification (`razorpay_signature`).
- Full support for UPI, Cards, Net Banking, and Wallets in sandbox mode.

### 📊 Merchant Operations & Analytics Center
- Real-time **Server-Sent Events (SSE)** push notifications across separate devices and browsers.
- Dynamic recovery funnel analytics, revenue-at-risk tracking, and audit logs.
- Zero-refresh metric updates when a customer completes payment anywhere in the world.

### 🔄 Hackathon Demo Mode
- **Automatic 10-Minute Reset:** Recovered demo payments automatically revert to failed state after 10 minutes, allowing seamless repeated live judging presentations without server restarts.

### 🔒 Enterprise Security & Policy Gates
- Deterministic policy engine enforces retry limits, cooling periods, and max-value thresholds.
- Supabase and Gemini credentials remain strictly isolated on the server.

---

## 🏗️ Architecture & Deployment Flow
 
```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION FRONTEND                      │
│  React 19 • TypeScript • Tailwind CSS v4 • Vite 7           │
│  🌐 Custom Domain: https://revora.strynex.online           │
│  🚀 Vercel Domain: https://revora-razorpay-ai.vercel.app   │
└──────────────────────┬──────────────────────────────────────┘
                       │ /api/* reverse proxy rewrites
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   RENDER (Backend API Service)              │
│  Node.js 22 • Express • tRPC v11 • SSE Push Broadcaster     │
│  🔧 https://revora-backend-8mp1.onrender.com                │
│                                                             │
│  ┌─────────────────┐ ┌───────────────────┐ ┌──────────────┐│
│  │ Gemini 2.0      │ │ Policy & Scoring  │ │ SSE Emitter  ││
│  │ Voice AI Agent  │ │ Decision Engine   │ │ (Cross-Dev)  ││
│  └────────┬────────┘ └───────────────────┘ └──────┬───────┘│
└───────────┼───────────────────────────────────────┼─────────┘
            │                                       │
      ┌─────▼──────┐                          ┌─────▼──────┐
      │   Google   │                          │  Merchant  │
      │ Gemini 2.0 │                          │ Dashboard  │
      │ Flash API  │                          │ Real-time  │
      └────────────┘                          └────────────┘
```

---

## 🚀 Live Demo & Testing

| Service | Endpoint / Link | Status |
|---|---|---|
| 🌐 **Live Website (Custom Domain)** | [revora.strynex.online](https://revora.strynex.online) | ![Custom Domain](https://img.shields.io/badge/Live-Online-0f9488?style=flat-square&logo=googlechrome&logoColor=white) |
| 🚀 **Live Website (Vercel)** | [revora-razorpay-ai.vercel.app](https://revora-razorpay-ai.vercel.app/) | ![Vercel](https://img.shields.io/badge/Vercel-Live-000000?style=flat-square&logo=vercel&logoColor=white) |
| 🔧 **Backend API** | [revora-backend-8mp1.onrender.com/api/health](https://revora-backend-8mp1.onrender.com/api/health) | ![Render](https://img.shields.io/badge/Render-Active-46E3B7?style=flat-square&logo=render&logoColor=white) |

### 🎬 Live Demo Walkthrough

1. Open the **Merchant Dashboard** on your laptop: [revora.strynex.online](https://revora.strynex.online) or [revora-razorpay-ai.vercel.app](https://revora-razorpay-ai.vercel.app/)
2. Navigate to **AI Agents** → Select any failed payment → Click **"Send Voice Recovery"**.
3. Copy the recovery link and open it on your **mobile phone** (or a separate browser window).
4. Tap **"Start Voice Recovery"** and speak in Hinglish:
   - *"Payment kyu fail hua?"* → AI explains the exact gateway failure reason.
   - *"Ha, abhi pay karna hai"* → AI opens the Razorpay checkout overlay.
5. Complete payment using Razorpay Test Mode (`Card: 4111 1111 1111 1111` | any valid date & CVV).
6. **Watch your laptop screen:** The merchant dashboard instantly receives a real-time SSE notification, pulses the bell icon, displays a toast, and updates metrics without refreshing!
7. After 10 minutes, the session automatically resets to "failed" for your next demo.

---

## 🛠️ Official Tech Stack

| Domain | Technology | Badge |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | ![React](https://img.shields.io/badge/React%2019-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **Styling & UI** | Tailwind CSS v4 + Radix UI + Lucide | ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix%20UI-161618?style=flat-square&logo=radixui&logoColor=white) |
| **Build Tooling** | Vite 7 | ![Vite](https://img.shields.io/badge/Vite%207-646CFF?style=flat-square&logo=vite&logoColor=white) |
| **Backend Runtime** | Node.js 22 + Express | ![Node.js](https://img.shields.io/badge/Node.js%2022-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) |
| **API Contract** | tRPC v11 + SuperJSON + Zod | ![tRPC](https://img.shields.io/badge/tRPC%20v11-2596BE?style=flat-square&logo=trpc&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white) |
| **AI & LLM** | Google Gemini 2.0 Flash | ![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white) |
| **Payment Gateway** | Razorpay Test Mode SDK | ![Razorpay](https://img.shields.io/badge/Razorpay-0C2340?style=flat-square&logo=razorpay&logoColor=3395FF) |
| **Database** | Supabase (PostgreSQL) | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **Real-Time Push** | Server-Sent Events (SSE) | ![SSE](https://img.shields.io/badge/Real--Time-SSE-0f9488?style=flat-square) |
| **Hosting (Web)** | Vercel Edge Network | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) |
| **Hosting (API)** | Render Cloud | ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white) |

---

## 📁 Repository Structure

```
revora/
├── client/src/
│   ├── pages/
│   │   ├── CustomerVoiceRecovery.tsx   # Customer-facing Hinglish Voice AI experience
│   │   ├── OperationsDashboard.tsx     # Merchant revenue recovery overview
│   │   ├── AIAgentsPage.tsx            # Voice recovery campaign management
│   │   └── ...
│   ├── components/
│   │   ├── DashboardLayout.tsx         # SSE real-time cross-device notifications
│   │   └── recoverai/                  # Recovery metrics & visual primitives
│   └── lib/
│       └── speechService.ts            # SpeechRecognition & SpeechSynthesis engine
│
├── server/
│   ├── app.ts                          # Express server & SSE stream endpoint
│   ├── sseEmitter.ts                   # Cross-device global SSE broadcast registry
│   ├── routers.ts                      # End-to-end typed tRPC API routes
│   └── recovery/
│       ├── ai/
│       │   └── geminiVoiceRecovery.ts  # Gemini 2.0 Flash prompt orchestration
│       └── data/
│           ├── voiceRecoveryStore.ts   # Session state machine, reset timer, & verification
│           └── emailService.ts         # Recovery email dispatch & links
│
├── database/                           # Supabase PostgreSQL schema & seed scripts
├── docs/                               # System architecture & deployment docs
├── vercel.json                         # Vercel proxy configuration
└── render.yaml                         # Render containerized backend spec
```

---

## ⚡ Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/your-username/revora.git
cd revora
pnpm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Application URL
APP_URL=http://localhost:5173
```

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎙️ Voice AI Flow & Supported Intents

```
Customer clicks link → Initial Hinglish greeting spoken
                     ↓
Customer speaks (Web Speech API, hi-IN locale)
                     ↓
Server fast-path lookup (<10ms) OR Gemini 2.0 Flash generation
                     ↓
Hinglish audio synthesised + action dispatched (e.g. open checkout)
                     ↓
Razorpay payment verified → Merchant dashboard notified via SSE
```

| User Utterance (Hinglish) | AI Action / Response |
|---|---|
| *"Payment kyu fail hua?"* | Explains specific gateway failure reason in friendly terms |
| *"Ha, open karo / pay karna hai"* | Automatically launches Razorpay checkout overlay |
| *"Baad mein karunga"* | Logs promise-to-pay date with merchant follow-up |
| *"Mujhe nahi chahiye"* | Gracefully closes call and records customer decline |
| *"Agent se baat karni hai"* | Escalates ticket to merchant human support desk |

---

## 📄 Documentation Links

- [System Architecture](docs/architecture.md)
- [Production Deployment Guide](docs/deployment.md)
- [Model Evaluation & Recovery Intelligence](docs/evaluation.md)
- [Security & Isolation Model](docs/security.md)
- [Database Schema Reference](database/README.md)

---

## 👨‍💻 Author & Maintainer

**Chaitanya Phatak**  
- **GitHub:** [@chaitanyaphatak](https://github.com/chaitanyaphatak)  
- **Project:** [ReVora on GitHub](https://github.com/chaitanyaphatak/revora-razorpay-ai)  
- **Domain:** [revora.strynex.online](https://revora.strynex.online)  

---

<div align="center">

[![Try Live Demo (Custom Domain)](https://img.shields.io/badge/Try%20Live%20Demo-revora.strynex.online-0f9488?style=for-the-badge&logo=googlechrome&logoColor=white)](https://revora.strynex.online)
[![Try Live Demo (Vercel)](https://img.shields.io/badge/Try%20Live%20Demo-Vercel%20Mirror-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://revora-razorpay-ai.vercel.app/)

<br />

**Created with ❤️ by Chaitanya Phatak for Razorpay AI Hackathon 2026 🇮🇳**

[![Powered by Razorpay](https://img.shields.io/badge/Razorpay-0C2340?style=flat-square&logo=razorpay&logoColor=3395FF)](https://razorpay.com)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)

</div>
