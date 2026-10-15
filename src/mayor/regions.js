// The four regions you can govern. Shapes are authored in screen-aligned
// coordinates (e = east, s = south, in world units around the map centre)
// and converted to world x/y. The map is 64 × 64 world units (~3.2 km).

export const MAP = 64;
const R2 = Math.SQRT1_2;
export const es2w = (e, s) => [MAP / 2 + (e + s) * R2, MAP / 2 + (s - e) * R2];
export const w2es = (x, y) => [((x - MAP / 2) - (y - MAP / 2)) * R2, ((x - MAP / 2) + (y - MAP / 2)) * R2];

const wave = (v, a, f, p = 0) => a * Math.sin(v * f + p);

export const REGIONS = {
  east: {
    id: "east",
    name: "Tampines / Changi",
    short: "East",
    icon: "✈️",
    blurb: "Kampongs and coconut groves by the sea. Build the new towns of Tampines and Pasir Ris, reclaim the East Coast and make room for Changi Airport.",
    tip: "Good for beginners: lots of open land.",
    land: (e, s, n) => {
      const south = 22 + wave(e, 2.5, 0.16) - Math.max(0, e - 16) * 0.55 - s;
      const north = s - (-30 + wave(e, 2, 0.2, 1) + Math.max(0, e - 8) * 0.45);
      const tip = 37 - e - Math.abs(s - 1) * 0.35;
      let v = Math.min(south, north, tip);
      v = Math.max(v, 4.5 - Math.hypot((e - 20) / 1.6, s + 32)); // Pulau Ubin
      return v + n * 2.2;
    },
    fresh: [
      { kind: "river", w: 0.7, path: [[-6, -4], [-3, -10], [0, -15], [2, -21]] },
      { kind: "lake", e: -16, s: 3, rx: 3, ry: 2 },
    ],
    towns: [
      { name: "Bedok", e: -18, s: 9 },
      { name: "Tampines", e: -9, s: -5 },
      { name: "Pasir Ris", e: 7, s: -15 },
      { name: "Changi", e: 22, s: 2 },
    ],
    kampongs: [
      { name: "Kampong Chai Chee", e: -14, s: 9, r: 3.2, pop: 600 },
      { name: "Kampong Tampines", e: -6, s: -6, r: 3.6, pop: 700 },
      { name: "Kampong Loyang", e: 10, s: -12, r: 3, pop: 450 },
      { name: "Changi Village", e: 27, s: -3, r: 2.4, pop: 400 },
      { name: "Kampong Bedok Laut", e: -24, s: 13, r: 2.6, pop: 380 },
    ],
    roads: [
      [[-44, 6], [-10, 3], [24, 2]],
      [[-8, 4], [-9, -6], [-2, -18]],
      [[24, 2], [28, -2], [30, -4]],
    ],
    oldTown: [{ e: -18, s: 5, r: 4, zone: "com" }],
    structs: [{ type: "airbase", e: 26, s: 6, ang: -0.78 }],
    landmarks: ["changiAirport", "eastCoastPark", "tampinesHub"],
    purposes: { Bedok: "residential", Tampines: "residential", "Pasir Ris": "residential", Changi: "mixed" },
    events: [
      { year: 1966, month: 2, text: "🏖️ The East Coast reclamation begins. Use 🏝️ Reclaim along the southern shore." },
      { year: 1971, month: 9, text: "🇬🇧 British forces leave the Changi base. The land is now yours to plan." },
      { year: 1975, month: 0, text: "🏙️ Tampines is chosen as a new town. HDB demand rises in the east." },
      { year: 1981, month: 0, text: "✈️ Changi Airport can now be built on the coast." },
    ],
  },
  west: {
    id: "west",
    name: "Jurong / Tuas",
    short: "West",
    icon: "🏭",
    blurb: "Swamps, farms and fishing villages. Turn Jurong into Singapore's industrial heartland, merge the southern islands into Jurong Island, and plan homes away from the smoke.",
    tip: "Industry-focused: balance jobs against pollution.",
    land: (e, s, n) => {
      const south = 17 + wave(e, 3, 0.18) + Math.max(0, -e - 18) * 0.35 - s;
      const west = e + 30 - wave(s, 2, 0.2);
      let v = Math.min(south, west);
      for (const [ie, is, r] of [[-12, 27, 3], [-4, 30, 3.4], [5, 28, 2.6], [12, 31, 2.2], [-19, 25, 2]]) v = Math.max(v, r - Math.hypot(e - ie, s - is));
      return v + n * 2;
    },
    // Johor across the western Strait (the Second Link crosses it from Tuas)
    foreign: (e, s, n) => -36.5 - e + wave(s, 1.2, 0.17, 1) + n * 1.2,
    fresh: [
      { kind: "lake", e: 12, s: -4, rx: 4.5, ry: 2.6 },
      { kind: "river", w: 0.8, path: [[12, -2], [10, 3], [8, 8], [7, 12]] },
      { kind: "river", w: 0.6, path: [[-24, -18], [-22, -8], [-26, 2], [-30, 8]] },
    ],
    towns: [
      { name: "Jurong East", e: 18, s: -10 },
      { name: "Jurong West", e: -6, s: -10 },
      { name: "Boon Lay", e: -8, s: 3 },
      { name: "Tuas", e: -22, s: 0 },
    ],
    kampongs: [
      { name: "Kampong Ulu Jurong", e: -4, s: -14, r: 3.4, pop: 550 },
      { name: "Kampong Tebing Terjun", e: -14, s: 5, r: 3, pop: 420 },
      { name: "Kampong Tuas", e: -24, s: 5, r: 2.8, pop: 380 },
      { name: "Kampong Jurong", e: 6, s: 4, r: 2.8, pop: 400 },
    ],
    roads: [
      [[44, -8], [10, -9], [-26, -2]],
      [[2, -9], [0, 0], [-2, 8]],
    ],
    oldTown: [{ e: 6, s: -9, r: 3, zone: "com" }],
    structs: [],
    landmarks: ["birdPark", "scienceCentre", "secondLink", "jurongIsland", "tuasPort"],
    purposes: { "Jurong East": "mixed", "Jurong West": "residential", "Boon Lay": "industrial", Tuas: "industrial" },
    events: [
      { year: 1968, month: 5, text: "🏭 JTC is formed to run the Jurong Industrial Estate. Factories want to come west." },
      { year: 1971, month: 0, text: "🦜 Jurong Bird Park can now be built." },
      { year: 1995, month: 0, text: "🏝️ Plans begin to merge the southern islands into Jurong Island. Reclaim between them." },
      { year: 1998, month: 0, text: "🌉 The Tuas Second Link to Johor can now be built on the western shore. More trade, and an easier crossing than the Causeway." },
    ],
    indBoost: 0.35,
  },
  central: {
    id: "central",
    name: "Central / CBD / Orchard",
    short: "Central",
    icon: "🏙️",
    blurb: "A crowded old town of shophouses along the Singapore River. Clean up the river, renew the city centre carefully, and reclaim Marina Bay for a new downtown.",
    tip: "Hardest start: little free land, lots of old buildings.",
    land: (e, s, n) => {
      const coast = 15 + wave(e, 2, 0.2) - Math.max(0, e - 2) * 0.5 - s;
      const east = 30 - e - Math.max(0, -s) * 0.2;
      let v = Math.min(coast, east);
      v = Math.max(v, 2.4 - Math.hypot(e - 22, s - 20)); // a small island
      return v + n * 1.4;
    },
    fresh: [
      { kind: "river", w: 1.0, path: [[-22, -6], [-12, -4], [-4, 0], [2, 3], [6, 6]] },
      { kind: "river", w: 0.8, path: [[10, -24], [14, -14], [17, -6], [19, -2]] },
    ],
    towns: [
      { name: "Orchard", e: -18, s: -12 },
      { name: "Chinatown", e: -6, s: 8 },
      { name: "Downtown", e: 6, s: -2 },
      { name: "Kallang", e: 18, s: -14 },
    ],
    kampongs: [
      { name: "Kampong Bugis", e: 16, s: -8, r: 2.6, pop: 500 },
      { name: "Kampong Bahru", e: -16, s: 12, r: 2.6, pop: 420 },
      { name: "Kampong Kapor", e: 2, s: -18, r: 2.4, pop: 380 },
    ],
    roads: [
      [[-40, -14], [-20, -14], [0, -8]],
      [[0, -8], [6, -4], [10, 2]],
      [[-14, -14], [-12, -2], [-10, 12]],
      [[-10, 12], [-2, 8], [4, 8]],
      [[0, -8], [-2, -2], [-6, 4]],
      [[8, -22], [6, -14], [0, -8]],
    ],
    oldTown: [
      { e: -6, s: 6, r: 6, zone: "com" },
      { e: 2, s: -4, r: 4, zone: "com" },
    ],
    structs: [],
    landmarks: ["merlion", "esplanade", "marinaBaySands", "gardensBay"],
    purposes: { Orchard: "commercial", Chinatown: "heritage", Downtown: "commercial", Kallang: "residential" },
    events: [
      { year: 1977, month: 0, text: "🛶 The Singapore River clean-up begins. Parks along the river now raise land value more." },
      { year: 1989, month: 0, text: "🏮 Conservation starts: old shophouses you keep now earn tourism money." },
      { year: 1992, month: 0, text: "🌊 Marina Bay reclamation is under way. Reclaim the bay for a new downtown." },
    ],
    heritage: true,
  },
  north: {
    id: "north",
    name: "Woodlands / Causeway",
    short: "North",
    icon: "🌉",
    blurb: "Rubber estates and kampongs facing Johor across the Strait. Grow Woodlands into the northern gateway, manage Causeway traffic and protect the mangroves.",
    tip: "Gateway region: trade income from the Causeway.",
    land: (e, s, n) => {
      const strait = s - (-17 + wave(e, 2.5, 0.15));
      let v = strait;
      return v + n * 1.8;
    },
    // Johor across the Strait: shown as land, but not yours to build on
    foreign: (e, s, n) => -26 + wave(e, 2, 0.13, 2) - s + n * 1.5,
    fresh: [
      { kind: "lake", e: -24, s: -2, rx: 4, ry: 2.4 },
      { kind: "river", w: 0.7, path: [[14, 20], [12, 8], [10, -2], [11, -9]] },
    ],
    towns: [
      { name: "Kranji", e: -24, s: 6 },
      { name: "Woodlands", e: -4, s: -4 },
      { name: "Sembawang", e: 16, s: -4 },
      { name: "Yishun", e: 12, s: 12 },
    ],
    kampongs: [
      { name: "Kampong Mandai", e: -12, s: 8, r: 3.2, pop: 520 },
      { name: "Kampong Sembawang", e: 20, s: 2, r: 3, pop: 460 },
      { name: "Kampong Kranji", e: -28, s: 12, r: 2.8, pop: 380 },
      { name: "Kampong Chye Kay", e: 6, s: 18, r: 3, pop: 420 },
    ],
    roads: [
      [[-6, -17], [-6, -9], [-6, -2]],
      [[-6, -2], [-6, 14], [-4, 30]],
      [[-6, -2], [8, -2], [22, -6]],
    ],
    causeway: [[-6, -17], [-6, -26]],
    oldTown: [{ e: -6, s: -5, r: 2.5, zone: "com" }],
    // on the Strait shore, as the real one is: placed on the nearest bit of coast
    structs: [{ type: "navalBase", e: 18, s: -12.5, ang: -0.78, shore: [0, -1] }],
    landmarks: ["checkpoint", "causewayPoint", "sungeiBuloh", "rtsLink"],
    purposes: { Kranji: "industrial", Woodlands: "mixed", Sembawang: "residential", Yishun: "residential" },
    events: [
      { year: 1971, month: 9, text: "⚓ The British leave Sembawang naval base. It becomes a shipyard." },
      { year: 1980, month: 0, text: "🏙️ Woodlands is planned as a new town. HDB demand rises in the north." },
      { year: 1998, month: 0, text: "🛍️ Causeway Point mall can now be built." },
      { year: 1999, month: 0, text: "🛂 Woodlands Checkpoint can now be built." },
    ],
    causewayTrade: 120,
  },
  south: {
    id: "south",
    name: "Telok Blangah / Sentosa",
    short: "South",
    icon: "🏝️",
    blurb: "Keppel Harbour, the hills of Mount Faber and the old fortress island of Blakang Mati. Build homes on the mainland, a port at HarbourFront, and turn the island into Sentosa, a resort run on visitors.",
    tip: "Tourism region: Sentosa has its own visitor economy.",
    land: (e, s, n) => {
      let v = 6 + wave(e, 1.6, 0.21) + Math.max(0, e - 22) * 0.25 - s; // mainland coast
      v = Math.max(v, (1 - Math.hypot((e + 1.5) / 16.5, (s - 20.5) / 6.8)) * 6.8); // Sentosa
      v = Math.max(v, 2.2 - Math.hypot(e - 16, s - 12)); // Pulau Brani
      return v + n * 1.6;
    },
    fresh: [{ kind: "river", w: 0.7, path: [[-24, -30], [-21, -16], [-19, -6], [-19, 4]] }],
    towns: [
      { name: "Bukit Merah", e: -12, s: -14 },
      { name: "Telok Blangah", e: -2, s: -3 },
      { name: "HarbourFront", e: 14, s: -2 },
      { name: "Sentosa", e: -1.5, s: 20.5, resort: true },
    ],
    kampongs: [
      { name: "Kampong Henderson", e: -9, s: -6, r: 3, pop: 520 },
      { name: "Kampong Radin Mas", e: 6, s: -10, r: 2.8, pop: 460 },
      { name: "Kampong Bukit Merah", e: -18, s: -18, r: 3, pop: 480 },
      { name: "Kampong Serapong", e: 8, s: 23.5, r: 1.8, pop: 200 },
    ],
    roads: [
      [[-44, 2], [-6, 1], [30, 2]],
      [[-6, 1], [-9, -12], [-12, -34]],
      // Sentosa: a ring road with a spine and cross streets
      [[-14, 18], [-2, 15], [11, 18]],
      [[11, 23], [-1, 26.5], [-14, 23]],
      [[-14, 18], [-17, 20.5], [-14, 23]],
      [[11, 18], [14, 20.5], [11, 23]],
      [[-15.5, 20.5], [-1.5, 20.5], [12.5, 20.5]],
      [[-7, 16.4], [-7, 20.5], [-7, 25]],
      [[4, 16.4], [4, 20.5], [4, 25.4]],
    ],
    oldTown: [{ e: 2, s: -2, r: 3, zone: "com" }],
    structs: [{ type: "fortSiloso", e: -16.5, s: 17, ang: -0.78 }],
    landmarks: ["mountFaber", "keppelPort", "cableCar", "sentosaBeach", "underwaterWorld", "sentosaBridge", "vivoCity", "sentosaExpress", "resortsWorld"],
    purposes: { "Bukit Merah": "residential", "Telok Blangah": "mixed", HarbourFront: "commercial", Sentosa: "resort" },
    events: [
      { year: 1967, month: 6, text: "🏰 The British are handing back Pulau Blakang Mati. Its forts and beaches could become a resort." },
      { year: 1972, month: 8, text: "🏝️ Blakang Mati is renamed Sentosa ('peace and tranquillity'). The Sentosa Development Corporation is yours to run: tap 🏝️ to manage visitors." },
      { year: 1974, month: 0, text: "🚡 The Singapore Cable Car can now be built: the first easy way onto Sentosa." },
      { year: 1992, month: 0, text: "🌉 A road bridge to Sentosa can now be built." },
      { year: 2006, month: 0, text: "🛍️ VivoCity can now be built at HarbourFront." },
      { year: 2010, month: 0, text: "🎢 Resorts World Sentosa (casino, Universal Studios) can now be built on the island." },
    ],
    sentosa: true,
    indBoost: 0.1,
  },
};

export const REGION_ORDER = ["east", "west", "central", "south", "north"];
