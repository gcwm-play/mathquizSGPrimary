// Catalogue for Lion City Mayor. Money is in S$ thousands ($K).

export const START_YEAR = 1965;
export const TERM_YEARS = 6;
export const FIRST_ELECTION = 1968;

export const DIFFICULTY = {
  easy: { label: "Easy", desc: "Generous budget, can't be voted out", cash: 30000, waitlist: 2500, growth: 1.5, income: 1.4, voteMin: 0, fire: 0.3 },
  normal: { label: "Normal", desc: "Win each election to stay mayor", cash: 15000, waitlist: 3500, growth: 1.25, income: 1.2, voteMin: 50, fire: 0.7 },
  hard: { label: "Hard", desc: "Tight money, demanding voters", cash: 6000, waitlist: 5000, growth: 1, income: 1, voteMin: 50, fire: 1, harsh: true },
};
export const diffOf = (w) => DIFFICULTY[w.difficulty] || DIFFICULTY.normal;

export const ZONES = {
  hdb: { name: "HDB", icon: "🏢", color: "#2fd06f", res: true },
  pte: { name: "Private", icon: "🏡", color: "#f45fae", res: true },
  com: { name: "Commercial", icon: "🏬", color: "#4b9bff" },
  ind: { name: "Industrial", icon: "🏭", color: "#ffb020" },
};

// Buildings that grow on lots. "from"/"until": years they can be newly built.
// cap = residents, jobs = workers, q = housing quality (0-100), build = months to build,
// need = desirability needed, cost = construction cost ($K) paid when building starts.
export const LOT_TYPES = {
  emergency: { zone: "hdb", name: "Emergency flats", era: "1960s", from: 1960, until: 1970, cap: 150, q: 34, build: 4, need: 0, cost: 70 },
  slab: { zone: "hdb", name: "HDB slab block", era: "1960s–70s", from: 1966, cap: 360, q: 50, build: 8, need: 0, cost: 200 },
  point: { zone: "hdb", name: "HDB point block", era: "1970s", from: 1975, cap: 420, q: 60, build: 10, need: 25, cost: 260 },
  ng: { zone: "hdb", name: "New Generation flats", era: "1980s", from: 1980, cap: 500, q: 68, build: 12, need: 32, cost: 330 },
  modern: { zone: "hdb", name: "Modern HDB estate", era: "1990s–2000s", from: 1995, cap: 620, q: 78, build: 14, need: 38, cost: 440 },
  bto: { zone: "hdb", name: "BTO sky towers", era: "2010s", from: 2008, cap: 860, q: 88, build: 18, need: 44, cost: 650 },

  terrace: { zone: "pte", name: "Terrace houses", era: "pre-war", from: 1900, cap: 50, q: 72, build: 6, need: 20, cost: 30 },
  condo: { zone: "pte", name: "Condominium", era: "1970s", from: 1975, cap: 280, q: 84, build: 14, need: 48, cost: 140 },
  luxury: { zone: "pte", name: "Luxury tower", era: "2000s", from: 1998, cap: 520, q: 93, build: 20, need: 64, cost: 300 },

  shophouse: { zone: "com", name: "Shophouses", era: "pre-war", from: 1900, until: 1975, jobs: 50, cap: 30, q: 40, build: 6, need: 0, cost: 30 },
  ncentre: { zone: "com", name: "Neighbourhood centre", era: "1970s", from: 1970, jobs: 140, build: 8, need: 15, cost: 80 },
  mall: { zone: "com", name: "Shopping mall", era: "1980s", from: 1980, jobs: 300, build: 14, need: 45, cost: 200 },
  office: { zone: "com", name: "Office tower", era: "1980s", from: 1984, jobs: 520, build: 20, need: 58, cost: 360 },
  mixed: { zone: "com", name: "Mixed-use tower", era: "2000s", from: 2005, jobs: 640, cap: 120, q: 85, build: 22, need: 66, cost: 480 },

  farm: { zone: "ind", name: "Pig & vegetable farm", era: "1960s", from: 1900, until: 1984, jobs: 30, poll: 22, build: 3, need: 0, cost: 10 },
  factory: { zone: "ind", name: "Light factory", era: "1960s", from: 1965, jobs: 120, poll: 34, build: 6, need: 0, cost: 60 },
  jtc: { zone: "ind", name: "JTC flatted factory", era: "1970s", from: 1972, jobs: 240, poll: 28, build: 10, need: 10, cost: 140 },
  hitech: { zone: "ind", name: "Hi-tech business park", era: "1990s", from: 1995, jobs: 340, poll: 8, build: 16, need: 35, cost: 260 },
};

