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
      // speaking pulse — multiple frequencies stacked for an organic voice-like rhythm
      const speakBoost =
        state === "speaking"
          ? 1 + 0.22 * Math.sin(elapsed * 7) + 0.12 * Math.sin(elapsed * 13.3) + 0.06 * Math.sin(elapsed * 21)
          : 1;
      const thinkBoost =
        state === "thinking" ? 1 + 0.06 * Math.sin(elapsed * 4) : 1;
      const listenBoost =
        state === "listening" ? 1 + 0.12 * Math.sin(elapsed * 6) : 1;
      const totalBoost = speakBoost * thinkBoost * listenBoost;

      // particles
      particles.forEach((p, i) => {
        p.a += p.s * (state === "speaking" ? 3 : state === "listening" ? 2 : 1);
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

      // ripple rings (more active and farther-traveling when speaking)
      const rippleCount = state === "speaking" ? 5 : state === "listening" ? 3 : 2;
      const rippleSpeed = state === "speaking" ? 1.0 : 0.5;
      const rippleDist = state === "speaking" ? 0.9 : 0.55;
      const rippleAlpha = state === "speaking" ? 0.45 : 0.22;
      const rippleWidth = state === "speaking" ? 1.8 : 1.2;
      for (let i = 0; i < rippleCount; i++) {
        const phase = (elapsed * rippleSpeed + i / rippleCount) % 1;
        const rr = (size * 0.42) + phase * size * rippleDist;
        const alpha = (1 - phase) * rippleAlpha * intensity;
        ctx.strokeStyle = `hsla(${hue}, 95%, 65%, ${alpha})`;
        ctx.lineWidth = rippleWidth;
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

      // speaking — voice-reactive spike ring around the orb (EQ-style bars driven by stacked sines)
      if (state === "speaking") {
        const NUM_BARS = 96;
        const innerR = coreR * 1.06;
        const maxBar = size * 0.22;
        ctx.lineCap = "round";
        for (let i = 0; i < NUM_BARS; i++) {
          const ang = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2;
          const f1 = Math.sin(elapsed * 6.0 + i * 0.45);
          const f2 = Math.sin(elapsed * 11.0 + i * 0.31) * 0.65;
          const f3 = Math.sin(elapsed * 3.2 + i * 0.18) * 0.85;
          const f4 = Math.sin(elapsed * 17.0 + i * 0.07) * 0.35;
          const amp = (f1 + f2 + f3 + f4) / 2.85;
          const env = 0.22 + 0.78 * Math.abs(amp);
          const barH = env * maxBar;
          const x1 = cx + Math.cos(ang) * innerR;
          const y1 = cy + Math.sin(ang) * innerR;
          const x2 = cx + Math.cos(ang) * (innerR + barH);
          const y2 = cy + Math.sin(ang) * (innerR + barH);
          const light = 65 + env * 25;
          ctx.strokeStyle = `hsla(${hue}, 100%, ${light}%, ${(0.55 + env * 0.45) * intensity})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // expanding shockwave rings layered on top
        for (let i = 0; i < 3; i++) {
          const ph = (elapsed * 1.6 + i * 0.33) % 1;
          const rr = coreR * (1.05 + ph * 0.7);
          const alpha = (1 - ph) * 0.55 * intensity;
          ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${alpha})`;
          ctx.lineWidth = 1.5 - ph * 0.8;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
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
