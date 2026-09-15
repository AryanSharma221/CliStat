import { useEffect, useRef, useState } from "react";
import acPhoto from "./imports/image.png";

/* ─── 3-D Wind Canvas ─────────────────────────────────────────── */
interface Particle {
  ox: number; oy: number;
  dx: number; dy: number;
  z: number; dz: number;
  spread: number;
  baseR: number;
  maxA: number;
  wobble: number; wobbleSpeed: number;
  layer: 0 | 1 | 2;
}

function Wind3D({
  ventX, ventY, active, cursorRef,
}: {
  ventX: number; ventY: number; active: boolean;
  cursorRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const particles: Particle[] = [];
    let spawnT = 0;
    let smoothDx = 0, smoothDy = 1;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const spawn = (ox: number, oy: number, cdx: number, cdy: number) => {
      if (Math.random() < 0.2) {
        const a = Math.atan2(cdy, cdx) + (Math.random() - 0.5) * 0.5;
        particles.push({ ox, oy, dx: Math.cos(a), dy: Math.sin(a), z: 0, dz: 0.0009 + Math.random() * 0.0005, spread: 0.2 + Math.random() * 0.1, baseR: 100 + Math.random() * 80, maxA: 0.045 + Math.random() * 0.02, wobble: Math.random() * Math.PI * 2, wobbleSpeed: 0.007 + Math.random() * 0.005, layer: 0 });
      }
      for (let i = 0; i < 2; i++) {
        const a = Math.atan2(cdy, cdx) + (Math.random() - 0.5) * 0.9;
        particles.push({ ox, oy, dx: Math.cos(a), dy: Math.sin(a), z: 0, dz: 0.0015 + Math.random() * 0.001, spread: 0.3 + Math.random() * 0.15, baseR: 45 + Math.random() * 50, maxA: 0.1 + Math.random() * 0.06, wobble: Math.random() * Math.PI * 2, wobbleSpeed: 0.012 + Math.random() * 0.008, layer: 1 });
      }
      for (let i = 0; i < 3; i++) {
        const a = Math.atan2(cdy, cdx) + (Math.random() - 0.5) * 1.3;
        particles.push({ ox, oy, dx: Math.cos(a), dy: Math.sin(a), z: 0, dz: 0.003 + Math.random() * 0.002, spread: 0.4 + Math.random() * 0.2, baseR: 16 + Math.random() * 24, maxA: 0.17 + Math.random() * 0.1, wobble: Math.random() * Math.PI * 2, wobbleSpeed: 0.02 + Math.random() * 0.012, layer: 2 });
      }
    };

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, w, h);

      // Use latest ventX/ventY from closure — updated via ref below
      const ox = (canvas as any)._ventX ?? ventX;
      const oy = (canvas as any)._ventY ?? ventY;

      if (active) {
        const { x: cx, y: cy } = cursorRef.current;
        let tdx = cx > 0 ? cx - ox : 0;
        let tdy = cy > 0 ? cy - oy : 80;
        const len = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        tdx /= len; tdy /= len;
        smoothDx += (tdx - smoothDx) * 0.035;
        smoothDy += (tdy - smoothDy) * 0.035;
        const sl = Math.sqrt(smoothDx * smoothDx + smoothDy * smoothDy) || 1;

        if (ts - spawnT > 95) {
          spawn(ox, oy, smoothDx / sl, smoothDy / sl);
          spawnT = ts;
        }
      }

      particles.sort((a, b) => a.z - b.z);

      let i = particles.length;
      while (i--) {
        const p = particles[i];
        p.z += p.dz;
        if (p.z >= 1) { particles.splice(i, 1); continue; }

        const scale = 1 + p.z * 3.5;
        const r = p.baseR * scale;

        p.wobble += p.wobbleSpeed;
        const perpX = -p.dy, perpY = p.dx;
        const travel = p.spread * p.z * Math.min(w, h);
        const wob = Math.sin(p.wobble) * 26 * p.z;
        const px = p.ox + p.dx * travel + perpX * wob;
        const py = p.oy + p.dy * travel + perpY * wob;

        const a = p.z < 0.18
          ? (p.z / 0.18) * p.maxA
          : p.maxA * Math.pow(1 - (p.z - 0.18) / 0.82, 1.5);
        const a2 = Math.min(1, Math.max(0, a));

        type RGB = [number, number, number];
        const rgb: RGB = p.layer === 0 ? [190, 225, 255] : p.layer === 1 ? [225, 245, 255] : [255, 255, 255];
        const midA = Math.min(1, Math.max(0, a2 * 0.35));

        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0,   `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a2.toFixed(4)})`);
        g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${midA.toFixed(4)})`);
        g.addColorStop(1,   `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Sync ventX/ventY changes without restarting the effect
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any)._ventX = ventX;
      (canvasRef.current as any)._ventY = ventY;
    }
  }, [ventX, ventY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        pointerEvents: "none", zIndex: 6,
        filter: "blur(14px)",
        mixBlendMode: "screen",
      }}
    />
  );
}

