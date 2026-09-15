import { useState, useEffect } from "react";
import CursorAir from "./CursorAir";
import CinematicHero from "./CinematicHero";


type Page = "home" | "terms" | "privacy";

const NAV_LINKS = ["Overview", "How It Works", "Features", "Demo", "Team"];

function useAnimatedTemp(target: number, speed = 0.03) {
  const [val, setVal] = useState(target);
  useEffect(() => {
    let raf: number;
    const step = () => {
      setVal((v) => {
        const diff = target - v;
        if (Math.abs(diff) < 0.05) return target;
        return v + diff * speed;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return val;
}

const SCENARIOS = [
  { label: "Sunny Afternoon", outside: 42, inside: 22, humidity: 38, status: "Cooling Active" },
  { label: "Cold Morning", outside: 4, inside: 21, humidity: 62, status: "Heating Active" },
  { label: "Mild Evening", outside: 24, inside: 23, humidity: 55, status: "Balanced" },
];

function ThermoGauge({ temp, label, accent }: { temp: number; label: string; accent: string }) {
  const pct = Math.max(0, Math.min(100, ((temp + 10) / 60) * 100));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-14 h-32 flex items-end justify-center">
        <div className="absolute bottom-0 w-5 rounded-full overflow-hidden" style={{ height: "100%" }}>
          <div className="w-full bg-white/10 rounded-full" style={{ height: "100%" }}>
            <div
              className="w-full rounded-full transition-all duration-700"
              style={{ height: `${pct}%`, background: accent, marginTop: `${100 - pct}%` }}
            />
          </div>
        </div>
        <div className="absolute bottom-0 w-10 h-10 rounded-full border-4 border-[#2c2319] z-10" style={{ background: accent }} />
      </div>
      <span className="text-xs font-[var(--font-mono)] text-[#7a6a58] tracking-widest uppercase">{label}</span>
      <span className="text-2xl font-[var(--font-display)] font-semibold text-[#2c2319]">{temp.toFixed(1)}C</span>
    </div>
  );
}

function DemoSection() {
  return (
    <section id="Demo" className="py-24 px-6 bg-[#f2ead8]">
      <div className="max-w-7xl mx-auto">
        <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-3">Live Simulation</p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <h2 className="text-4xl md:text-5xl font-[var(--font-display)] font-semibold text-[#2c2319] leading-tight">
            Vision-Predictive<br />
            <em className="font-light italic">Digital Twin</em>
          </h2>
        </div>

        <div className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-[#2c2319]" style={{ height: "800px" }}>
          <iframe 
            src="/Simulation_Final/index.html" 
            className="w-full h-full"
            title="Climate Thermostat Simulation"
          ></iframe>
        </div>
      </div>
    </section>
  );
}

function TermsPage({ onBack }: { onBack: () => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <button onClick={onBack} className="text-sm text-[#7a6a58] hover:text-[#2c2319] transition-colors mb-10 cursor-pointer flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to ThermoSync
        </button>
        <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-3">Legal</p>
        <h1 className="text-4xl font-[var(--font-display)] font-semibold text-[#2c2319] mb-3">Terms and Conditions</h1>
        <p className="text-sm text-[#7a6a58] font-[var(--font-mono)] mb-12">Last updated: 14 September 2026</p>

        <div className="prose-like flex flex-col gap-10 text-[#2c2319]">
          {[
            {
              title: "1. Acceptance of Terms",
              body: "By accessing or using ThermoSync (\"the System\"), including its hardware, firmware, software dashboard, and API, you agree to be bound by these Terms and Conditions. If you do not agree, you must discontinue use immediately. These terms apply to all users, including prototype evaluators, institutional partners, and individual end users.",
            },
            {
              title: "2. Scope of the System",
              body: "ThermoSync is a thermal regulation system that reads ambient outdoor temperature via sensor nodes and uses a PID control loop to adjust indoor HVAC setpoints automatically. The system is provided as a prototype for evaluation purposes. It is not certified for use in safety-critical environments, medical facilities, or any installation requiring regulatory approval.",
            },
            {
              title: "3. Permitted Use",
              body: "You may use ThermoSync solely for its intended purpose of indoor climate regulation in residential or office environments. You may not reverse-engineer, resell, sublicense, or modify the firmware or control algorithms without written permission from the ThermoSync development team.",
            },
            {
              title: "4. Data Collection and Sensor Readings",
              body: "The system collects real-time temperature, humidity, and HVAC state data from installed sensor nodes. This data is processed locally on the edge controller and may be transmitted to the ThermoSync dashboard over an encrypted MQTT connection. No personally identifiable information is collected from sensor readings.",
            },
            {
              title: "5. Limitation of Liability",
              body: "ThermoSync is a student-developed prototype. The development team makes no warranties, express or implied, regarding system uptime, sensor accuracy, or HVAC compatibility. The team is not liable for any property damage, discomfort, or equipment malfunction arising from system use.",
            },
            {
              title: "6. Intellectual Property",
              body: "All source code, circuit schematics, firmware, and dashboard designs are the intellectual property of the ThermoSync team. Unauthorized reproduction or distribution is prohibited.",
            },
            {
              title: "7. Modifications to Terms",
              body: "These terms may be updated as the system evolves. Continued use of ThermoSync after a revision constitutes acceptance of the updated terms. Users will be notified of material changes via the registered contact email.",
            },
            {
              title: "8. Contact",
              body: "For questions about these terms, contact the ThermoSync team at thermosync@project.dev",
            },
          ].map((s) => (
            <div key={s.title} className="border-t border-[#e8ddd0] pt-8">
              <h2 className="text-lg font-[var(--font-display)] font-semibold mb-3">{s.title}</h2>
              <p className="text-[#7a6a58] leading-relaxed text-base">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrivacyPage({ onBack }: { onBack: () => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <button onClick={onBack} className="text-sm text-[#7a6a58] hover:text-[#2c2319] transition-colors mb-10 cursor-pointer flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to ThermoSync
        </button>
        <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-3">Legal</p>
        <h1 className="text-4xl font-[var(--font-display)] font-semibold text-[#2c2319] mb-3">Privacy Policy</h1>
        <p className="text-sm text-[#7a6a58] font-[var(--font-mono)] mb-12">Last updated: 14 September 2026</p>

        <div className="flex flex-col gap-10 text-[#2c2319]">
          {[
            {
              title: "1. What We Collect",
              body: "ThermoSync collects the following data through installed sensor nodes: outdoor ambient temperature (degrees Celsius), indoor temperature per zone, relative humidity (%), HVAC actuator state, and timestamped control decisions. No audio, video, biometric, or location data is collected at any time.",
            },
            {
              title: "2. How We Use It",
              body: "Sensor data is used exclusively to compute HVAC setpoints via the on-device PID controller. Aggregated anonymised readings may be used to improve algorithm performance across deployments. No data is sold, shared with advertisers, or used for any purpose unrelated to thermal regulation.",
            },
            {
              title: "3. Data Storage",
              body: "All sensor readings are processed locally on the edge microcontroller. If the optional cloud dashboard is enabled, readings are transmitted over TLS-encrypted MQTT to a self-hosted server. Data is retained for a maximum of 90 days unless you request earlier deletion.",
            },
            {
              title: "4. Data Sharing",
              body: "We do not share personal data with third parties. Anonymised aggregate temperature trends may be shared in academic research papers or project reports without identifying individual installations.",
            },
            {
              title: "5. Your Rights",
              body: "You may request a full export of all sensor data associated with your installation, or request permanent deletion of your records, by contacting thermosync@project.dev. We will fulfill requests within 14 calendar days.",
            },
            {
              title: "6. Security",
              body: "Sensor-to-controller communication uses the I2C protocol within a closed hardware enclosure. Dashboard data is encrypted in transit using TLS 1.3. Access to the dashboard requires authentication credentials that are stored using bcrypt hashing.",
            },
            {
              title: "7. Children",
              body: "ThermoSync is not directed at children under 13. We do not knowingly collect data from minors.",
            },
            {
              title: "8. Changes to This Policy",
              body: "We will notify registered users by email before making material changes to this policy. Continued use of the system after notification constitutes acceptance.",
            },
            {
              title: "9. Contact",
              body: "Privacy inquiries can be directed to thermosync@project.dev. Response time is typically 3 to 5 business days.",
            },
          ].map((s) => (
            <div key={s.title} className="border-t border-[#e8ddd0] pt-8">
              <h2 className="text-lg font-[var(--font-display)] font-semibold mb-3">{s.title}</h2>
              <p className="text-[#7a6a58] leading-relaxed text-base">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomePage({ scrollTo, setPage }: { scrollTo: (id: string) => void; setPage: (p: Page) => void }) {
  const FEATURES = [
    {
      title: "Adaptive PID Control",
      desc: "The proportional-integral-derivative controller self-tunes based on your building's thermal mass. Responses grow more accurate with every cycle, no manual calibration needed.",
      tag: "Control System",
      img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&h=600&fit=crop&auto=format",
    },
    {
      title: "Multi-Zone Awareness",
      desc: "Each room carries independent sensor nodes. Zone-level setpoints are managed separately so one sunny corner never overcools the rest of the floor.",
      tag: "Multi-Zone",
      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=600&fit=crop&auto=format",
    },
    {
      title: "Predictive Pre-Conditioning",
      desc: "Weather API forecasts feed a 15-minute lookahead window. ThermoSync begins adjusting before a temperature spike arrives, not after your comfort drops.",
      tag: "Predictive",
      img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&h=600&fit=crop&auto=format",
    },
    {
      title: "Energy Logging",
      desc: "HVAC run-time and state changes are logged per session. You can review when the system activated, for how long, and under what outdoor conditions.",
      tag: "Logging",
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=600&fit=crop&auto=format",
    },
  ];

  const STEPS = [
    {
      num: "01",
      title: "Sense",
      desc: "Twelve low-power thermal sensors are installed around the building perimeter. Each node reads outdoor ambient temperature every 800 ms and transmits readings over I2C to the edge controller.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
      ),
      color: "#d97706",
    },
    {
      num: "02",
      title: "Analyze",
      desc: "The edge microcontroller aggregates sensor readings and runs a PID control loop. It calculates the required indoor setpoint from the current differential, the rate of change, and a preset comfort threshold.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      color: "#c2522b",
    },
    {
      num: "03",
      title: "Respond",
      desc: "The new setpoint publishes to HVAC actuators over MQTT. The system activates cooling, heating, or ventilation within the current polling cycle. Occupants notice the result, not the process.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: "#e8775a",
    },
  ];

  return (
    <>
      {/* Cinematic Hero — first page only */}
      <CinematicHero onScrollDown={() => document.getElementById("How It Works")?.scrollIntoView({ behavior: "smooth" })} />

      {/* What it does strip */}
      <section id="Overview" className="px-6 max-w-6xl mx-auto">
        <div className="border-t border-b border-[#e8ddd0] py-8 grid md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-2">What it detects</p>
            <p className="text-[#2c2319] leading-relaxed">Outdoor ambient temperature from 12 sensor nodes sampled every 800 ms over I2C.</p>
          </div>
          <div>
            <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-2">How it decides</p>
            <p className="text-[#2c2319] leading-relaxed">A PID control loop on an ESP32 edge controller computes the optimal indoor setpoint continuously.</p>
          </div>
          <div>
            <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-2">What it controls</p>
            <p className="text-[#2c2319] leading-relaxed">HVAC actuators receive updated setpoints over MQTT within the current polling cycle.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="How It Works" className="py-24 px-6 bg-[#2c2319] text-[#faf6f0]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-[var(--font-mono)] text-[#d97706] tracking-widest uppercase mb-3">Process</p>
          <h2 className="text-4xl md:text-5xl font-[var(--font-display)] font-semibold mb-20 leading-tight">
            Sense, analyze,<br />
            <em className="italic font-light text-[#e8775a]">then act</em>
          </h2>

          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-[#d97706]/50 via-[#e8775a]/30 to-transparent hidden md:block" />
            <div className="flex flex-col gap-0">
              {STEPS.map((step, i) => (
                <div key={step.num} className="relative flex gap-10 md:gap-16">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-10 h-10 flex items-center justify-center z-10 flex-shrink-0"
                      style={{ background: step.color }}
                    >
                      <span className="text-white">{step.icon}</span>
                    </div>
                  </div>
                  <div className={`${i < STEPS.length - 1 ? "pb-16" : "pb-0"} flex-1`}>
                    <span className="text-xs font-[var(--font-mono)] text-white/30 tracking-widest uppercase">{step.num}</span>
                    <h3 className="text-3xl md:text-4xl font-[var(--font-display)] font-semibold mt-1 mb-4">{step.title}</h3>
                    <p className="text-white/50 text-base leading-relaxed max-w-xl">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="Features" className="py-24">
        <div className="max-w-5xl mx-auto px-6 mb-16">
          <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-3">Features</p>
          <h2 className="text-4xl md:text-5xl font-[var(--font-display)] font-semibold leading-tight">
            What the system<br />
            <em className="italic font-light">actually does</em>
          </h2>
        </div>

        {FEATURES.map((f, i) => (
          <div key={f.title} className="border-t border-[#e8ddd0] group">
            <div className={`max-w-5xl mx-auto px-6 py-12 flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-10 md:gap-16 items-center`}>
              <div className="w-full md:w-1/2 overflow-hidden bg-[#f2ead8] flex-shrink-0" style={{ aspectRatio: "4/3" }}>
                <img
                  src={f.img}
                  alt={f.title}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase">{f.tag}</span>
                <h3 className="text-2xl md:text-3xl font-[var(--font-display)] font-semibold mt-3 mb-4 text-[#2c2319] leading-snug">{f.title}</h3>
                <p className="text-[#7a6a58] leading-relaxed text-base">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="border-t border-[#e8ddd0]" />
      </section>

      {/* Demo */}
      <DemoSection />

      {/* Team */}
      <section id="Team" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-[var(--font-mono)] text-[#c2522b] tracking-widest uppercase mb-3">Team</p>
          <h2 className="text-4xl md:text-5xl font-[var(--font-display)] font-semibold mb-16 leading-tight">
            Built by three<br />
            <em className="italic font-light">engineers</em>
          </h2>

          <div className="flex flex-col">
            {[
              { name: "Chinmay Gupta", role: "UI and Visualization", color: "#e8775a" },
              { name: "Aryan Sharma", role: "Physics and Environment", color: "#d97706" },
              { name: "Harnoor Kant", role: "AI and Control Systems", color: "#c2522b" },
            ].map((m, i, arr) => (
              <div
                key={m.name}
                className="flex items-center justify-between py-5 group hover:pl-3 transition-all duration-150 cursor-default"
                style={{
                  borderTopWidth: "1px",
                  borderTopStyle: "solid",
                  borderTopColor: "#e8ddd0",
                  borderBottomWidth: i === arr.length - 1 ? "1px" : "0",
                  borderBottomStyle: "solid",
                  borderBottomColor: "#e8ddd0",
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="w-2 h-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: m.color }} />
                  <span className="text-2xl md:text-3xl font-[var(--font-display)] font-semibold text-[#2c2319] group-hover:text-[#c2522b] transition-colors">
                    {m.name}
                  </span>
                </div>
                <span className="text-sm font-[var(--font-mono)] text-[#7a6a58] tracking-wide hidden sm:block">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState<Page>("home");

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    if (page !== "home") {
      setPage("home");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const goPage = (p: Page) => {
    setPage(p);
    setMenuOpen(false);
  };

  if (page === "terms") return <TermsPage onBack={() => setPage("home")} />;
  if (page === "privacy") return <PrivacyPage onBack={() => setPage("home")} />;

  return (
    <div className="min-h-screen bg-[#faf6f0] text-[#2c2319]" style={{ cursor: "none" }}>
      <CursorAir />
      {/* CursorAir is now just a dot — no trail */}

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf6f0]/90 backdrop-blur-md border-b border-[#e8ddd0]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => setPage("home")} className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#c2522b" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
              </svg>
            </div>
            <span className="font-[var(--font-display)] font-semibold text-lg tracking-tight">ThermoSync</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button key={link} onClick={() => scrollTo(link)} className="text-sm text-[#7a6a58] hover:text-[#2c2319] transition-colors cursor-pointer">
                {link}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollTo("Demo")}
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: "#c2522b" }}
          >
            Try Demo
          </button>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className={`w-5 h-0.5 bg-[#2c2319] transition-all mb-1 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <div className={`w-5 h-0.5 bg-[#2c2319] transition-all mb-1 ${menuOpen ? "opacity-0" : ""}`} />
            <div className={`w-5 h-0.5 bg-[#2c2319] transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[#e8ddd0] bg-[#faf6f0] px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <button key={link} onClick={() => scrollTo(link)} className="text-left text-[#7a6a58] text-sm cursor-pointer">{link}</button>
            ))}
          </div>
        )}
      </nav>

      <HomePage scrollTo={scrollTo} setPage={setPage} />

      {/* Footer */}
      <footer className="py-16 px-6 bg-[#2c2319]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
            <div>
              <button onClick={() => setPage("home")} className="flex items-center gap-2 mb-4 cursor-pointer">
                <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#c2522b" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                  </svg>
                </div>
                <span className="font-[var(--font-display)] font-semibold text-lg text-white tracking-tight">ThermoSync</span>
              </button>
              <p className="text-white/40 text-sm max-w-xs leading-relaxed">
                Outdoor thermal sensing with automatic indoor HVAC control.
              </p>
              <p className="text-white/30 text-xs font-[var(--font-mono)] mt-2 tracking-wide">thermosync.project.dev</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => scrollTo("Demo")}
                className="px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: "#c2522b" }}
              >
                Try the Demo
              </button>
              <button
                onClick={() => scrollTo("Overview")}
                className="px-6 py-3 text-sm font-medium text-white/60 border border-white/20 hover:border-white/40 transition-colors cursor-pointer"
              >
                Back to top
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-white/30 text-xs font-[var(--font-mono)]">
              2026 ThermoSync. Student prototype.
            </p>
            <div className="flex items-center gap-6">
              <button onClick={() => goPage("privacy")} className="text-white/40 text-xs hover:text-white/70 transition-colors cursor-pointer font-[var(--font-mono)]">
                Privacy Policy
              </button>
              <button onClick={() => goPage("terms")} className="text-white/40 text-xs hover:text-white/70 transition-colors cursor-pointer font-[var(--font-mono)]">
                Terms and Conditions
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