export const ZONE_LINE = {
  hdb: ["emergency", "slab", "point", "ng", "modern", "bto"],
  pte: ["terrace", "condo", "luxury"],
  com: ["shophouse", "ncentre", "mall", "office", "mixed"],
  ind: ["farm", "factory", "jtc", "hitech"],
};

export const KAMPONG = { name: "Kampong", housePop: 28, q: 22 };

// Services and landmarks. w × d = footprint in world units, r = reach.
export const STRUCTS = {
  market: { name: "Wet market", icon: "🐟", cost: 250, upkeep: 2, w: 1.6, d: 1.4, cover: "food", r: 6, year: 1965, tip: "Fresh food for nearby homes." },
  hawker: { name: "Hawker centre", icon: "🍜", cost: 450, upkeep: 4, w: 2, d: 1.6, cover: "food", r: 9, year: 1971, tip: "Cheap, good food. Residents love these." },
  school: { name: "Primary school", icon: "🏫", cost: 800, upkeep: 8, w: 2.4, d: 2, cover: "school", r: 9, year: 1965, tip: "Young children need one close to home." },
  secondary: { name: "Secondary school", icon: "🎒", cost: 1200, upkeep: 11, w: 2.8, d: 2.2, cover: "school2", r: 13, year: 1965, tip: "Teenagers can travel a bit further. Covers a wider area." },
  tertiary: { name: "Polytechnic / university", icon: "🎓", cost: 6000, upkeep: 40, w: 4.2, d: 3.2, cover: "school3", r: 30, year: 1968, tip: "One campus can serve most of your region." },
  clinic: { name: "Polyclinic", icon: "🩺", cost: 900, upkeep: 9, w: 1.8, d: 1.6, cover: "health", r: 9, year: 1965, tip: "Everyday healthcare." },
  hospital: { name: "Hospital", icon: "🏥", cost: 4000, upkeep: 35, w: 3.6, d: 3, cover: "health", r: 22, year: 1965, tip: "Covers the whole region." },
  police: { name: "Police post", icon: "👮", cost: 500, upkeep: 5, w: 1.4, d: 1.2, cover: "safety", r: 10, year: 1965, tip: "Keeps neighbourhoods safe." },
  fire: { name: "Fire station", icon: "🚒", cost: 600, upkeep: 6, w: 1.8, d: 1.6, cover: "fire", r: 12, year: 1965, tip: "Stops fires. Kampongs burn easily!" },
  cc: { name: "Community centre", icon: "🏓", cost: 600, upkeep: 5, w: 1.8, d: 1.6, cover: "community", r: 10, year: 1965, tip: "Brings neighbours together. Good for votes." },
  park: { name: "Park", icon: "🌳", cost: 120, upkeep: 1, w: 2.2, d: 2.2, cover: "green", r: 6, year: 1965, tip: "Greenery near homes." },
  bus: { name: "Bus interchange", icon: "🚌", cost: 600, upkeep: 6, w: 2.2, d: 1.6, cover: "transport", r: 9, year: 1970, tip: "Feeder buses for a whole town." },
  mrt: { name: "MRT station", icon: "🚇", cost: 2000, upkeep: 15, w: 2.4, d: 1.4, cover: "mrt", r: 9, year: 1987, rail: true, tip: "Place beside MRT track. Needs 2 stations on a line." },
  sports: { name: "Sports complex", icon: "🏊", cost: 1500, upkeep: 10, w: 3, d: 2.4, cover: "green", r: 12, year: 1973, tip: "Pools and fields. Counts as greenery and community." },

  // region landmarks
  changiAirport: { name: "Changi Airport", icon: "✈️", cost: 25000, upkeep: 60, w: 10, d: 5, year: 1981, coastal: true, landmark: true, tourism: 900, jobs: 2500, poll: 25, region: "east", tip: "Must touch the sea. Huge jobs and tourism." },
  eastCoastPark: { name: "East Coast Park", icon: "🏖️", cost: 3000, upkeep: 10, w: 9, d: 1.8, year: 1976, coastal: true, landmark: true, cover: "green", r: 10, tourism: 120, region: "east", tip: "A beach park on reclaimed land." },
  tampinesHub: { name: "Our Tampines Hub", icon: "🏟️", cost: 6000, upkeep: 30, w: 4, d: 3.4, year: 2017, landmark: true, cover: "community", r: 16, tourism: 60, region: "east", tip: "A giant community hub." },
  birdPark: { name: "Jurong Bird Park", icon: "🦜", cost: 4000, upkeep: 20, w: 4.5, d: 3.6, year: 1971, landmark: true, cover: "green", r: 8, tourism: 300, region: "west", tip: "A big tourist draw." },
  scienceCentre: { name: "Science Centre", icon: "🔬", cost: 3500, upkeep: 18, w: 3.4, d: 2.6, year: 1977, landmark: true, cover: "school", r: 14, tourism: 150, region: "west", tip: "Counts as school cover for a wide area." },
  jurongIsland: { regionOnly: true, name: "Jurong Island petrochemicals", icon: "🛢️", cost: 18000, upkeep: 50, w: 7, d: 4, year: 2000, landmark: true, jobs: 2000, poll: 45, trade: 700, needIsland: true, region: "west", tip: "Must be built on the southern islands." },
  tuasPort: { name: "Tuas Mega Port", icon: "⚓", cost: 22000, upkeep: 60, w: 8, d: 3.5, year: 2021, coastal: true, landmark: true, jobs: 1800, trade: 900, poll: 20, region: "west", tip: "Must touch the sea." },
  merlion: { name: "Merlion", icon: "🦁", cost: 1500, upkeep: 3, w: 1.6, d: 1.6, year: 1972, landmark: true, coastal: true, tourism: 260, region: "central", tip: "Must touch the water." },
  esplanade: { name: "Esplanade", icon: "🎭", cost: 6000, upkeep: 25, w: 4, d: 3, year: 2002, landmark: true, tourism: 300, cover: "community", r: 14, region: "central", tip: "Arts centre. Locals call it the durian." },
  marinaBaySands: { name: "Marina Bay Sands", icon: "🎰", cost: 22000, upkeep: 50, w: 5, d: 3.4, year: 2010, landmark: true, tourism: 1200, jobs: 1500, region: "central", tip: "Three towers and a sky park." },
  gardensBay: { name: "Gardens by the Bay", icon: "🌺", cost: 12000, upkeep: 50, w: 6, d: 5, year: 2012, landmark: true, cover: "green", r: 14, tourism: 500, region: "central", tip: "Supertrees!" },
  checkpoint: { regionOnly: true, name: "Woodlands Checkpoint", icon: "🛂", cost: 9000, upkeep: 40, w: 5, d: 3, year: 1999, landmark: true, coastal: true, jobs: 900, trade: 500, region: "north", tip: "Must touch the Strait. Causeway trade income." },
  causewayPoint: { hidden: true, name: "Causeway Point", icon: "🛍️", cost: 5000, upkeep: 15, w: 3.6, d: 3, year: 1998, landmark: true, jobs: 800, cover: "food", r: 10, tourism: 80, region: "north", tip: "A big mall that shoppers from JB visit too." },
  sungeiBuloh: { name: "Sungei Buloh Wetlands", icon: "🦀", cost: 2000, upkeep: 6, w: 5, d: 4, year: 1993, landmark: true, coastal: true, cover: "green", r: 12, tourism: 140, region: "north", tip: "Must touch the sea. Protects the mangroves." },
  rtsLink: { regionOnly: true, name: "RTS Link to JB", icon: "🚝", cost: 15000, upkeep: 30, w: 3.4, d: 2, year: 2026, landmark: true, coastal: true, cover: "mrt", r: 10, trade: 400, tourism: 200, region: "north", tip: "Must touch the Strait. Trains to Johor Bahru." },

  secondLink: { regionOnly: true, name: "Tuas Second Link", icon: "🌉", cost: 12000, upkeep: 35, w: 4, d: 2.4, year: 1998, landmark: true, coastal: true, facesJohor: true, jobs: 400, trade: 450, tourism: 120, region: "west", tip: "Must be on the western shore facing Johor. A second crossing to Malaysia: trade and visitors." },
  mountFaber: { name: "Mount Faber Park", icon: "⛰️", cost: 1200, upkeep: 4, w: 4, d: 3.4, year: 1965, landmark: true, cover: "green", r: 12, tourism: 60, region: "south", tip: "A hilltop park with harbour views." },
  keppelPort: { name: "Keppel container port", icon: "⚓", cost: 9000, upkeep: 35, w: 7, d: 3, year: 1972, coastal: true, landmark: true, jobs: 1400, trade: 550, poll: 18, region: "south", notResort: true, tip: "Must touch the sea (not on Sentosa). Trade and jobs." },
  cableCar: { regionOnly: true, name: "Singapore Cable Car", icon: "🚡", cost: 2500, upkeep: 10, w: 2, d: 2, year: 1974, landmark: true, coastal: true, tourism: 120, sentosaLink: 0.3, sentosaAppeal: 0.3, region: "south", tip: "Must touch the sea. Carries visitors over the harbour to Sentosa." },
  sentosaBeach: { regionOnly: true, name: "Siloso Beach resort", icon: "🏖️", cost: 1800, upkeep: 8, w: 5, d: 1.8, year: 1975, landmark: true, coastal: true, onResort: true, cover: "green", r: 8, sentosaAppeal: 0.4, sentosaCap: 1, region: "south", tip: "On Sentosa, touching the sea. Beaches draw visitors." },
  underwaterWorld: { regionOnly: true, name: "Underwater World", icon: "🐠", cost: 4000, upkeep: 18, w: 3.4, d: 2.6, year: 1991, landmark: true, onResort: true, sentosaAppeal: 0.5, sentosaCap: 1, region: "south", tip: "On Sentosa. An oceanarium with a moving walkway tunnel." },
  sentosaBridge: { regionOnly: true, name: "Sentosa road bridge", icon: "🌉", cost: 3500, upkeep: 10, w: 2.4, d: 2, year: 1992, landmark: true, coastal: true, notResort: true, sentosaLink: 0.35, region: "south", tip: "On the mainland shore facing Sentosa. Cars and buses onto the island." },
  vivoCity: { hidden: true, name: "VivoCity", icon: "🛍️", cost: 7000, upkeep: 20, w: 4.4, d: 3.2, year: 2006, landmark: true, notResort: true, jobs: 1200, cover: "food", r: 12, tourism: 180, region: "south", tip: "Singapore's biggest mall, at the gateway to Sentosa." },
  sentosaExpress: { regionOnly: true, name: "Sentosa Express", icon: "🚝", cost: 6000, upkeep: 18, w: 3.4, d: 1.8, year: 2007, landmark: true, coastal: true, cover: "mrt", r: 10, sentosaLink: 0.4, region: "south", tip: "Must touch the sea. A monorail from VivoCity onto the island." },
  resortsWorld: { regionOnly: true, name: "Resorts World Sentosa", icon: "🎢", cost: 20000, upkeep: 45, w: 5, d: 4, year: 2010, landmark: true, onResort: true, jobs: 1500, sentosaAppeal: 1.6, sentosaCap: 3, region: "south", tip: "On Sentosa. Casino, hotels and Universal Studios: a huge visitor magnet." },

  // shopping malls: one project, three kinds (chosen in the project screen)
  mallHood: { group: "mall", name: "Neighbourhood mall", kind: "Integrated neighbourhood mall (open-air)", icon: "🛍️", cost: 3500, build: 12, upkeep: 4, w: 3.4, d: 2.8, year: 1972, landmark: true, cover: "food", r: 10, alsoCover: "community", jobs: 450, tourism: 15, pros: ["Cheap and quick to build", "Food and a community space for nearby homes", "Popular with residents"], cons: ["Few tourists", "Modest tax income"] },
  mallCentre: { group: "mall", name: "Shopping centre", kind: "Shopping centre", icon: "🛍️", cost: 7500, build: 20, upkeep: 8, w: 3.8, d: 3, year: 1974, landmark: true, cover: "food", r: 12, jobs: 1000, tourism: 90, poll: 5, pros: ["Lots of jobs and business tax", "Food court for a wide area", "Some visitors"], cons: ["Traffic and noise nearby", "Takes nearly 2 years"] },
  mallLux: { group: "mall", name: "High-end mall", kind: "High-end luxury mall", icon: "💎", cost: 15000, build: 30, upkeep: 14, w: 4.2, d: 3.2, year: 1985, landmark: true, cover: "food", r: 6, jobs: 1300, tourism: 330, prestige: 3, pricey: true, pros: ["Big tourist draw", "Raises land value and reputation"], cons: ["Very expensive, 2½ years to build", "Locals find it pricey: cost of living −4 to −8 in its town for 10 years", "Little everyday food"] },

  // fixed scenery at the start
  // only appear through Fantasy Mode stories
  olympicStadium: { hidden: true, fantasy: true, name: "Olympic Stadium", icon: "🏟️", cost: 0, build: 18, upkeep: 30, w: 5.4, d: 4.4, year: 2027, landmark: true, cover: "green", r: 14, alsoCover: "community", jobs: 600, tourism: 500, tip: "Built for the Games. A huge sports and events venue." },
  alienEmbassy: { hidden: true, fantasy: true, name: "Alien Embassy", icon: "🛸", cost: 0, upkeep: 0, w: 3.2, d: 3.2, year: 2027, landmark: true, cover: "community", r: 16, jobs: 200, tourism: 450, tip: "A gift from friends in orbit. Visitors come from across the galaxy." },
  cureLab: { hidden: true, fantasy: true, name: "Cure Research Lab", icon: "🧪", cost: 0, upkeep: 25, w: 3, d: 2.4, year: 2027, cover: "health", r: 20, jobs: 300, tip: "Scientists racing to cure the outbreak. Also a fine clinic." },
  spaceElevator: { hidden: true, fantasy: true, name: "Space Elevator", icon: "🚀", cost: 0, build: 36, upkeep: 60, w: 3, d: 3, year: 2040, landmark: true, jobs: 1000, tourism: 900, trade: 600, tip: "A cable to orbit. Trade and tourists from all over the world." },
  fortSiloso: { name: "Fort Siloso", icon: "🏰", w: 3, d: 2.4, fixed: true, jobs: 150, sentosaAppeal: 0.2 },
  airbase: { name: "RAF Changi air base", icon: "🛩️", w: 7, d: 4, fixed: true, jobs: 600 },
  navalBase: { name: "Sembawang naval base", icon: "⚓", w: 6, d: 3.5, fixed: true, jobs: 800 },
};

