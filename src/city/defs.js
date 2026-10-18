// Game data for Lion City Planner: zones, buildings, tools, departments, events.
// Money is in S$ thousands ($K); the UI formats it as $K / $M / $B.

export const N = 56; // map is N x N tiles
export const START_YEAR = 1965;

// reviewMin: approval below this at a 5-yearly review ends the game (0 = never).
// fire: chance multiplier for fires. income/growth: multipliers on tax income and building growth.
export const DIFFICULTY = {
  easy: { label: "Easy", desc: "Lots of money, no game over", cash: 90000, reserves: 100000, waitlist: 5000, reviewMin: 0, fire: 0, income: 1.4, growth: 1.5 },
  normal: { label: "Normal", desc: "Relaxed, with a few challenges", cash: 55000, reserves: 60000, waitlist: 7000, reviewMin: 20, fire: 0.35, income: 1.2, growth: 1.25 },
  hard: { label: "Hard", desc: "Tight budget, tough reviews", cash: 22000, reserves: 25000, waitlist: 14000, reviewMin: 30, fire: 1, income: 1, growth: 1 },
};
export const diffOf = (w) => DIFFICULTY[w.difficulty] || DIFFICULTY.normal;

// Residential zones hold residents, the others hold jobs. Index = development level (0 = empty lot).
export const ZONES = {
  hdb: {
    name: "HDB Flats",
    short: "HDB",
    icon: "🏢",
    color: "#22c55e",
    pop: [0, 240, 720, 1800],
    levelNames: ["Empty HDB land", "4-storey HDB blocks", "12-storey HDB blocks", "40-storey HDB towers"],
    // minimum desirability and year for each level
    need: [null, { score: 0, year: 0 }, { score: 42, year: 1970 }, { score: 62, year: 1990 }],
  },
  pte: {
    name: "Private Housing",
    short: "Private",
    icon: "🏡",
    color: "#d946ef",
    pop: [0, 50, 360, 950],
    levelNames: ["Empty private land", "Landed terrace houses", "Condominium", "Luxury tower"],
    need: [null, { score: 30, year: 0 }, { score: 52, year: 1975 }, { score: 72, year: 1995 }],
  },
  com: {
    name: "Commercial",
    short: "Comm",
    icon: "🏬",
    color: "#3b82f6",
    jobs: [0, 60, 220, 650],
    levelNames: ["Empty commercial land", "Shophouses", "Office block", "Skyscraper"],
    need: [null, { score: 0, year: 0 }, { score: 45, year: 1970 }, { score: 68, year: 1980 }],
  },
  ind: {
    name: "Industrial",
    short: "Ind",
    icon: "🏭",
    color: "#f59e0b",
    jobs: [0, 130, 280, 420],
    levelNames: ["Empty industrial land", "Light factories", "JTC flatted factory", "Hi-tech wafer fab"],
    need: [null, { score: 0, year: 0 }, { score: 20, year: 1972 }, { score: 40, year: 1995 }],
    pollution: [0, 30, 40, 18],
  },
};

export const DEPTS = {
  education: { name: "Education", icon: "🎓" },
  health: { name: "Healthcare", icon: "⚕️" },
  safety: { name: "Home Affairs", icon: "👮" },
  transport: { name: "Transport", icon: "🚇" },
  community: { name: "Community & Parks", icon: "🌳" },
  utilities: { name: "Utilities", icon: "⚡" },
};

