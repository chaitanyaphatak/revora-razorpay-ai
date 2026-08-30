import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function AnimatedMetric({ value, format, className, duration = 600 }: { value: number; format: (value: number) => string; className?: string; duration?: number }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const startValue = display;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startValue + (value - startValue) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return <span className={cn("rr-metric-value", className)}>{format(display)}</span>;
}

export function EnvironmentStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rr-environment-strip", className)}>{children}</section>;
}

export function InitialAvatar({ value, className }: { value: string; className?: string }) {
  const letters = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "RA";
  return <span aria-hidden="true" className={cn("rr-avatar", className)}>{letters}</span>;
}
