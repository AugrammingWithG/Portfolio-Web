/* ==========================================================================
   SELECTED WORK — project data

   To fill in your own material, edit these three fields per project:
     liveUrl : "https://..."             or null for case-study-only
     logo    : "images/logo-x.svg"       or null to keep the dashed slot
     shots   : ["images/a.png", ...]     or [] to keep the dashed slots

   Any text field set to "TODO" renders dimmed, so gaps stay visible.

   Planet placement:
     x, y  — position in the scene, as a CSS percentage
     size  — diameter in px (scaled down automatically on small screens)
     lit   — base lightness %, 38-50 keeps it in the grey family
     ring  — true for a faint ring
   ========================================================================== */

export const WORK = [
  {
    id: "aicore",
    name: "AiCore",
    summary: "Forensic tool that rebuilds crime scenes in 3D from photos.",
    role: "Frontend Developer",
    built:
      "I built the frontend and the interactive 3D model viewer that turns raw scan data into a clean, navigable model you can move around and measure.",
    result: "A production build now in beta testing with forensic teams. Offline desktop app.",
    stack: ["React", "3D web tools"],
    liveUrl: null, // no live link: offline desktop app
    logo: null, // <-- PASTE LOGO PATH HERE
    shots: [], // <-- PASTE SCREENSHOT PATHS HERE
    x: "62%",
    y: "20%",
    size: 150,
    lit: 46,
    ring: true,
  },
  {
    id: "oxilia",
    name: "Oxilia",
    summary: "All-in-one SaaS workspace where a team chats, plans, and runs projects in one place.",
    role: "Full-Stack Developer",
    built:
      "I built full-stack features for a single app: team chat with channels and direct messages, a shared calendar, project boards, a CRM, video calls, and a visual view of the development cycle from request to handoff.",
    result:
      "Shipped to production and now the team's daily tool, with a mobile version being prepped for the Play Store.",
    stack: ["React", "Node.js"],
    liveUrl: null, // <-- PASTE LIVE LINK HERE
    logo: null, // <-- PASTE LOGO PATH HERE
    shots: [], // <-- PASTE SCREENSHOT PATHS HERE
    x: "30%",
    y: "31%",
    size: 122,
    lit: 42,
    ring: false,
  },
  {
    id: "tingi-station",
    name: "Tingi Station",
    summary: "Full site redesign plus new features for a neighbourhood refill store.",
    role: "Shopify Developer",
    built:
      "I overhauled the storefront's design and smoothed the whole flow from browsing collections to checkout, including a playful touch where you tap a jar to fill it.",
    result: "Live and serving a high volume of shoppers.",
    stack: ["Shopify", "Liquid"],
    liveUrl: null, // <-- PASTE LIVE LINK HERE
    logo: null, // <-- PASTE LOGO PATH HERE
    shots: [], // <-- PASTE SCREENSHOT PATHS HERE
    x: "81%",
    y: "49%",
    size: 106,
    lit: 40,
    ring: false,
  },
  {
    id: "gourmet-getaway-tours",
    name: "Gourmet Getaway Tours",
    summary: "Chef-led Hunter Valley food and wine tours, for an Australian client.",
    role: "Full-Stack Developer & SEO",
    built:
      "I built the site end to end — the customer-facing pages and the booking logic behind them — and moved reservations onto a more reliable booking platform. I also handled on-page SEO.",
    result: "More completed bookings, more new customers, and higher search visibility.",
    stack: ["TypeScript", "SEO"],
    liveUrl: null, // <-- PASTE LIVE LINK HERE
    logo: null, // <-- PASTE LOGO PATH HERE
    shots: [], // <-- PASTE SCREENSHOT PATHS HERE
    x: "47%",
    y: "63%",
    size: 134,
    lit: 48,
    ring: true,
  },
  {
    id: "socialhat",
    name: "SocialHat",
    summary: "Frontend work at a marketing agency.",
    role: "Frontend Developer",
    built: "TODO", // <-- no data on file; write what you built
    result: "TODO", // <-- and the outcome
    stack: [], // <-- and the stack
    liveUrl: null, // <-- PASTE LIVE LINK HERE
    logo: null, // <-- PASTE LOGO PATH HERE
    shots: [], // <-- PASTE SCREENSHOT PATHS HERE
    x: "13%",
    y: "21%",
    size: 94,
    lit: 38,
    ring: false,
  },
  {
    id: "mealplanner",
    name: "MealPlanner",
    summary: "Nutrition and meal-planning app. My capstone project.",
    role: "Full-Stack Mobile Developer",
    built:
      "I built the full app and its data layer: a dashboard with calories and macros, a meal planner, recipes, a grocery list, and water, exercise, and weight trackers. Daily nutrient goals follow the Philippine national nutrition standards, and the data stays on the phone — only login goes online.",
    result: "Live and in active daily use.",
    stack: ["React Native"],
    liveUrl: null, // no live link: mobile only
    logo: null, // <-- PASTE LOGO PATH HERE
    shots: [], // <-- PASTE SCREENSHOT PATHS HERE
    x: "70%",
    y: "77%",
    size: 114,
    lit: 44,
    ring: false,
  },
];