// cover: which coverage map the building feeds. radius in tiles.
export const BUILDINGS = {
  hawker: { name: "Hawker Centre", icon: "🍜", cost: 450, upkeep: 4, size: 1, dept: "community", cover: "food", radius: 7, power: 1, water: 2, year: 1965, color: "#fb923c", h: 14, tip: "Cheap, good food nearby makes residents happy." },
  school: { name: "Primary School", icon: "🏫", cost: 900, upkeep: 9, size: 1, dept: "education", cover: "school", radius: 8, power: 1, water: 1, year: 1965, color: "#facc15", h: 18, tip: "Families want a school near home." },
  clinic: { name: "Polyclinic", icon: "🩺", cost: 1000, upkeep: 10, size: 1, dept: "health", cover: "health", radius: 8, power: 1, water: 1, year: 1965, color: "#f1f5f9", h: 16, tip: "Everyday healthcare for a neighbourhood." },
  hospital: { name: "Hospital", icon: "🏥", cost: 4500, upkeep: 40, size: 2, dept: "health", cover: "health", radius: 15, power: 4, water: 4, year: 1965, color: "#e2e8f0", h: 40, tip: "Covers a huge area and raises land value." },
  police: { name: "Neighbourhood Police Post", icon: "👮", cost: 550, upkeep: 5, size: 1, dept: "safety", cover: "safety", radius: 9, power: 1, water: 1, year: 1965, color: "#1e3a8a", h: 14, tip: "Keeps crime low so land value stays up." },
  fire: { name: "Fire Station", icon: "🚒", cost: 650, upkeep: 6, size: 1, dept: "safety", cover: "fire", radius: 10, power: 1, water: 2, year: 1965, color: "#dc2626", h: 16, tip: "SCDF fire cover. Buildings without it can burn down." },
  cc: { name: "Community Club", icon: "🏓", cost: 700, upkeep: 6, size: 1, dept: "community", cover: "community", radius: 8, power: 1, water: 1, year: 1965, color: "#a78bfa", h: 14, tip: "Kampong spirit for a new estate." },
  park: { name: "Park", icon: "🌳", cost: 80, upkeep: 0.6, size: 1, dept: "community", cover: "green", radius: 5, power: 0, water: 0, year: 1965, color: "#16a34a", h: 0, tip: "City in a Garden: raises land value and cuts pollution." },
  bus: { name: "Bus Interchange", icon: "🚌", cost: 600, upkeep: 6, size: 1, dept: "transport", cover: "bus", radius: 8, power: 1, water: 0, year: 1965, color: "#94a3b8", h: 10, tip: "Feeder buses shorten commutes." },
  mrt: { name: "MRT Station", icon: "🚇", cost: 1800, upkeep: 14, size: 1, dept: "transport", cover: "mrt", radius: 8, power: 3, water: 0, year: 1987, color: "#ef4444", h: 14, tip: "Must touch an MRT track. Needs at least 2 linked stations to run." },
  power: { name: "Gas Power Station", icon: "⚡", cost: 4200, upkeep: 30, size: 2, dept: "utilities", supply: { power: 400 }, power: 0, water: 2, year: 1965, color: "#64748b", h: 26, pollution: 45, tip: "Supplies 400 power units. Pollutes, so keep it away from homes." },
  solar: { name: "Solar Farm", icon: "☀️", cost: 500, upkeep: 2, size: 1, dept: "utilities", supply: { power: 14 }, power: 0, water: 0, year: 2008, color: "#1d4ed8", h: 0, tip: "Clean, but needs lots of land for 14 power units." },
  newater: { name: "NEWater Plant", icon: "💧", cost: 3200, upkeep: 26, size: 2, dept: "utilities", supply: { water: 230 }, power: 12, water: 0, year: 2003, color: "#0ea5e9", h: 12, tip: "Recycles used water into 230 water units." },
  desal: { name: "Desalination Plant", icon: "🌊", cost: 3800, upkeep: 32, size: 2, dept: "utilities", supply: { water: 260 }, power: 25, water: 0, year: 2005, coastal: true, color: "#38bdf8", h: 12, tip: "Turns seawater into 260 water units. Must touch the sea. Power hungry." },
  waterworks: { name: "Waterworks", icon: "🚰", cost: 2200, upkeep: 14, size: 2, dept: "utilities", supply: { water: 90 }, power: 3, water: 0, year: 1965, color: "#7dd3fc", h: 10, tip: "Treats rain from reservoirs: +90 water, +4 per reservoir tile within 6 tiles." },
  gardens: { name: "Gardens by the Bay", icon: "🌺", cost: 14000, upkeep: 60, size: 3, dept: "community", cover: "green", radius: 9, power: 6, water: 6, year: 2012, tourism: 520, landmark: 25, color: "#7c3aed", h: 0, tip: "Supertrees! Tourists, land value and greenery." },
  ir: { name: "Integrated Resort", icon: "🎰", cost: 22000, upkeep: 50, size: 3, dept: "community", power: 10, water: 8, year: 2010, tourism: 1100, landmark: 15, color: "#cbd5e1", h: 70, jobs: 900, tip: "Three towers and a sky park. Big tourism income." },
  airport: { name: "Changi Airport", icon: "✈️", cost: 30000, upkeep: 90, size: 4, dept: "transport", power: 12, water: 6, year: 1981, tourism: 900, jobs: 1500, pollution: 30, color: "#e5e7eb", h: 8, tip: "World-class hub: tourism, jobs and commercial demand. Noisy." },
  port: { name: "Container Port", icon: "⚓", cost: 16000, upkeep: 60, size: 3, dept: "transport", power: 8, water: 2, year: 1972, coastal: true, tourism: 0, trade: 700, jobs: 1200, pollution: 25, color: "#f97316", h: 6, tip: "Must touch the sea. Trade income and industrial demand." },
};