// running a service costs real money: upkeep is per month in $K
for (const S of Object.values(STRUCTS)) if (S.upkeep) S.upkeep = Math.round(S.upkeep * 1.6);
// landmarks are big-ticket projects that take years to build
for (const S of Object.values(STRUCTS)) {
  if (!S.landmark || S.group) continue;
  S.cost = Math.max(4000, Math.round((S.cost * 1.6) / 100) * 100);
  S.build = S.build ?? Math.max(8, Math.min(48, Math.round(6 + S.cost / 1500)));
}

// name ideas for malls in each region (players can type their own)
export const MALL_NAMES = {
  east: ["Tampines Mall", "Century Square", "Bedok Mall", "White Sands", "Changi City Point", "Loyang Point"],
  west: ["Jurong Point", "JEM", "Westgate", "IMM", "Boon Lay Place", "Pioneer Mall"],
  central: ["Plaza Singapura", "ION Orchard", "Raffles City", "Bugis Junction", "Lucky Plaza", "People's Park Complex"],
  south: ["VivoCity", "HarbourFront Centre", "Alexandra Retail Centre", "Tiong Bahru Plaza", "Queensway Shopping Centre"],
  north: ["Causeway Point", "Sembawang Shopping Centre", "Northpoint", "Sun Plaza", "Woodlands Mart", "Canberra Plaza"],
};

