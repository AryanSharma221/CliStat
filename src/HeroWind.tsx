import { useEffect, useRef } from "react";

interface Cloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  life: number; // 0..1
  decay: number;
  layer: number; // 0=back 1=mid 2=front
}

interface Props {
  acX: number; // vent position as fraction of container width
  acY: number; // vent position as fraction of container height
}

export default function HeroWind({ acX, acY }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clouds = useRef<Cloud[]>([]);
  const raf = useRef<number>(0);
  const spawnTimer = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const spawn = () => {
      const ox = w * acX;
      const oy = h * acY;

      // back layer: huge, very faint, slow mega blobs
      if (Math.random() < 0.3) {
        clouds.current.push({
          x: ox + (Math.random() - 0.5) * 60,
          y: oy,
          vx: (Math.random() - 0.5) * 0.35,
          vy: 0.55 + Math.random() * 0.4,
          radius: 140 + Math.random() * 120,
          alpha: 0,
          maxAlpha: 0.045 + Math.random() * 0.03,
          life: 0,
          decay: 0.0018 + Math.random() * 0.001,
          layer: 0,
        });
      }

      // mid layer: medium clouds, main body of wind
      for (let i = 0; i < 2; i++) {
        clouds.current.push({
          x: ox + (Math.random() - 0.5) * 40,
          y: oy + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.7 + Math.random() * 0.6,
          radius: 55 + Math.random() * 70,
          alpha: 0,
          maxAlpha: 0.08 + Math.random() * 0.06,
          life: 0,
          decay: 0.0025 + Math.random() * 0.0015,
          layer: 1,
        });
      }

      // front layer: small wispy tendrils
      for (let i = 0; i < 3; i++) {
        clouds.current.push({
          x: ox + (Math.random() - 0.5) * 30,
          y: oy + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.45) * 0.7,
          vy: 0.9 + Math.random() * 0.8,
          radius: 18 + Math.random() * 30,
          alpha: 0,
          maxAlpha: 0.12 + Math.random() * 0.08,
          life: 0,
          decay: 0.004 + Math.random() * 0.003,
          layer: 2,
        });
      }
    };

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, w, h);

      // spawn on interval
      if (ts - spawnTimer.current > 120) {
        spawn();
        spawnTimer.current = ts;
      }

      const keep: Cloud[] = [];
      for (const c of clouds.current) {
        // fade in quickly then decay
        if (c.life < 0.15) {
          c.alpha = (c.life / 0.15) * c.maxAlpha;
        } else {
          c.alpha = c.maxAlpha * (1 - (c.life - 0.15) / 0.85);
        }
        c.life += c.decay;
        if (c.life >= 1) continue;

        c.vx += (Math.random() - 0.5) * 0.02; // slight turbulence
        c.x += c.vx;
        c.y += c.vy;

        // cool AC air colors: white -> ice blue -> faint teal
        const colors =
          c.layer === 0
            ? ["rgba(230,245,255,A)", "rgba(200,230,255,A)", "rgba(180,220,245,0)"]
            : c.layer === 1
            ? ["rgba(245,252,255,A)", "rgba(210,238,255,A)", "rgba(180,220,250,0)"]
            : ["rgba(255,255,255,A)", "rgba(215,240,255,A)", "rgba(190,225,255,0)"];

        const a = (val: string) => val.replace("A", String(c.alpha));

        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
        grad.addColorStop(0, a(colors[0]));
        grad.addColorStop(0.45, a(colors[1]));
        grad.addColorStop(1, colors[2]);

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        keep.push(c);
      }
      clouds.current = keep;
      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, [acX, acY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 4,
        filter: "blur(18px)",
        opacity: 0.9,
      }}
    />
  );
}