// Toolbar categories. Each tool: id, plus how it is applied ("line" drag, "rect" drag, or "place").
export const TOOL_GROUPS = [
  { id: "inspect", icon: "👆", name: "Look", tools: [{ id: "inspect", icon: "👆", name: "Inspect / Pan", mode: "inspect", tip: "Tap a tile to see details. Drag to move the map." }] },
  {
    id: "zone",
    icon: "🏘️",
    name: "Zones",
    tools: [
      { id: "zone:hdb", icon: "🏢", name: "HDB Flats", mode: "rect", cost: 5, tip: "Public housing. Most Singaporeans live in HDB." },
      { id: "zone:pte", icon: "🏡", name: "Private Housing", mode: "rect", cost: 5, tip: "Landed & condos. Land sales earn money, but too much hurts affordability." },
      { id: "zone:com", icon: "🏬", name: "Commercial", mode: "rect", cost: 5, tip: "Shops and offices: jobs and GST." },
      { id: "zone:ind", icon: "🏭", name: "Industrial", mode: "rect", cost: 5, tip: "Factories: jobs, but pollution." },
      { id: "dezone", icon: "🧽", name: "De-zone", mode: "rect", cost: 1, tip: "Remove zoning from empty lots." },
    ],
  },
  {
    id: "transport",
    icon: "🛣️",
    name: "Transport",
    tools: [
      { id: "road", icon: "🛣️", name: "Road", mode: "line", cost: 20, tip: "Zones and amenities need a road within 3 tiles." },
      { id: "rail", icon: "🛤️", name: "MRT Track", mode: "line", cost: 120, year: 1987, tip: "Elevated track. Can run over roads." },
      { id: "b:mrt", icon: "🚇", name: "MRT Station", mode: "place" },
      { id: "b:bus", icon: "🚌", name: "Bus Interchange", mode: "place" },
      { id: "b:port", icon: "⚓", name: "Container Port", mode: "place" },
      { id: "b:airport", icon: "✈️", name: "Changi Airport", mode: "place" },
    ],
  },
  {
    id: "amenity",
    icon: "🍜",
    name: "Services",
    tools: [
      { id: "b:hawker", mode: "place" },
      { id: "b:school", mode: "place" },
      { id: "b:clinic", mode: "place" },
      { id: "b:hospital", mode: "place" },
      { id: "b:police", mode: "place" },
      { id: "b:fire", mode: "place" },
      { id: "b:cc", mode: "place" },
      { id: "b:park", mode: "rect" },
    ],
  },
  {
    id: "utility",
    icon: "⚡",
    name: "Utilities",
    tools: [
      { id: "b:power", mode: "place" },
      { id: "b:solar", mode: "rect" },
      { id: "b:waterworks", mode: "place" },
      { id: "b:newater", mode: "place" },
      { id: "b:desal", mode: "place" },
    ],
  },
  {
    id: "landmark",
    icon: "🌺",
    name: "Landmarks",
    tools: [
      { id: "b:gardens", mode: "place" },
      { id: "b:ir", mode: "place" },
    ],
  },
  {
    id: "land",
    icon: "🏗️",
    name: "Land",
    tools: [
      { id: "reclaim", icon: "🏝️", name: "Reclaim Land", mode: "rect", cost: 180, tip: "Turn sea next to land into new land, like Marina Bay and Jurong Island." },
      { id: "trees", icon: "🌴", name: "Plant Trees", mode: "rect", cost: 10, tip: "Greenery that soaks up pollution." },
      { id: "bulldoze", icon: "🚜", name: "Bulldoze", mode: "rect", cost: 2, tip: "Clear roads, buildings, zones and trees." },
    ],
  },
];

// Fill in names/icons/costs for building tools from BUILDINGS.
for (const g of TOOL_GROUPS) {
  for (const t of g.tools) {
    if (t.id.startsWith("b:")) {
      const b = BUILDINGS[t.id.slice(2)];
      t.building = t.id.slice(2);
      t.icon = t.icon || b.icon;
      t.name = t.name || b.name;
      t.cost = b.cost;
      t.year = b.year;
      t.tip = b.tip;
    }
  }
}