/* ─── AC Photo ────────────────────────────────────────────────── */
function AcUnit({ phase }: { phase: "closed" | "opening" | "blowing" }) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <img
        src={acPhoto}
        alt="Wall-mounted air conditioning unit"
        style={{
          width: "100%",
          display: "block",
          filter: "drop-shadow(0 16px 48px rgba(0,0,0,0.8)) drop-shadow(0 4px 14px rgba(0,0,0,0.6))",
        }}
      />
      {/* Vent glow at bottom of unit */}
      <div style={{
        position: "absolute",
        bottom: "12%",
        left: "10%",
        right: "10%",
        height: 3,
        background: "linear-gradient(90deg, transparent, rgba(120,220,255,0.9), transparent)",
        filter: "blur(3px)",
        opacity: phase === "blowing" ? 1 : 0,
        transition: "opacity 0.7s ease",
      }} />
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function CinematicHero({ onScrollDown }: { onScrollDown: () => void }) {
  const [phase, setPhase] = useState<"closed" | "opening" | "blowing">("closed");
  const sectionRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef({ x: -1, y: -1 });

  // ventX/ventY in pixels relative to the section
  const [ventPos, setVentPos] = useState({ x: 0, y: 0 });

  // Measure the AC vent position relative to the hero section
  const measureVent = () => {
    const section = sectionRef.current;
    const ac = acRef.current;
    if (!section || !ac) return;
    const sRect = section.getBoundingClientRect();
    const aRect = ac.getBoundingClientRect();
    // Vent is at the bottom of the AC SVG (≈90% down), horizontally centred
    const ventX = aRect.left - sRect.left + aRect.width / 2;
    const ventY = aRect.top  - sRect.top  + aRect.height * 0.90;
    setVentPos({ x: ventX, y: ventY });
  };

  useEffect(() => {
    measureVent();
    window.addEventListener("resize", measureVent);
    return () => window.removeEventListener("resize", measureVent);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("opening"),  650);
    const t2 = setTimeout(() => { setPhase("blowing"); measureVent(); }, 1850);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return;
      cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="Overview"
      style={{
        position: "relative", width: "100%", minHeight: "100vh",
        overflow: "hidden", display: "flex", alignItems: "center",
        background: "linear-gradient(150deg, #0a0806 0%, #160e09 50%, #0e0c0a 100%)",
      }}
    >
      {/* Ambient glow from AC */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse 50% 40% at ${ventPos.x}px ${ventPos.y}px, rgba(100,185,230,0.10) 0%, transparent 70%)`,
        opacity: phase === "blowing" ? 1 : 0,
        transition: "opacity 2.5s ease",
      }} />

      {/* Wind canvas */}
      <Wind3D
        ventX={ventPos.x}
        ventY={ventPos.y}
        active={phase === "blowing"}
        cursorRef={cursorRef}
      />

      {/* AC unit — upper right, measured via ref */}
      <div ref={acRef} style={{ position: "absolute", top: "7%", right: "5%", width: "clamp(220px, 36vw, 430px)", zIndex: 10 }}>
        <AcUnit phase={phase} />
      </div>

      {/* Text content */}
      <div style={{
        position: "relative", zIndex: 20,
        maxWidth: 540,
        padding: "0 0 0 clamp(22px, 5.5vw, 78px)",
        marginTop: "4vh",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-mono)", fontSize: 10,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "rgba(140,215,255,0.65)",
          border: "1px solid rgba(140,215,255,0.18)",
          padding: "6px 14px", marginBottom: 30,
          opacity: phase === "blowing" ? 1 : 0,
          transform: phase === "blowing" ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.9s ease 0.4s, transform 0.9s ease 0.4s",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3de", boxShadow: "0 0 8px #3de", display: "inline-block" }} />
          AC online · cooling active
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(40px, 5.5vw, 72px)",
          fontWeight: 600, lineHeight: 1.07,
          color: "#f0ece6", marginBottom: 22,
        }}>
          Outdoor heat<br />
          read.{" "}
          <em style={{ fontStyle: "italic", fontWeight: 300, color: "#7cc8e6" }}>Indoor</em>
          <br />temperature set.
        </h1>

        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 16,
          lineHeight: 1.75, color: "rgba(240,236,230,0.45)",
          maxWidth: 420, marginBottom: 38,
        }}>
          ThermoSync reads outdoor thermal conditions through a 12-node sensor mesh and adjusts your indoor HVAC setpoint automatically using a PID control loop on an edge microcontroller.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={onScrollDown}
            style={{ padding: "13px 28px", background: "#c2522b", color: "white", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, border: "none", cursor: "none" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Run a simulation
          </button>
          <button onClick={() => document.getElementById("How It Works")?.scrollIntoView({ behavior: "smooth" })}
            style={{ padding: "13px 28px", background: "transparent", color: "rgba(240,236,230,0.5)", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, border: "1px solid rgba(240,236,230,0.16)", cursor: "none" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(240,236,230,0.45)"; e.currentTarget.style.color = "rgba(240,236,230,0.88)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(240,236,230,0.16)"; e.currentTarget.style.color = "rgba(240,236,230,0.5)"; }}
          >
            See how it works
          </button>
        </div>
      </div>

      {/* Spec strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexWrap: "wrap",
        padding: "16px clamp(22px, 5.5vw, 78px)",
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)",
      }}>
        {[
          { label: "Sensor nodes", value: "12 active" },
          { label: "Protocol",     value: "I2C / MQTT" },
          { label: "Controller",   value: "ESP32 + PID" },
          { label: "Response",     value: "Sub-second" },
        ].map((s, i) => (
          <div key={s.label} style={{ paddingRight: 40, borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none", marginRight: i < 3 ? 40 : 0 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>{s.label}</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "rgba(240,236,230,0.7)", fontWeight: 500 }}>{s.value}</p>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, opacity: 0.28 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "white" }}>Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </div>
      </div>
    </section>
  );
}
