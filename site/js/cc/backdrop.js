// Command Center — animated constellation backdrop (canvas 2D, no deps).
// Drifting nodes wired with faint lines; brightens near the pointer.
// Honors prefers-reduced-motion by drawing a single static frame.

export default function initBackdrop(canvasId = "ccBg") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const LINK2 = 15000; // px^2 link distance
  let W = 0, H = 0, pts = [], raf = 0;
  const mouse = { x: -9999, y: -9999 };

  function build() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, W * dpr);
    canvas.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(24, Math.min(90, Math.floor((W * H) / 17000)));
    pts = new Array(count).fill(0).map(() => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      violet: Math.random() < 0.3,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK2) {
          const o = (1 - d2 / LINK2) * 0.16;
          ctx.strokeStyle = `rgba(67,230,255,${o})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      const near = Math.abs(p.x - mouse.x) < 120 && Math.abs(p.y - mouse.y) < 120;
      ctx.fillStyle = p.violet
        ? `rgba(167,139,250,${near ? 0.9 : 0.45})`
        : `rgba(67,230,255,${near ? 0.95 : 0.5})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, near ? 2.1 : 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop() {
    if (!document.hidden) draw();
    raf = requestAnimationFrame(loop);
  }

  build();
  if (reduce) { draw(); }
  else {
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    loop();
  }
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); if (reduce) draw(); }, 200);
  }, { passive: true });

  return () => cancelAnimationFrame(raf);
}