export const ROAD_TYPES = {
  road: { name: "Road", half: 0.3, cost: 30, lots: true },
  avenue: { name: "Avenue", half: 0.45, cost: 55, lots: true, transport: 0.15 },
  rail: { name: "MRT track", half: 0.26, cost: 160, lots: false, rail: true, year: 1987 },
};

export const TOOL_GROUPS = [
  { id: "look", icon: "👆", name: "Look", tools: [{ id: "look", icon: "👆", name: "Look", mode: "look" }] },
  {
    id: "roads",
    icon: "🛣️",
    name: "Roads",
    tools: [
      { id: "road:road", icon: "🛣️", name: "Road", mode: "road", tip: "Curvy roads. Lots appear along both sides." },
      { id: "road:rail", icon: "🚆", name: "MRT track", mode: "road", year: 1987, tip: "Elevated track for MRT stations." },
      { id: "unroad", icon: "✂️", name: "Remove road", mode: "pick", tip: "Tap a road to remove it and its lots." },
    ],
  },
  {
    id: "zones",
    icon: "🏘️",
    name: "Zones",
    tools: [
      { id: "zone:hdb", icon: "🏢", name: "HDB", mode: "brush", cost: 2, tip: "Public housing. Paint over lots." },
      { id: "zone:pte", icon: "🏡", name: "Private", mode: "brush", cost: 2, tip: "Houses and condos. Earns land sales." },
      { id: "zone:com", icon: "🏬", name: "Commercial", mode: "brush", cost: 2, tip: "Shops and offices: jobs." },
      { id: "zone:ind", icon: "🏭", name: "Industrial", mode: "brush", cost: 2, tip: "Factories: jobs and pollution." },
      { id: "zone:none", icon: "🧽", name: "Unzone", mode: "brush", cost: 0, tip: "Clear zoning from empty lots." },
    ],
  },
  { id: "services", icon: "🍜", name: "Services", tools: ["market", "hawker", "school", "secondary", "tertiary", "clinic", "hospital", "police", "fire", "cc", "park", "bus", "sports", "mrt"].map((k) => ({ id: `s:${k}`, mode: "place", struct: k })) },
  { id: "landmarks", icon: "🌟", name: "Landmarks", tools: [] },
  {
    id: "renew",
    icon: "🏗️",
    name: "Renew",
    tools: [
      { id: "renew", icon: "🏗️", name: "Renew", mode: "pick", tip: "Tap an old block or kampong to upgrade, rebuild or resettle." },
      { id: "reclaim", icon: "🏝️", name: "Reclaim land", mode: "brush", cost: 120, select: true, tip: "Turn sea next to land into land." },
      { id: "trees", icon: "🌴", name: "Plant trees", mode: "brush", cost: 4, tip: "Greenery that cleans the air." },
      { id: "bulldoze", icon: "🚜", name: "Bulldoze", mode: "brush", select: true, tip: "Clear buildings, services and trees." },
    ],
  },
];

