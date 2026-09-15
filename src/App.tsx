import { useState, useEffect } from "react";

// ─── legal pages ──────────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 48 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      Back
    </button>
  );
}

function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ background: "var(--bg-deep)", minHeight: "100vh", padding: "80px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <BackBtn onClick={onBack} />
        <p className="label-green" style={{ marginBottom: 12 }}>Legal</p>
        <h1 className="condensed" style={{ fontSize: 52, color: "var(--text-primary)", marginBottom: 48, lineHeight: 1.05 }}>Privacy Policy</h1>
        <p className="mono" style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 48 }}>Last updated: September 16, 2026</p>
        {[
          { h: "What we collect", b: "This site does not collect personal data. There are no accounts, forms, or tracking cookies. The site runs entirely in your browser and no data is sent to a server." },
          { h: "Third-party services", b: "No analytics, advertising, or social tracking scripts are used on this site." },
          { h: "Contact", b: "Questions about this policy can be directed to the project repository on GitHub." },
        ].map((s, i, arr) => (
          <section key={s.h} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>{s.h}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)" }}>{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

function TermsPage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ background: "var(--bg-deep)", minHeight: "100vh", padding: "80px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <BackBtn onClick={onBack} />
        <p className="label-green" style={{ marginBottom: 12 }}>Legal</p>
        <h1 className="condensed" style={{ fontSize: 52, color: "var(--text-primary)", marginBottom: 48, lineHeight: 1.05 }}>Terms and Conditions</h1>
        <p className="mono" style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 48 }}>Last updated: September 16, 2026</p>
        {[
          { h: "Acceptance", b: "By accessing this site you agree to these terms. If you do not agree, please do not use the site." },
          { h: "Intellectual property", b: "The source code for this project is released under the MIT License. The site design and written content are copyright of the project authors." },
          { h: "No warranties", b: "This software is provided as-is, without warranty of any kind, express or implied." },
        ].map((s, i, arr) => (
          <section key={s.h} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>{s.h}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)" }}>{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

// ─── PEI logo SVG ─────────────────────────────────────────────────────────────
function PeiLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="rgba(16,201,122,0.15)"/>
      <path d="M14 6a2 2 0 0 0-2 2v7.17A4 4 0 1 0 16 15.17V8a2 2 0 0 0-2-2z" stroke="var(--green)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="14" cy="20" r="1.5" fill="var(--green)"/>
    </svg>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<"home" | "privacy" | "terms">("home");
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  if (page === "privacy") return <PrivacyPage onBack={() => setPage("home")} />;
  if (page === "terms") return <TermsPage onBack={() => setPage("home")} />;

  const navLinks = [
    { label: "Problem",      href: "#problem" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features",     href: "#features" },
    { label: "Demo",         href: "#demo" },
    { label: "Team",         href: "#team" },
  ];

  return (
    <div style={{ background: "#000" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          CINEMATIC HERO — full viewport, video background, glass card
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden", background: "#000" }}>

        {/* Background video */}
        <video
          autoPlay muted loop playsInline
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", zIndex: 0, pointerEvents: "none", userSelect: "none" }}
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_064556_051587f1-74a1-4336-8c05-4dde3594ed05.mp4" type="video/mp4" />
        </video>

        {/* Vignette overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(0,0,0,.18), transparent 24%, transparent 72%, rgba(0,0,0,.55)), radial-gradient(ellipse at 44% 54%, transparent 30%, rgba(0,0,0,.38) 100%)",
        }} />

        {/* ── TOP NAV ── */}
        <header style={{ position: "absolute", top: "clamp(20px, 2.3vh, 30px)", left: "var(--gutter)", right: "var(--gutter)", zIndex: 10, display: "flex", alignItems: "center", gap: 0, whiteSpace: "nowrap" }}>

          {/* Brand */}
          <a href="#" aria-label="PEI home" className="animate-brand" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.3))" }}>
            <PeiLogo size={30} />
            <span style={{ fontFamily: "'Epilogue', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", letterSpacing: "-0.02em" }}>PEI</span>
          </a>

          {/* Nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "clamp(28px, 2.8vw, 42px)", marginLeft: "clamp(32px, 3vw, 48px)" }}>
            {navLinks.map((l, i) => (
              <a key={l.label} href={l.href}
                className={`animate-nav-${i + 1}`}
                style={{ fontSize: 15, fontWeight: 430, letterSpacing: "-0.02em", color: "rgba(229,229,230,.77)", textDecoration: "none", textShadow: "0 1px 3px rgba(0,0,0,.55)", transition: "color 140ms" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(229,229,230,.77)")}>
                {l.label}
              </a>
            ))}
          </nav>

          {/* Time / status panel */}
          <div className="animate-cta-nav" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ borderLeft: "2px solid rgba(16,201,122,0.5)", paddingLeft: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 420, color: "rgba(240,240,240,.65)", marginBottom: 2, fontFamily: "var(--mono)" }}>SYSTEM STATUS</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(16,201,122,.93)", fontFamily: "var(--mono)" }}>Digital Twin Active</p>
            </div>

            {/* Sign up / CTA */}
            <a href="#features" style={{
              display: "inline-flex", alignItems: "center",
              height: 40, padding: "0 20px",
              background: "#fff", color: "#101010",
              borderRadius: 7, textDecoration: "none",
              fontSize: 14, fontWeight: 460, letterSpacing: "-0.02em",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.72), 0 1px 5px rgba(0,0,0,.34)",
              transition: "filter 140ms",
            }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}>
              Explore
            </a>
          </div>
        </header>

        {/* ── HERO CONTENT — bottom left ── */}
        <div style={{ position: "absolute", left: "var(--gutter)", bottom: "var(--hero-bottom)", zIndex: 10, maxWidth: "min(680px, 55vw)" }}>

          {/* Headline — two lines with entrance clip */}
          <h1 style={{ marginBottom: "clamp(14px, 2vh, 22px)", lineHeight: 1 }}>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span className="animate-line-1 condensed" style={{
                display: "block", fontSize: "clamp(52px, 7.5vh, 96px)",
                color: "#fff", transform: "scaleX(0.88)", transformOrigin: "left center",
                textShadow: "0 2px 2px rgba(0,0,0,.44)",
              }}>
                Stop Reacting
              </span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span className="animate-line-2 condensed" style={{
                display: "block", fontSize: "clamp(52px, 7.5vh, 96px)",
                color: "rgba(211,207,207,.78)", transform: "scaleX(0.88)", transformOrigin: "left center",
                textShadow: "0 2px 2px rgba(0,0,0,.44)",
              }}>
                To The Heat.
              </span>
            </span>
          </h1>

          {/* Body copy */}
          <p className="animate-copy" style={{
            fontSize: "clamp(14px, 1.65vh, 18px)", lineHeight: "clamp(20px, 2.2vh, 26px)",
            fontWeight: 350, letterSpacing: "0.01em",
            color: "rgba(226,229,228,.84)", maxWidth: 480,
            textShadow: "0 1px 3px rgba(0,0,0,.7)",
            marginBottom: "clamp(22px, 3vh, 36px)",
          }}>
            Your building is already losing the battle against heat<br />
            before your thermostat even notices. PEI reads outdoor<br />
            thermal conditions 15 minutes ahead and acts first.
          </p>

          {/* Primary CTA — white button with dark arrow box */}
          <a href="#problem" className="animate-cta" style={{
            position: "relative", display: "inline-flex", alignItems: "center",
            width: "clamp(148px, 15vw, 172px)", height: "clamp(40px, 4vh, 46px)",
            borderRadius: 7, background: "#fff", color: "#111",
            textDecoration: "none", overflow: "hidden",
            boxShadow: "0 1px 5px rgba(0,0,0,.38)",
          }}>
            <span style={{ position: "absolute", left: "8%", fontSize: "clamp(14px, 1.7vh, 17px)", fontWeight: 450, letterSpacing: "-0.02em" }}>
              Learn More
            </span>
            <span style={{
              position: "absolute", right: "3%", top: "12%",
              width: "20%", height: "76%", borderRadius: 6,
              background: "#070909", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </a>
        </div>


        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,.3)", fontFamily: "var(--mono)", textTransform: "uppercase" }}>Scroll</p>
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none" style={{ animation: "entrance-fade-up 1s ease 1.8s both" }}>
            <path d="M7 2v12M2 10l5 5 5-5" stroke="rgba(255,255,255,.25)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SCROLLABLE SECTIONS BELOW
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── PROBLEM ── */}
      <section id="problem" style={{ background: "var(--ls-bg)", borderTop: "1px solid var(--ls-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 32px" }}>
          <p className="label" style={{ marginBottom: 20, color: "var(--ls-text-mute)" }}>The Problem</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start", marginBottom: 80 }}>
            <div>
              <h2 className="condensed" style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.05, color: "var(--ls-text)", marginBottom: 28 }}>
                Reactive cooling is a design flaw, not a feature.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ls-text-sec)" }}>
                The thermostat in your wall operates on a century-old principle: detect heat, respond to heat. By the time it acts, the damage is done. The system blasts at full power, draws peak-rate electricity, and stresses the grid at precisely the moment when demand is highest and emissions are worst.
              </p>
            </div>
            <div />
          </div>
          <div>
            {[
              { num: "I",   label: "Peak-hour blast",     body: "Reactive systems ramp to maximum power in the early afternoon when grid electricity is most expensive and dirtiest." },
              { num: "II",  label: "Comfort already lost", body: "By the time the thermostat triggers, occupants have already experienced discomfort. The system corrects for the past, not the present." },
              { num: "III", label: "Wasted thermal mass",  body: "Buildings naturally store heat. Reactive controllers ignore this, missing the window to pre-condition at cheaper, greener hours." },
            ].map(p => (
              <div key={p.label} style={{ position: "relative", borderTop: "1px solid var(--ls-border)", padding: "40px 0", overflow: "hidden" }}>
                <span className="condensed" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: 160, color: "rgba(0,0,0,0.04)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{p.num}</span>
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 60, alignItems: "center", position: "relative" }}>
                  <p className="condensed" style={{ fontSize: 28, color: "var(--ls-text)", lineHeight: 1.2 }}>{p.label}</p>
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--ls-text-sec)", maxWidth: 520 }}>{p.body}</p>
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--ls-border)" }} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: "var(--ls-bg-alt)", borderTop: "1px solid var(--ls-border)", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p className="label" style={{ marginBottom: 20, color: "var(--ls-text-mute)" }}>How It Works</p>
          <h2 className="condensed" style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.05, color: "var(--ls-text)", marginBottom: 16 }}>
            A 3D digital twin of your building,<br />running at the edge.
          </h2>
          <p style={{ fontSize: 16, color: "var(--ls-text-sec)", maxWidth: 600, marginBottom: 80, lineHeight: 1.7 }}>
            Our system builds a live physics model of your building: wall thermal mass, solar angle, occupancy patterns, weather forecast. Then a Model Predictive Control algorithm computes the optimal setpoint 15 minutes in advance.
          </p>

          {/* MPC steps — staggered waterfall */}
          <div style={{ marginBottom: 96 }}>
            {[
              { step: "01", title: "Sense", indent: "0%", body: "Thermal sensors sample outdoor and indoor conditions. Weather API feeds a 15-minute forecast. Sun position is calculated from latitude, longitude, and UTC time." },
              { step: "02", title: "Model", indent: "18%", body: "The digital twin calculates heat ingress across 5 physics vectors simultaneously: Solar Radiation, Human Occupancy, Envelope Leakage, Humidity, and Thermal Decay." },
              { step: "03", title: "Predict + Act", indent: "36%", body: "The MPC algorithm optimizes the setpoint trajectory that minimizes discomfort while shifting peak energy consumption to cheaper, greener grid moments." },
            ].map((s, i) => (
              <div key={s.step} style={{ position: "relative", paddingLeft: s.indent, paddingBottom: i < 2 ? 56 : 0 }}>
                <span className="condensed" style={{ position: "absolute", left: s.indent, top: -20, fontSize: 140, lineHeight: 1, color: "rgba(0,0,0,0.04)", userSelect: "none", pointerEvents: "none", zIndex: 0 }}>{s.step}</span>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--blue)", letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>{s.step}</span>
                  <h3 className="condensed" style={{ fontSize: "clamp(36px, 4vw, 52px)", color: "var(--ls-text)", lineHeight: 1.05, marginBottom: 16 }}>{s.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--ls-text-sec)", maxWidth: 480 }}>{s.body}</p>
                </div>
                {i < 2 && <div style={{ position: "absolute", bottom: 0, left: `calc(${s.indent} + 24px)`, width: 1, height: 40, background: "linear-gradient(to bottom, var(--ls-border), transparent)" }} />}
              </div>
            ))}
          </div>

          {/* 5 heat vectors — instrument panel */}
          <p className="label" style={{ marginBottom: 40, color: "var(--ls-text-mute)" }}>The 5 heat gain vectors modeled by the digital twin</p>
          <div style={{ borderTop: "1px solid var(--ls-border)" }}>
            {[
              { id: "Q_sol",  name: "Solar Radiation",  desc: "Sunlight passing through windows is the single largest heat source in most buildings. The angle of the sun shifts every minute, so the load on each facade changes constantly throughout the day." },
              { id: "Q_occ",  name: "Human Occupancy",  desc: "People generate heat just by being present. A room with ten people has a meaningfully different thermal profile than an empty one, and the system adjusts for this in real time." },
              { id: "Q_inf",  name: "Envelope Leakage", desc: "No building is perfectly sealed. Hot outside air seeps in through gaps, around windows, and through porous walls whenever the outdoor temperature exceeds the indoor target." },
              { id: "Q_lat",  name: "Humidity Load",    desc: "Moisture in the air carries hidden heat. High humidity means the HVAC must work harder even if the temperature reads normal, because the air feels hotter than it is." },
              { id: "Q_mass", name: "Thermal Decay",    desc: "Walls, floors and ceilings absorb heat during the day and slowly release it overnight. A building that felt cool at noon can still feel warm at midnight because of this stored energy." },
            ].map((v, i) => (
              <div key={v.id} style={{ borderBottom: "1px solid var(--ls-border)", padding: "36px 0", display: "grid", gridTemplateColumns: "36px 1fr", gap: "0 40px", alignItems: "start" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ls-text-mute)", paddingTop: 5 }}>0{i + 1}</span>
                <div>
                  <p className="condensed" style={{ fontSize: 26, color: "var(--ls-text)", lineHeight: 1.1, marginBottom: 14 }}>{v.name}</p>
                  <p style={{ fontSize: 15, color: "var(--ls-text-sec)", lineHeight: 1.75, maxWidth: 640 }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: "var(--ls-bg)", borderTop: "1px solid var(--ls-border)", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p className="label" style={{ marginBottom: 20, color: "var(--ls-text-mute)" }}>Features</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 80 }}>
            <h2 className="condensed" style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.05, color: "var(--ls-text)" }}>
              Six things the system does that no thermostat can.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ls-text-sec)" }}>
              Each feature below is a direct response to a specific failure mode in conventional reactive HVAC. Together they form a closed-loop intelligence layer that replaces guesswork with physics.
            </p>
          </div>
          {[
            { index: "01", size: 72,  title: "Predictive Lookahead",    body: "Acts 15 minutes early. The system calculates when to begin cooling before the heat arrives, so the room is already comfortable when you need it." },
            { index: "02", size: 52,  title: "5-Vector Heat Modeling",   body: "Tracks five independent heat sources at once: sun angle, people, wall leakage, moisture, and stored thermal mass. Not just the temperature on the wall." },
            { index: "03", size: 88,  title: "Grid-Aware Scheduling",    body: "Shifts heavy cooling to cheaper, lower-emission grid hours. Same comfort, less cost, less carbon." },
            { index: "04", size: 60,  title: "Anomaly Detection",        body: "Catches deviations the moment they happen: an open window, a crowded room, a stuck valve. The model recalculates before you notice anything is off." },
            { index: "05", size: 44,  title: "Profile Adaptation",       body: "Maintains a separate thermal model for each building type. An office and a home are treated as fundamentally different systems, not the same template." },
            { index: "06", size: 68,  title: "Edge-Native Execution",    body: "The entire control loop runs on a microcontroller in the building. No cloud, no latency. Sensor reads, model computes, valve opens, all in under a second." },
          ].map((f, i) => (
            <div key={f.index} style={{ borderTop: "1px solid var(--ls-border)", padding: "40px 0 44px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginBottom: 16 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--ls-text-mute)", flexShrink: 0, paddingBottom: 4 }}>{f.index}</span>
                <p className="condensed" style={{ fontSize: f.size, lineHeight: 0.95, color: "var(--ls-text)", letterSpacing: "-0.03em" }}>{f.title}</p>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ls-text-sec)", marginLeft: 30, maxWidth: 560 }}>{f.body}</p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--ls-border)" }} />
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section style={{ background: "var(--ls-bg-alt)", borderTop: "1px solid var(--ls-border)", padding: "80px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 56 }}>
            <p className="label" style={{ color: "var(--ls-text-mute)" }}>System architecture</p>
            <p className="mono" style={{ fontSize: 11, color: "var(--ls-text-mute)" }}>Read top to bottom</p>
          </div>

{[
            {
              stage: "01", phase: "INPUT",
              label: "Sensing",
              accent: "#0ea5e9",
              what: "The building is instrumented with temperature, humidity, and CO₂ sensors at key positions. Every 800ms, all readings are collected and cross-checked against each other.",
              signals: ["Room temperature", "Outdoor weather feed", "Humidity + CO₂", "Window and door state"],
            },
            {
              stage: "02", phase: "MODEL",
              label: "Digital Twin",
              accent: "#0ea5e9",
              what: "A live physics simulation tracks how heat moves through walls, glass, air, and people. It projects the building's thermal state 15 minutes forward before any decision is made.",
              signals: ["Solar angle calculation", "Thermal mass accounting", "Occupancy heat load", "Envelope loss rate"],
            },
            {
              stage: "03", phase: "DECIDE",
              label: "Control",
              accent: "#c2692a",
              what: "The MPC algorithm solves for the lowest-cost cooling path that keeps the building comfortable. It weighs grid carbon intensity and pre-conditions the space before the heat arrives. Runs fully on-device.",
              signals: ["MPC optimization loop", "Grid carbon intensity", "15-minute trajectory", "Comfort boundary check"],
            },
            {
              stage: "04", phase: "OUTPUT",
              label: "Actuation",
              accent: "#10c97a",
              what: "Commands are dispatched via MQTT to the HVAC actuators. The full cycle from sensor read to valve response completes in under one second, with no cloud round-trip.",
              signals: ["MQTT to HVAC unit", "Damper and valve control", "Status back-feed", "Time-series log"],
            },
          ].map((row, i) => (
            <div key={row.stage} style={{ borderTop: "1px solid var(--ls-border)", padding: "44px 0", display: "grid", gridTemplateColumns: "48px 220px 1fr 280px", gap: "0 48px", alignItems: "start" }}>
              {/* step number */}
              <span className="mono" style={{ fontSize: 10, color: "var(--ls-text-mute)", paddingTop: 6 }}>{row.stage}</span>

              {/* stage name */}
              <div>
                <p className="mono" style={{ fontSize: 9, color: row.accent, letterSpacing: "0.14em", marginBottom: 10 }}>{row.phase}</p>
                <p className="condensed" style={{ fontSize: 40, color: "var(--ls-text)", lineHeight: 1 }}>{row.label}</p>
              </div>

              {/* explanation */}
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ls-text-sec)", paddingTop: 2 }}>{row.what}</p>

              {/* signals as flowing inline text */}
              <p className="mono" style={{ fontSize: 11, color: "var(--ls-text-mute)", lineHeight: 2, paddingTop: 4 }}>
                {row.signals.join("  ·  ")}
              </p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--ls-border)" }} />
        </div>
      </section>

      {/* ── DEMO / DIGITAL TWIN ── */}
      <section id="demo" style={{ background: "var(--ls-bg)", borderTop: "1px solid var(--ls-border)", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <p className="label" style={{ marginBottom: 20, color: "var(--ls-text-mute)" }}>Live Demonstration</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 40 }}>
            <h2 className="condensed" style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.05, color: "var(--ls-text)" }}>
              Vision-Predictive Digital Twin
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ls-text-sec)" }}>
              Interact with the live simulation. The system tracks sun angles, room thermal mass, and occupancy, projecting the thermal state 15 minutes forward to optimize HVAC power via PID+FF and MPC algorithms.
            </p>
          </div>
          
          <div style={{ width: '100%', height: '800px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--ls-border)', background: '#000' }}>
            <iframe 
              src="/thermostat/index.html" 
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Predictive Thermostat Simulation"
            />
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" style={{ background: "var(--ls-bg)", borderTop: "1px solid var(--ls-border)", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p className="label" style={{ marginBottom: 20, color: "var(--ls-text-mute)" }}>Team</p>
          <h2 className="condensed" style={{ fontSize: "clamp(36px, 4.5vw, 58px)", lineHeight: 1.05, color: "var(--ls-text)", marginBottom: 80 }}>
            Three people. One problem. No sleep.
          </h2>
          {[
            { name: "Chinmay Gupta", role: "UI + Visualization",   detail: "Digital twin rendering, real-time data visualization, interface design", align: "flex-start" as const, nameSize: 52 },
            { name: "Aryan Sharma",  role: "Physics + Environment", detail: "Solar ray-casting model, thermal mass calculations, sensor fusion",      align: "center"     as const, nameSize: 52 },
            { name: "Harnoor Kant",  role: "AI + Control Systems",  detail: "MPC algorithm, PID executor, MQTT actuation pipeline",                   align: "flex-end"   as const, nameSize: 56 },
          ].map(m => (
            <div key={m.name} style={{ borderTop: "1px solid var(--ls-border)", padding: "36px 0", display: "flex", flexDirection: "column", alignItems: m.align }}>
              <p className="mono" style={{ fontSize: 10, color: "var(--blue)", letterSpacing: "0.12em", marginBottom: 10 }}>{m.role.toUpperCase()}</p>
              <p className="condensed" style={{ fontSize: m.nameSize, color: "var(--ls-text)", lineHeight: 1, marginBottom: 12 }}>{m.name}</p>
              <p style={{ fontSize: 13, color: "var(--ls-text-sec)", maxWidth: 320, textAlign: m.align === "center" ? "center" : m.align === "flex-end" ? "right" : "left" }}>{m.detail}</p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--ls-border)" }} />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "var(--ls-bg-alt)", borderTop: "1px solid var(--ls-border)", padding: "60px 32px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, flexWrap: "wrap", marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <PeiLogo size={26} />
                <span className="condensed" style={{ fontSize: 18, color: "var(--ls-text)" }}>Predictive Environmental Intelligence</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--ls-text-sec)", maxWidth: 340, lineHeight: 1.65 }}>
                An AI-driven climate controller that stops reacting to heat and starts predicting it.
              </p>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <a href="#features" className="btn-primary">Explore features</a>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "transparent", color: "var(--ls-text)", fontSize: 14, fontWeight: 500, padding: "12px 28px", border: "1px solid var(--ls-border)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "border-color 0.2s" }}>Back to top</button>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--ls-border)", paddingTop: 24, display: "flex", gap: 24 }}>
            <button onClick={() => setPage("privacy")} style={{ fontSize: 12, color: "var(--ls-text-mute)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--mono)" }}>Privacy Policy</button>
            <button onClick={() => setPage("terms")}   style={{ fontSize: 12, color: "var(--ls-text-mute)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--mono)" }}>Terms and Conditions</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