export const ALL_TOOLS = Object.fromEntries(TOOL_GROUPS.flatMap((g) => g.tools.map((t) => [t.id, t])));

// Things that matter to residents. weight = share of approval.
export const NEEDS = {
  housing: { name: "Housing", icon: "🏠", weight: 1.1 },
  jobs: { name: "Jobs", icon: "💼", weight: 1.3 },
  cost: { name: "Cost of living", icon: "🧾", weight: 1.2 },
  food: { name: "Hawker food", icon: "🍜", weight: 0.9 },
  school: { name: "Schools", icon: "🏫", weight: 0.9 },
  health: { name: "Healthcare", icon: "🩺", weight: 0.9 },
  safety: { name: "Safety", icon: "👮", weight: 0.8 },
  transport: { name: "Transport", icon: "🚇", weight: 1.0 },
  green: { name: "Greenery", icon: "🌳", weight: 0.6 },
  community: { name: "Community", icon: "🏓", weight: 0.4 },
  utilities: { name: "Power & water", icon: "💡", weight: 1.2 },
  environment: { name: "Clean air", icon: "🌬️", weight: 0.6 },
};

// Era milestones shown as news.
export const MILESTONES = [
  { year: 1965, month: 7, text: "🇸🇬 9 Aug 1965: Singapore is independent! Thousands live in crowded kampongs and need homes. Zone HDB flats next to roads." },
  { year: 1970, month: 0, text: "📋 First ministerial review this year. Check approval in 📊 and keep residents happy." },
  { year: 1972, month: 0, text: "⚓ Container ports can now be built on the coast." },
  { year: 1981, month: 0, text: "✈️ Changi Airport can now be built. Needs a big 4×4 site." },
  { year: 1987, month: 0, text: "🚇 MRT technology arrives! Lay track, then put stations next to it." },
  { year: 2003, month: 0, text: "💧 NEWater is here: recycle used water into a 'national tap'." },
  { year: 2005, month: 0, text: "🌊 Desalination plants can now be built on the coast." },
  { year: 2008, month: 0, text: "☀️ Solar farms are available. Clean power, but land-hungry." },
  { year: 2010, month: 0, text: "🎰 Integrated Resorts are allowed. Big tourism money." },
  { year: 2012, month: 0, text: "🌺 Gardens by the Bay can now be built." },
  { year: 2060, month: 0, text: "⚠️ The water agreement with Johor ends next year. Build more local water supply!" },
  { year: 2061, month: 0, text: "🚰 The 1962 Water Agreement has expired. Imported water is gone." },
];

// Random events. apply(world) returns nothing; effects use world.effects timers.
export const EVENTS = [
  { id: "recession", chance: 0.012, minYear: 1970, months: 12, text: "📉 Global recession! Corporate tax income falls 30% for a year.", effect: { corpTax: 0.7 } },
  { id: "boom", chance: 0.012, minYear: 1970, months: 12, text: "📈 Electronics boom! Investors want factories and offices.", effect: { comDemand: 0.4, indDemand: 0.5 } },
  { id: "dengue", chance: 0.012, minYear: 1965, months: 6, text: "🦟 Dengue cluster! Areas without polyclinic cover get unhappy.", effect: { health: 0.7 } },
  { id: "babyboom", chance: 0.01, minYear: 1965, months: 1, text: "👶 Baby boom! More families are queueing for flats.", effect: {}, once: (w) => (w.waitlist += Math.round(800 + w.stats.pop * 0.03)) },
  { id: "tourism", chance: 0.01, minYear: 1975, months: 12, text: "📸 Singapore is trending! Tourism income up 50% for a year.", effect: { tourism: 1.5 } },
  { id: "flood", chance: 0.01, minYear: 1965, months: 1, text: "🌧️ Monsoon flash floods! Drainage repairs cost money.", effect: {}, once: (w) => (w.cash -= Math.round(200 + w.roadCount * 1.5)) },
  { id: "haze", chance: 0.01, minYear: 1980, months: 3, text: "🌫️ Haze season! Clean air drops across the island.", effect: { air: 0.6 } },
  { id: "oil", chance: 0.008, minYear: 1973, months: 9, text: "🛢️ Oil price shock! Power stations cost 50% more to run.", effect: { powerCost: 1.5 } },
];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