for (const g of TOOL_GROUPS) {
  for (const t of g.tools) {
    if (t.struct) {
      const s = STRUCTS[t.struct];
      t.icon = s.icon;
      t.name = s.name;
      t.cost = s.cost;
      t.year = s.year;
      t.tip = s.tip;
    }
    if (t.id.startsWith("road:")) {
      const r = ROAD_TYPES[t.id.slice(5)];
      t.cost = r.cost;
      t.year = r.year;
    }
  }
}

export function toolGroups(regionId) {
  return TOOL_GROUPS.map((g) =>
    g.id === "landmarks"
      ? {
          ...g,
          tools: [
            { id: "proj:mall", mode: "project", group: "mall", icon: "🛍️", name: "Shopping mall", cost: STRUCTS.mallHood.cost, year: STRUCTS.mallHood.year, tip: "Choose a name and the kind of mall." },
            ...Object.entries(STRUCTS)
              .filter(([, s]) => s.landmark && !s.group && !s.hidden && (s.region === regionId || !s.regionOnly))
              .sort((a, b) => (b[1].region === regionId) - (a[1].region === regionId) || a[1].year - b[1].year)
              .map(([k, s]) => ({ id: `s:${k}`, mode: "place", struct: k, icon: s.icon, name: s.name, cost: s.cost, year: s.year, tip: s.tip, landmark: true, home: s.region === regionId })),
          ],
        }
      : g
  );
}

