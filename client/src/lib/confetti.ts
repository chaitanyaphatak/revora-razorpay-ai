/**
 * ReVora Lightweight Canvas Confetti Engine.
 *
 * Triggers an elegant, zero-dependency golden & emerald confetti burst
 * on payment recovery (Apple Pay / Stripe celebration tier).
 */

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  tilt: number;
  tiltAngle: number;
  tiltAngleSpeed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export function triggerPaymentSuccessConfetti(): void {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resize();

  // Premium Gold & Emerald Fintech Palette
  const colors = [
    "#10b981", // Emerald
    "#059669", // Deep Emerald
    "#f59e0b", // Warm Gold
    "#fbbf24", // Bright Gold
    "#14b8a6", // Teal
    "#34d399", // Mint Green
    "#fde047", // Shimmer Yellow
    "#6366f1", // Violet accent
  ];

  const particleCount = 120;
  const particles: Particle[] = [];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.45;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const velocity = 8 + Math.random() * 14;

    particles.push({
      x: centerX + (Math.random() - 0.5) * 40,
      y: centerY + (Math.random() - 0.5) * 40,
      w: 8 + Math.random() * 6,
      h: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: Math.cos(angle) * velocity * (0.8 + Math.random() * 0.6),
      vy: Math.sin(angle) * velocity - (6 + Math.random() * 6), // Launch upward
      tilt: Math.random() * 10,
      tiltAngle: Math.random() * Math.PI,
      tiltAngleSpeed: 0.05 + Math.random() * 0.08,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let animationFrameId: number;
  let startTime = Date.now();
  const durationMs = 3800;

  function render() {
    const elapsed = Date.now() - startTime;
    if (elapsed > durationMs) {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
      return;
    }

    ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const progress = elapsed / durationMs;
    const fadeOut = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Physics update
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // Gravity
      p.vx *= 0.985; // Air friction
      p.tiltAngle += p.tiltAngleSpeed;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, fadeOut);

      ctx?.save();
      ctx?.translate(p.x, p.y);
      ctx?.rotate((p.rotation * Math.PI) / 180);

      if (ctx) {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w + p.tilt, p.h);
      }

      ctx?.restore();
    }

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);
}
