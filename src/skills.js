/* ==========================================================================
   SKILLS — four groups, and what belongs in each.

   This replaced a single flat board of keycaps on 2026-09-15. The board said
   nothing about how the work fits together: React and SEO sat next to each
   other as equals, which is true of neither. They are grouped by WHAT THEY DO
   now. Each group briefly carried a "kind" line as well — three reading
   "tech" and one "practice · discipline", from Augniña's own framing — and it
   went on 2026-09-15: three cards saying the same word said nothing, and the
   fourth's was the longest string on the card. The grouping itself is what
   carries her point. Delivery's blurb is where the distinction lives now.

   WHY FOUR AND NOT SIX. Practice (Git, GitHub Actions) and discipline (SEO)
   are real categories and were briefly their own groups, which left one panel
   holding a single item. They sit under Delivery instead: shipping something
   and being findable are the same end of the job, and Delivery's blurb says
   so in words rather than leaning on a label.

   EDIT THE COPY HERE. Nothing else restates it — the component lays these out
   and prints the counts, it does not know any of the words.

   `learning: true` earns the honesty dot. Confirmed by Augniña: Express,
   Django, FastAPI, Python, PostgreSQL, Supabase, Firebase and GitHub Actions
   are the "still learning" set. That list is hers; do not add to it or take
   from it without asking. It is the best thing this section says.
   ========================================================================== */

import data from "./projects.json";

export const SKILL_GROUPS = [
  {
    id: "frontend",
    name: "Frontend",
    blurb:
      "The part people actually touch. Interfaces that stay in step with the data behind them, on the web and on a phone.",
    skills: [
      { id: "react", label: "React", desc: "The library I build most interfaces with. Components, state, and keeping the screen in step with the data." },
      { id: "nextjs", label: "Next.js", desc: "React with routing, server rendering and builds handled for you. Good when a site has to be fast and findable." },
      { id: "react-native", label: "React Native", desc: "One codebase that becomes a real Android and iOS app. MealPlanner is built with it." },
      { id: "typescript", label: "TypeScript", desc: "JavaScript with types. It catches a whole class of mistakes before the code ever runs." },
      { id: "javascript", label: "JavaScript", desc: "The language the web runs on. Everything else here sits on top of it." },
      { id: "html", label: "HTML", desc: "The structure of a page. Written properly, it is also most of your accessibility." },
      { id: "css", label: "CSS", desc: "Layout, type, colour and motion. Every pixel on this page is hand-written CSS." },
    ],
  },
  {
    id: "backend",
    name: "Backend",
    blurb:
      "The part that does the work. APIs, accounts and the logic a screen is only ever asking questions of.",
    skills: [
      { id: "node", label: "Node.js", desc: "JavaScript on the server. It powers the APIs and background work behind the apps I build." },
      { id: "express", label: "Express", desc: "A small, unopinionated way to build an API in Node. I can ship with it; I am still learning the deeper patterns.", learning: true },
      { id: "nestjs", label: "NestJS", desc: "A structured, TypeScript-first framework for larger Node backends." },
      { id: "django", label: "Django", desc: "Python's batteries-included web framework: admin, auth and a database layer out of the box.", learning: true },
      { id: "fastapi", label: "FastAPI", desc: "A quick way to build typed Python APIs, with documentation generated for free.", learning: true },
      { id: "php", label: "PHP", desc: "A long-running server language. Still everywhere, especially in commerce and CMS work." },
      { id: "python", label: "Python", desc: "Readable, general-purpose language. I reach for it for scripts, data work and small APIs.", learning: true },
    ],
  },
  {
    id: "data",
    name: "Data",
    blurb:
      "Where it all lives. Schemas that hold up, queries that stay quick, and hosted backends when a project needs to move.",
    skills: [
      { id: "postgres", label: "PostgreSQL", desc: "A serious relational database, strong on correctness and complicated queries.", learning: true },
      { id: "mysql", label: "MySQL", desc: "A widely used relational database, still the default on a lot of shared hosting." },
      { id: "mongodb", label: "MongoDB", desc: "A document database. Useful when the shape of the data keeps moving." },
      { id: "prisma", label: "Prisma", desc: "A typed way to talk to a database from TypeScript, with migrations handled for you." },
      { id: "supabase", label: "Supabase", desc: "Postgres with auth, storage and instant APIs on top. Fast way to stand a backend up.", learning: true },
      { id: "firebase", label: "Firebase", desc: "Google's hosted backend: auth, realtime data and push, without running servers.", learning: true },
    ],
  },
  {
    id: "delivery",
    name: "Delivery",
    blurb:
      "Getting it live, and getting it found. Builds that run themselves, hosting that scales, and pages a search engine can actually read.",
    skills: [
      { id: "shopify", label: "Shopify", desc: "Storefront themes and Liquid templates. Tingi Station runs on it." },
      { id: "vercel", label: "Vercel", desc: "Where I deploy front-ends. Push to Git and it builds and ships." },
      { id: "gcloud", label: "Google Cloud", desc: "Hosting, storage and managed services for the things that outgrow one box." },
      { id: "git", label: "Git", desc: "Version control. Branches, history, and a way back when something breaks." },
      { id: "gh-actions", label: "GitHub Actions", desc: "Automation that runs on every push: tests, builds and deploys.", learning: true },
      { id: "seo", label: "SEO", desc: "Structure, speed and content so search engines can actually read a site. Part of the Gourmet Getaway Tours work." },
    ],
  },
];

/* Flat, for the counts in the HUD and for stepping through the detail panel.
   One list, derived — there is no second copy of the skills anywhere. */
export const SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);
export const LEARNING_COUNT = SKILLS.filter((s) => s.learning).length;

/* Which group a skill belongs to, by skill id. The detail panel needs to name
   it and the card does not, so it is derived here rather than copied onto
   every skill. */
export const GROUP_OF = Object.fromEntries(
  SKILL_GROUPS.flatMap((g) => g.skills.map((s) => [s.id, g.name]))
);

/* ---- where a skill has actually been used -------------------------------- *
   Read out of projects.json, not written here: a project's `stack` is already
   the record of what it was built with, so this stays true on its own when a
   project is added or its stack corrected. Five skills match today — React,
   React Native, TypeScript, Node.js, Shopify — and the rest come back empty,
   which the panel handles by saying nothing rather than saying "none".

   Matching is loose on purpose (case and punctuation stripped) so "Node.js"
   in a stack finds "Node.js" here. Stack entries that are not skills on this
   board — "3D web tools", "WebAR" — simply match nothing, which is correct:
   they are descriptions of a project, not names of a skill.

   THIS IS THE ONLY LINE BETWEEN THE TWO SECTIONS. Selected Work says what she
   built; this says what she knows. The detail panel is where a reader gets to
   see that the two agree. */
const norm = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALL_PROJECTS = [...data.projects, ...data.onHold];
export const USED_IN = Object.fromEntries(
  SKILLS.map((s) => [
    s.id,
    ALL_PROJECTS.filter((p) => (p.stack || []).some((t) => norm(t) === norm(s.label))).map(
      (p) => p.name
    ),
  ])
);