export const ALL_TOOLS = {};
for (const g of TOOL_GROUPS) for (const t of g.tools) ALL_TOOLS[t.id] = t;
for (const [k, s] of Object.entries(STRUCTS)) if (s.landmark) ALL_TOOLS[`s:${k}`] = { id: `s:${k}`, mode: "place", struct: k, icon: s.icon, name: s.name, cost: s.cost, year: s.year, tip: s.tip, landmark: true };
ALL_TOOLS["proj:mall"] = { id: "proj:mall", mode: "project", group: "mall", icon: "🛍️", name: "Shopping mall", cost: STRUCTS.mallHood.cost, year: STRUCTS.mallHood.year };

// What a town is planned for. growth: how readily each zone builds there
// (0 = not allowed); weight: how much residents care about each need
// (needs below 0.5 aren't expected there, so nobody asks for them).
export const PURPOSES = {
  mixed: { name: "Mixed town", icon: "🏙️", desc: "A bit of everything: homes, shops, some light industry.", growth: { hdb: 1, pte: 1, com: 1, ind: 0.8 }, weight: {} },
  residential: { name: "Residential", icon: "🏘️", desc: "Mostly homes. Families want schools, parks, clean air.", growth: { hdb: 1.35, pte: 1.3, com: 0.8, ind: 0.15 }, weight: { environment: 1.4, green: 1.3, school: 1.2, jobs: 0.7 } },
  commercial: { name: "Commercial / CBD", icon: "🏢", desc: "Offices, malls and condos. Hawker centres feed the lunch crowd and draw tourists; nobody expects wet markets or many schools.", growth: { hdb: 0.35, pte: 1.15, com: 1.8, ind: 0.15 }, weight: { food: 0.7, school: 0.3, community: 0.4, green: 0.8, transport: 1.6, safety: 1.3, jobs: 1.2 } },
  industrial: { name: "Industrial", icon: "🏭", desc: "Factories and ports. Workers want jobs and transport; fewer expect parks or clean air.", growth: { hdb: 0.45, pte: 0.15, com: 0.7, ind: 1.9 }, weight: { environment: 0.4, green: 0.35, school: 0.45, community: 0.6, jobs: 1.5, transport: 1.3 } },
  heritage: { name: "Heritage & tourism", icon: "🏮", desc: "Old streets, food and visitors. Keep shophouses; tourists pay.", growth: { hdb: 0.6, pte: 0.8, com: 1.3, ind: 0.1 }, weight: { food: 1.3, community: 1.2, school: 0.6, green: 0.8 }, tourism: 1 },
  resort: { name: "Resort island", icon: "🏝️", desc: "Run for visitors: hotels, beaches and attractions. No HDB flats or industry.", growth: { hdb: 0, pte: 0.5, com: 1.3, ind: 0 }, weight: { school: 0.1, food: 0.4, community: 0.2, jobs: 0.4, cost: 0.3 }, fixed: true },
};
export const purposeOf = (t) => PURPOSES[t?.purpose] || PURPOSES.mixed;
export const MINOR = 0.5;

