// Each keycap is a real skill. `learning: true` earns the small honesty dot.
// Confirmed by Augniña: Express, Django, FastAPI, Python, PostgreSQL,
// Supabase, Firebase and GitHub Actions are the "still learning" set.

export const SKILL_ROWS = [
  [
    { id: "react", label: "React", desc: "The library I build most interfaces with. Components, state, and keeping the screen in step with the data." },
    { id: "nextjs", label: "Next.js", desc: "React with routing, server rendering and builds handled for you. Good when a site has to be fast and findable." },
    { id: "react-native", label: "React Native", desc: "One codebase that becomes a real Android and iOS app. MealPlanner is built with it." },
    { id: "typescript", label: "TypeScript", desc: "JavaScript with types. It catches a whole class of mistakes before the code ever runs." },
    { id: "javascript", label: "JavaScript", desc: "The language the web runs on. Everything else here sits on top of it." },
    { id: "html", label: "HTML", desc: "The structure of a page. Written properly, it is also most of your accessibility." },
    { id: "css", label: "CSS", desc: "Layout, type, colour and motion. Every pixel on this page is hand-written CSS." },
  ],
  [
    { id: "node", label: "Node.js", desc: "JavaScript on the server. It powers the APIs and background work behind the apps I build." },
    { id: "express", label: "Express", desc: "A small, unopinionated way to build an API in Node. I can ship with it; I am still learning the deeper patterns.", learning: true },
    { id: "nestjs", label: "NestJS", desc: "A structured, TypeScript-first framework for larger Node backends." },
    { id: "django", label: "Django", desc: "Python's batteries-included web framework: admin, auth and a database layer out of the box.", learning: true },
    { id: "fastapi", label: "FastAPI", desc: "A quick way to build typed Python APIs, with documentation generated for free.", learning: true },
    { id: "php", label: "PHP", desc: "A long-running server language. Still everywhere, especially in commerce and CMS work." },
    { id: "python", label: "Python", desc: "Readable, general-purpose language. I reach for it for scripts, data work and small APIs.", learning: true },
  ],
  [
    { id: "postgres", label: "PostgreSQL", desc: "A serious relational database, strong on correctness and complicated queries.", learning: true },
    { id: "mysql", label: "MySQL", desc: "A widely used relational database, still the default on a lot of shared hosting." },
    { id: "mongodb", label: "MongoDB", desc: "A document database. Useful when the shape of the data keeps moving." },
    { id: "prisma", label: "Prisma", desc: "A typed way to talk to a database from TypeScript, with migrations handled for you." },
    { id: "supabase", label: "Supabase", desc: "Postgres with auth, storage and instant APIs on top. Fast way to stand a backend up.", learning: true },
    { id: "firebase", label: "Firebase", desc: "Google's hosted backend: auth, realtime data and push, without running servers.", learning: true },
  ],
  [
    { id: "shopify", label: "Shopify", desc: "Storefront themes and Liquid templates. Tingi Station runs on it." },
    { id: "vercel", label: "Vercel", desc: "Where I deploy front-ends. Push to Git and it builds and ships." },
    { id: "gcloud", label: "Google Cloud", desc: "Hosting, storage and managed services for the things that outgrow one box." },
    { id: "gh-actions", label: "GitHub Actions", desc: "Automation that runs on every push: tests, builds and deploys.", learning: true },
    { id: "git", label: "Git", desc: "Version control. Branches, history, and a way back when something breaks." },
    { id: "seo", label: "SEO", desc: "Structure, speed and content so search engines can actually read a site. Part of the Gourmet Getaway Tours work." },
  ],
];

export const SKILLS = SKILL_ROWS.flat();
