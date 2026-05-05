/* global React */
const { useEffect, useRef, useState } = React;

// The blue orb — radial gradient core, pulsing halos, ripples on speak, ambient particles
function Orb({ state, hue = 222, size = 380, intensity = 1 }) {
  // state: 'idle' | 'listening' | 'thinking' | 'speaking'
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = size * 2.2;
    const H = size * 2.2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    // particle field
    const N = 80;
    const particles = Array.from({ length: N }, () => ({
      a: Math.random() * Math.PI * 2,
      r: size * 0.55 + Math.random() * size * 0.6,
      s: 0.0008 + Math.random() * 0.002,
      z: Math.random(),
      tw: Math.random() * Math.PI * 2,
    }));

    const draw = (t) => {
      const elapsed = (t - startRef.current) / 1000;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;

      // ambient outer glow that breathes
      const breathe = 0.5 + 0.5 * Math.sin(elapsed * 0.8);
      // speaking — gentle, quiet pulse
      const speakBoost =
        state === "speaking" ? 1 + 0.06 * Math.sin(elapsed * 2.4) : 1;
      const thinkBoost =
        state === "thinking" ? 1 + 0.04 * Math.sin(elapsed * 3) : 1;
      const listenBoost =
        state === "listening" ? 1 + 0.08 * Math.sin(elapsed * 5) : 1;
      const totalBoost = speakBoost * thinkBoost * listenBoost;

      // particles
      particles.forEach((p, i) => {
        p.a += p.s * (state === "speaking" ? 1.3 : state === "listening" ? 1.5 : 1);
        p.tw += 0.04;
        const px = cx + Math.cos(p.a) * p.r;
        const py = cy + Math.sin(p.a) * p.r * 0.95;
        const tw = 0.4 + 0.6 * (Math.sin(p.tw) * 0.5 + 0.5);
        const sz = 0.6 + p.z * 1.6;
        ctx.fillStyle = `hsla(${hue}, 90%, ${70 + p.z * 20}%, ${tw * 0.55 * intensity})`;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      });

      // ripple rings — calm and minimal
      const rippleCount = state === "speaking" ? 3 : state === "listening" ? 3 : 2;
      const rippleSpeed = state === "speaking" ? 0.55 : 0.5;
      for (let i = 0; i < rippleCount; i++) {
        const phase = (elapsed * rippleSpeed + i / rippleCount) % 1;
        const rr = (size * 0.42) + phase * size * 0.55;
        const alpha = (1 - phase) * 0.18 * intensity;
        ctx.strokeStyle = `hsla(${hue}, 95%, 65%, ${alpha})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // outermost soft halo
      const haloR = size * 0.95 * totalBoost * (0.95 + breathe * 0.05);
      const halo = ctx.createRadialGradient(cx, cy, size * 0.35, cx, cy, haloR);
      halo.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.35 * intensity})`);
      halo.addColorStop(0.5, `hsla(${hue}, 100%, 55%, ${0.10 * intensity})`);
      halo.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // core orb — multi-stop radial
      const coreR = size * 0.4 * totalBoost;
      const core = ctx.createRadialGradient(
        cx - coreR * 0.25,
        cy - coreR * 0.3,
        coreR * 0.05,
        cx,
        cy,
        coreR
      );
      core.addColorStop(0, `hsla(${hue}, 100%, 92%, 1)`);
      core.addColorStop(0.18, `hsla(${hue}, 100%, 78%, 1)`);
      core.addColorStop(0.45, `hsla(${hue}, 100%, 55%, 1)`);
      core.addColorStop(0.78, `hsla(${hue}, 95%, 38%, 1)`);
      core.addColorStop(1, `hsla(${hue}, 90%, 18%, 1)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // inner specular highlight
      const spec = ctx.createRadialGradient(
        cx - coreR * 0.32,
        cy - coreR * 0.4,
        0,
        cx - coreR * 0.32,
        cy - coreR * 0.4,
        coreR * 0.55
      );
      spec.addColorStop(0, "hsla(0, 0%, 100%, 0.85)");
      spec.addColorStop(0.4, "hsla(0, 0%, 100%, 0.15)");
      spec.addColorStop(1, "hsla(0, 0%, 100%, 0)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // bottom rim light
      const rim = ctx.createRadialGradient(
        cx,
        cy + coreR * 0.6,
        coreR * 0.3,
        cx,
        cy + coreR * 0.6,
        coreR
      );
      rim.addColorStop(0, "hsla(210, 100%, 70%, 0)");
      rim.addColorStop(0.85, `hsla(${hue}, 100%, 70%, 0)`);
      rim.addColorStop(1, `hsla(${hue}, 100%, 80%, 0.45)`);
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // speaking — single soft halo pulse just outside the surface, very subtle
      if (state === "speaking") {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2);
        const ringR = coreR * (1.04 + pulse * 0.05);
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${(0.18 + pulse * 0.18) * intensity})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, hue, size, intensity]);

  return (
    <div
      style={{
        position: "relative",
        width: size * 2.2,
        height: size * 2.2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

window.Orb = Orb;
