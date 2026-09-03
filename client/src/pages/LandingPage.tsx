import React from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-black flex flex-col justify-between p-4 sm:p-8 lg:px-16 lg:py-10 font-sans selection:bg-[#ff409f] selection:text-white relative overflow-hidden">
      {/* Background Video — Local Asset, GPU Accelerated, Instant Load */}
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 transform-gpu will-change-transform"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src="/assets/hero-bg.mp4"
      />

      {/* Light Translucent Contrast Scrim for Maximum Video Vibrancy */}
      <div className="absolute inset-0 bg-black/40 backdrop-brightness-95 pointer-events-none z-0" />

      {/* Ambient Pulsing Neon Aura */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[540px] h-[540px] rounded-full bg-[#ff409f]/15 blur-[160px] z-0 animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[540px] h-[540px] rounded-full bg-[#ff409f]/15 blur-[160px] z-0" />

      {/* TOP FLOATING GLASSMORPHIC NAVIGATION BAR */}
      <header className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-full px-4 sm:px-8 py-3 shadow-[0_15px_45px_rgba(0,0,0,0.5)]">
          {/* Logo on Left */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 shadow-md shadow-pink-500/15 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(255,64,159,0.5)]">
              <img src="/assets/revora-logo.png" alt="ReVora" className="w-full h-full object-contain" />
            </div>
            <span className="text-white text-2xl sm:text-3xl font-[900] tracking-tight select-none">
              ReVora
            </span>
          </Link>

          {/* Navigation Links in Center (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-12">
            <Link
              href="/app"
              className="text-white/80 hover:text-white text-sm lg:text-base font-medium transition-colors hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
            >
              Overview
            </Link>
            <Link
              href="/assistant"
              className="text-white/80 hover:text-white text-sm lg:text-base font-medium transition-colors hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
            >
              Intelligence
            </Link>
            <Link
              href="/recovery"
              className="text-[#ff409f] hover:text-[#f452a3] text-sm lg:text-base font-semibold transition-all hover:drop-shadow-[0_0_15px_rgba(255,64,159,0.8)]"
            >
              Recoveries
            </Link>
            <Link
              href="/manual-simulation"
              className="text-white/80 hover:text-white text-sm lg:text-base font-medium transition-colors hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
            >
              Simulator
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <Link
              href="/manual-simulation"
              className="rounded-full px-5 sm:px-6 py-2 border border-white/20 bg-white/[0.05] text-white text-xs sm:text-sm font-medium hover:bg-white/15 hover:border-white/40 transition-all active:scale-95 inline-flex items-center justify-center"
            >
              Simulate
            </Link>
            <Link
              href="/app"
              className="rounded-full px-5 sm:px-6 py-2 bg-[#ff409f] hover:bg-[#f42e94] text-white text-xs sm:text-sm font-semibold shadow-[0_0_25px_rgba(255,64,159,0.35)] hover:shadow-[0_0_35px_rgba(255,64,159,0.6)] transition-all active:scale-95 inline-flex items-center justify-center"
            >
              Launch AI
            </Link>
          </div>
        </div>
      </header>

      {/* HERO MAIN BODY GRID */}
      <main className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center my-auto py-10 sm:py-14 lg:py-16">
        
        {/* LEFT SIDE: RECOVERY + SUBTEXT + 2026 / LIVE STATS */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {/* RECOVERY headline with Interactive Neon Glow */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[104px] font-[900] tracking-tight leading-[0.92] uppercase select-none transition-all duration-300 hover:drop-shadow-[0_0_40px_rgba(255,64,159,0.7)] cursor-default">
            <span className="text-[#ff409f]">RECOV</span>
            <span className="text-white">ERY</span>
          </h1>

          {/* Subtext */}
          <p className="text-white/90 text-base sm:text-lg lg:text-xl font-normal leading-snug mt-6 sm:mt-8 max-w-sm">
            Next-gen recovery engine that
            <br />
            safeguards your profits
            <br />
            on pure autopilot.
          </p>

          {/* Year 2026 + Live Indicator Pill */}
          <div className="mt-12 sm:mt-20 lg:mt-24 flex items-baseline gap-6">
            <div className="text-5xl sm:text-6xl lg:text-[80px] font-[900] text-white tracking-tight select-none">
              2026
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>94.8% Auto SLA</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Subhead + AUTONOMOUS + GET STARTED */}
        <div className="lg:col-span-5 flex flex-col items-start justify-center lg:pl-6">
          {/* Small Pink Subhead */}
          <p className="text-[#ff409f] text-base sm:text-lg lg:text-xl font-medium leading-snug mb-3 sm:mb-4 drop-shadow-[0_0_12px_rgba(255,64,159,0.4)]">
            Real-time generative intelligence
            <br />
            for zero-loss revenue
          </p>

          {/* AUTONOMOUS Big Display with Interactive Glow */}
          <h2 className="text-4xl sm:text-6xl lg:text-[76px] font-[900] tracking-tight leading-[0.92] text-white uppercase select-none mb-6 sm:mb-8 transition-all duration-300 hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] cursor-default">
            AUTONOMOUS
          </h2>

          {/* Futuristic High-Converting CTA Button */}
          <div className="flex flex-col items-start gap-3">
            <Link
              href="/app"
              className="group relative inline-flex items-center justify-center p-[2px] rounded-full bg-gradient-to-r from-[#ff409f] via-purple-500 to-[#00f2fe] shadow-[0_0_30px_rgba(255,64,159,0.35)] hover:shadow-[0_0_55px_rgba(255,64,159,0.65)] transition-all duration-300 hover:scale-[1.04] active:scale-95 overflow-hidden"
            >
              {/* Shimmer Sweep Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              {/* Inner Luminous Button Body */}
              <div className="relative flex items-center justify-between gap-4 sm:gap-6 bg-white hover:bg-neutral-50 text-[#111114] px-8 sm:px-10 py-3.5 sm:py-4 rounded-full transition-colors duration-200">
                <span className="font-[900] text-xs sm:text-sm tracking-[0.2em] uppercase select-none">
                  GET STARTED
                </span>

                {/* Glowing Hot-Pink Action Bubble */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#ff409f] to-[#ff70ba] text-white flex items-center justify-center shadow-[0_3px_14px_rgba(255,64,159,0.55)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_4px_20px_rgba(255,64,159,0.85)]">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Micro-Trust Badge */}
            <div className="flex items-center gap-2 pl-2 text-[11px] sm:text-xs text-white/60 font-medium select-none">
              <Sparkles className="w-3 h-3 text-[#ff409f] animate-pulse" />
              <span>Instant AI Simulation • Zero Code Setup</span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/[0.08] text-xs text-white/50">
        <span>&copy; ReVora AI Revenue Recovery. Built for modern high-velocity merchants.</span>
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Enter Operations Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}