export const NEEDS = {
  housing: { name: "Housing quality", icon: "🏠", weight: 1.3 },
  jobs: { name: "Jobs", icon: "💼", weight: 1.1 },
  cost: { name: "Cost of living", icon: "🧾", weight: 0.9 },
  food: { name: "Food nearby", icon: "🍜", weight: 0.9 },
  school: { name: "Schools", icon: "🏫", weight: 0.8 },
  health: { name: "Healthcare", icon: "🩺", weight: 0.8 },
  safety: { name: "Safety", icon: "👮", weight: 0.7 },
  transport: { name: "Transport", icon: "🚌", weight: 0.9 },
  green: { name: "Greenery", icon: "🌳", weight: 0.5 },
  community: { name: "Community", icon: "🏓", weight: 0.6 },
  environment: { name: "Clean air", icon: "🌬️", weight: 0.6 },
};

// What residents say when a need is poor.
export const COMPLAINTS = {
  housing: ["Our block is so old, when got upgrading?", "Kampong life is warm, but we need proper toilets and water.", "Flat too small for the whole family lah."],
  jobs: ["Hard to find work near home.", "Need more factories or offices around here."],
  cost: ["Everything so expensive now!", "Taxes going up again ah?"],
  food: ["Nearest hawker centre is so far away!", "Need a wet market nearby to buy fresh food."],
  school: ["My kids take two buses to school.", "Need a primary school in our town."],
  school1: ["Need a primary school in our town.", "Our little ones walk so far to school!"],
  school2: ["My teenager travels an hour to secondary school.", "Need a secondary school around here."],
  school3: ["No polytechnic or university nearby for our grown-up kids.", "Young people have to leave the region to study further."],
  health: ["Queue at the clinic is so long.", "Need a polyclinic nearby."],
  safety: ["Got some break-ins recently. Need a police post.", "Worried about fires. No fire station near us."],
  transport: ["Bus so slow and crowded!", "When is the MRT coming to our town?", "Need more roads, the jam is terrible."],
  green: ["No park for the kids to play.", "Too much concrete, need more trees."],
  community: ["Don't know our neighbours any more.", "Need a community centre for activities."],
  environment: ["The factory smoke is everywhere!", "Air smells bad near the industrial area."],
};

