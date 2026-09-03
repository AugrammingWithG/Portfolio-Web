import React, { useEffect, useRef, useState } from "react";

// You can also move this array into projects.json and import it:
//   import data from "./projects.json";  then use data.projects
const projects = [
  {
    id: "gourmet-getaway-tours",
    name: "Gourmet Getaway Tours",
    tagline: "Chef-led Hunter Valley food and wine tours, for an Australian client.",
    status: "live",
    liveUrl: "https://www.gourmetgetawaytours.com.au/",
    role: "Full-Stack Developer & SEO",
    problem: "The client needed a booking flow that actually converts and a site people could find on search.",
    whatIBuilt: "I built the site end to end — the customer-facing pages and the booking logic behind them — and moved reservations onto a more reliable booking platform. I also handled on-page SEO.",
    result: "More completed bookings, more new customers, and higher search visibility.",
    stack: ["TypeScript"],
    leadImage: "images/ggt-home.png",
  },
  {
    id: "oxilia",
    name: "Oxilia",
    tagline: "An all-in-one workspace where a team chats, plans, and runs projects in one place.",
    status: "in-use",
    liveUrl: null,
    role: "Full-Stack Developer",
    problem: "The team was spread across separate tools for messaging, scheduling, and tracking work.",
    whatIBuilt: "I built full-stack features for a single app: team chat with channels and direct messages, a shared calendar, project boards, a CRM, video calls, and a visual view of the whole development cycle from request to handoff.",
    result: "Shipped to production and now the team's daily tool, with a mobile version being prepped for the Play Store.",
    stack: ["React", "Node.js"],
    leadImage: "images/oxilia-workspace.png",
  },
  {
    id: "mealplanner",
    name: "MealPlanner",
    tagline: "A meal-planning and nutrition app, built end to end for a client.",
    status: "in-use",
    liveUrl: null,
    role: "Full-Stack Mobile Developer",
    problem: "The client wanted to plan meals and track nutrition while keeping their data private.",
    whatIBuilt: "I built the full app and its data layer: a dashboard with calories and macros, a meal planner, recipes, a grocery list, and water, exercise, and weight trackers. The data stays on the phone — only login goes online.",
    result: "Live and in active daily use.",
    stack: ["React Native"],
    leadImage: "images/mealplanner-dashboard.png",
  },
  {
    id: "tingi-station",
    name: "Tingi Station",
    tagline: "A neighborhood refill store where you buy staples by the gram, not by the pack.",
    status: "live",
    liveUrl: "https://tingistation.com/",
    role: "Shopify Developer",
    problem: "The store needed an online presence that matched its buy-only-what-you-need idea and made shopping easy.",
    whatIBuilt: "I overhauled the storefront's design and smoothed the whole flow from browsing collections to checkout, including a touch where you tap a jar to fill it.",
    result: "Live and serving a high volume of shoppers.",
    stack: ["Shopify"],
    leadImage: "images/tingi-hero.png",
  },
  {
    id: "aicore",
    name: "AiCore",
    tagline: "An offline desktop tool for forensic teams that rebuilds a scene in 3D from scans.",
    status: "beta",
    liveUrl: null,
    role: "Frontend Developer",
    problem: "Raw 3D scan data is messy and hard to read — and this has to hold up in a courtroom.",
    whatIBuilt: "I built the frontend and the interactive 3D viewer that turns raw scan data into a clean, navigable model you can move around and measure.",
    result: "A production build now in beta testing with forensic teams.",
    stack: ["React", "3D web tools"],
    leadImage: null, // recording pending
  },
];

const STATUS = {
  live: { label: "Live", tone: "gold" },
  "in-use": { label: "In daily use", tone: "cool" },
  beta: { label: "Beta", tone: "muted" },
};

function LeadImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="pf-thumb pf-thumb--empty" aria-hidden="true">
        <span>{name}</span>
        <small>preview coming soon</small>
      </div>
    );
  }
  return (
    <div className="pf-thumb">
      <img src={src} alt={`${name} screenshot`} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

function ProjectCard({ p }) {
  const status = STATUS[p.status];
  return (
    <article className="pf-card">
      <div className="pf-glow" aria-hidden="true" />
      <LeadImage src={p.leadImage} name={p.name} />
      <div className="pf-body">
        <div className="pf-head">
          <h3 className="pf-name">{p.name}</h3>
          <span className={`pf-pill pf-pill--${status.tone}`}>
            <i className="pf-dot" />
            {status.label}
          </span>
        </div>

        <p className="pf-role">{p.role}</p>
        <p className="pf-tagline">{p.tagline}</p>

        <dl className="pf-detail">
          <div>
            <dt>The problem</dt>
            <dd>{p.problem}</dd>
          </div>
          <div>
            <dt>What I built</dt>
            <dd>{p.whatIBuilt}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{p.result}</dd>
          </div>
        </dl>

        <div className="pf-foot">
          <ul className="pf-stack">
            {p.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {p.liveUrl && (
            <a className="pf-cta" href={p.liveUrl} target="_blank" rel="noreferrer">
              Visit live site
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={`pf ${shown ? "is-shown" : ""}`} ref={ref} id="projects">
      <div className="pf-ambient" aria-hidden="true">
        <span className="pf-blob pf-blob--gold" />
        <span className="pf-blob pf-blob--blue" />
        <span className="pf-blob pf-blob--teal" />
      </div>

      <header className="pf-intro">
        <h2>Selected work</h2>
        <p>Real products I've shipped — client sites, team tools, and apps in daily use.</p>
      </header>

      <div className="pf-grid">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>

      <style>{css}</style>
    </section>
  );
}

const css = `
.pf {
  --bg: #0c0e13;
  --ink: #ece7dc;
  --ink-soft: #a6a294;
  --gold: #d0a44c;
  --gold-soft: #e3c789;
  --glass: rgba(255, 255, 255, 0.045);
  --glass-line: rgba(255, 255, 255, 0.09);
  position: relative;
  overflow: hidden;
  padding: clamp(3.5rem, 8vw, 7rem) clamp(1.1rem, 5vw, 4rem);
  background: var(--bg);
  color: var(--ink);
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}

/* ambient drifting light behind the frosted glass */
.pf-ambient { position: absolute; inset: 0; z-index: 0; }
.pf-blob {
  position: absolute;
  width: 46vw; height: 46vw;
  max-width: 620px; max-height: 620px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
  will-change: transform;
}
.pf-blob--gold { top: -8%; left: 4%; background: radial-gradient(circle at 50% 50%, rgba(208,164,76,0.55), transparent 66%); animation: drift1 26s ease-in-out infinite; }
.pf-blob--blue { top: 22%; right: -6%; background: radial-gradient(circle at 50% 50%, rgba(59,110,165,0.42), transparent 66%); animation: drift2 32s ease-in-out infinite; }
.pf-blob--teal { bottom: -12%; left: 34%; background: radial-gradient(circle at 50% 50%, rgba(47,143,131,0.34), transparent 66%); animation: drift3 30s ease-in-out infinite; }

@keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(6%, 5%); } }
@keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-5%, 7%); } }
@keyframes drift3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(4%, -6%); } }

.pf-intro { position: relative; z-index: 1; max-width: 40rem; margin: 0 0 clamp(2rem, 4vw, 3.25rem); }
.pf-intro h2 { margin: 0 0 0.5rem; font-size: clamp(1.9rem, 4vw, 2.9rem); font-weight: 600; letter-spacing: -0.02em; }
.pf-intro p { margin: 0; color: var(--ink-soft); font-size: 1.05rem; line-height: 1.6; }

.pf-grid {
  position: relative; z-index: 1;
  display: grid; gap: clamp(1.1rem, 2.4vw, 1.9rem);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
}

.pf-card {
  position: relative;
  display: flex; flex-direction: column;
  border: 1px solid var(--glass-line);
  border-radius: 20px;
  background: var(--glass);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  overflow: hidden;
  opacity: 0; transform: translateY(18px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.pf.is-shown .pf-card { opacity: 1; transform: none; }
.pf.is-shown .pf-card:nth-child(2) { transition-delay: 0.06s; }
.pf.is-shown .pf-card:nth-child(3) { transition-delay: 0.12s; }
.pf.is-shown .pf-card:nth-child(4) { transition-delay: 0.18s; }
.pf.is-shown .pf-card:nth-child(5) { transition-delay: 0.24s; }

/* gold hover glow lives on its own cheap layer (no backdrop-filter re-trigger) */
.pf-glow {
  position: absolute; inset: -1px; z-index: 2; pointer-events: none;
  border-radius: 20px;
  box-shadow: 0 0 0 1px rgba(208,164,76,0.55), 0 18px 50px -18px rgba(208,164,76,0.5);
  opacity: 0; transition: opacity 0.28s ease;
}
.pf-card:hover .pf-glow, .pf-card:focus-within .pf-glow { opacity: 1; }

.pf-thumb { position: relative; aspect-ratio: 16 / 10; background: #10131a; border-bottom: 1px solid var(--glass-line); }
.pf-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.pf-thumb--empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.35rem;
  background: linear-gradient(135deg, rgba(208,164,76,0.16), rgba(47,143,131,0.12));
  color: var(--gold-soft); text-align: center; padding: 1rem;
}
.pf-thumb--empty span { font-size: 1.05rem; font-weight: 600; letter-spacing: -0.01em; }
.pf-thumb--empty small { color: var(--ink-soft); font-size: 0.8rem; }

.pf-body { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.85rem; padding: 1.3rem 1.35rem 1.4rem; flex: 1; }
.pf-head { display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; }
.pf-name { margin: 0; font-size: 1.28rem; font-weight: 600; letter-spacing: -0.015em; }

.pf-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.28rem 0.6rem; border-radius: 999px; font-size: 0.74rem; font-weight: 600; white-space: nowrap; border: 1px solid var(--glass-line); }
.pf-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pf-pill--gold { color: var(--gold-soft); background: rgba(208,164,76,0.12); }
.pf-pill--cool { color: #8fc7bd; background: rgba(47,143,131,0.14); }
.pf-pill--muted { color: var(--ink-soft); background: rgba(255,255,255,0.05); }

.pf-role { margin: 0; font-size: 0.82rem; font-weight: 600; color: var(--gold); }
.pf-tagline { margin: 0; color: var(--ink); font-size: 0.97rem; line-height: 1.5; }

.pf-detail { margin: 0.15rem 0 0; display: flex; flex-direction: column; gap: 0.7rem; }
.pf-detail dt { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.01em; color: var(--ink-soft); margin-bottom: 0.15rem; }
.pf-detail dd { margin: 0; font-size: 0.9rem; line-height: 1.55; color: #cfcabc; }

.pf-foot { margin-top: auto; padding-top: 0.4rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: space-between; }
.pf-stack { list-style: none; display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0; padding: 0; }
.pf-stack li { font-size: 0.76rem; color: var(--ink-soft); padding: 0.25rem 0.55rem; border: 1px solid var(--glass-line); border-radius: 8px; background: rgba(255,255,255,0.03); }

.pf-cta {
  display: inline-flex; align-items: center; padding: 0.5rem 0.95rem; border-radius: 10px;
  font-size: 0.85rem; font-weight: 600; text-decoration: none;
  color: #1a1204; background: linear-gradient(180deg, var(--gold-soft), var(--gold));
  transition: filter 0.2s ease, transform 0.2s ease;
}
.pf-cta:hover { filter: brightness(1.06); transform: translateY(-1px); }
.pf-cta:focus-visible, .pf-card a:focus-visible { outline: 2px solid var(--gold-soft); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .pf-card { opacity: 1; transform: none; transition: none; }
  .pf-blob { animation: none; }
  .pf-cta:hover { transform: none; }
}
`;