export const PRAISE = ["Our town is getting better and better!", "Love the new hawker centre!", "Good place to raise a family.", "The new flats are so nice!"];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const GLOBAL_EVENTS = [
  { year: 1965, month: 7, text: "🇸🇬 9 Aug 1965: Singapore is independent! You are mayor of your region. Kampong families are waiting for modern homes." },
  { year: 1966, month: 0, text: "🏢 HDB slab blocks can now be built: far more homes per lot than emergency flats." },
  { year: 1975, month: 0, text: "🏢 Taller HDB point blocks are now possible." },
  { year: 1980, month: 0, text: "🏢 New Generation flats arrive: bigger homes, better design." },
  { year: 1987, month: 0, text: "🚇 MRT technology arrives! Lay track, then build stations beside it." },
  { year: 1989, month: 0, text: "🔧 Upgrading is available: use 🏗️ Renew on old HDB blocks to modernise them." },
  { year: 1995, month: 0, text: "🏗️ En bloc redevelopment (SERS) is available: rebuild old estates into modern ones." },
  { year: 2008, month: 0, text: "🏙️ BTO sky towers can now be built." },
];

export const RANDOM_EVENTS = [
  { id: "kfire", chance: 0.012, text: "🔥 A fire swept through {kampong}! Families need new homes urgently.", kampongFire: true },
  { id: "recession", chance: 0.008, minYear: 1970, months: 12, text: "📉 Global recession! Business income falls for a year.", effect: { business: 0.7 } },
  { id: "boom", chance: 0.008, minYear: 1970, months: 12, text: "📈 Investment boom! Firms want offices and factories.", effect: { comDemand: 0.4, indDemand: 0.4 } },
  { id: "flood", chance: 0.008, minYear: 1965, text: "🌧️ Flash floods! Drain repairs cost money.", cost: 500 },
  { id: "festival", chance: 0.01, minYear: 1970, months: 2, text: "🎉 Festive season! Residents are in a good mood.", effect: { mood: 3 } },
  { id: "dengue", chance: 0.008, minYear: 1965, months: 4, text: "🦟 Dengue cluster! Towns without clinics get unhappy.", effect: { health: 0.7 } },
];
