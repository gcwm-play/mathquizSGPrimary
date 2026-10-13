// Crises (real ones on their real dates, imagined ones in the future) and
// random dilemmas that ask the mayor to choose between trade-offs.
// Everything stored in the save is plain data (ids); behaviour lives here.
import { clamp } from "./geom.js";
import { LOT_TYPES } from "./defs.js";
import { charge, noteImpact } from "./world.js";

const MULT = ["business", "tourism", "trade", "land", "jobs", "health", "upkeep", "growth"];
export const EFFECT_ADD = ["mood", "comDemand", "indDemand", "life", "fert"];

// how big the region is, to scale costs and gains
export const scaleOf = (w) => clamp((w.stats?.pop || 0) / 25000, 0.6, 10);

const popAvg = (A, k) => {
  let s = 0;
  let n = 0;
  for (const t of A.towns) {
    const p = t.pop + t.kpop;
    s += (t.needs[k] ?? 50) * p;
    n += p;
  }
  return n ? s / n : 50;
};
const coverShare = (A, k) => clamp((popAvg(A, k) - 20) / 70, 0, 1);
const reserveMonths = (w) => {
  const spend = (w.ledger ? Object.values(w.ledger.exp).reduce((a, b) => a + b, 0) : 300) || 300;
  return w.cash / spend;
};
const reserveShare = (w) => clamp(reserveMonths(w) / 36, 0, 1);
const jobShare = (A) => clamp(1 - A.unemployment * 6, 0, 1);
const hitechShare = (w) => {
  let hi = 0;
  let all = 0;
  for (const l of w.lots) {
    if (!l.b || l.b.state === "build") continue;
    const T = LOT_TYPES[l.b.type];
    if (!T.jobs) continue;
    all += T.jobs;
    if (["hitech", "office", "mixed", "mall"].includes(l.b.type)) hi += T.jobs;
  }
  return all ? hi / all : 0;
};

// ---------------- crises ----------------
export const CRISES = {
  withdrawal: {
    name: "British military withdrawal",
    icon: "🎖️",
    year: 1968,
    month: 0,
    months: 42,
    text: "Britain announces it will pull its forces out by 1971. The bases employ about a fifth of the workforce, and those jobs are about to vanish.",
    effect: { jobs: 0.82, business: 0.9, mood: -2 },
    mitigate: { label: "Jobs available for base workers", fn: (w, A) => clamp(((A.indJobs + A.comJobs) / Math.max(1, A.workforce) - 0.35) / 0.6, 0, 1) },
    hint: "Zone industry and shops so laid-off workers find new jobs.",
    choices: [
      { id: "estates", label: "Turn base land into industrial estates", pros: ["Factory demand surges", "Long-term jobs"], cons: ["Costly site works"], cost: 900, effect: { indDemand: 0.5, months: 36 }, crisis: 0.85, rep: 3, log: "turned old military land into industrial estates" },
      { id: "retrain", label: "Retrain base workers", pros: ["Softens job losses", "Trust rises"], cons: ["Costs a lot up front"], cost: 600, crisis: 0.7, trust: 4, log: "retrained laid-off base workers" },
      { id: "wait", label: "Let the market sort it out", pros: ["Costs nothing"], cons: ["Workers feel abandoned"], angerAll: 0.8, crisis: 1.15, log: "left base workers to fend for themselves", tone: "bad" },
    ],
    mid: {
      after: 18,
      title: "The naval dockyard",
      text: "The last dockyard staff are leaving. A shipbuilder offers to take it over if you cut its rates.",
      choices: [
        { id: "yes", label: "Cut the rates, keep the yard", pros: ["Saves 2,000 jobs"], cons: ["Less business tax for years"], effect: { business: 0.95, jobs: 1.06, months: 60 }, crisis: 0.8, log: "kept the old dockyard working as a shipyard" },
        { id: "no", label: "Sell the land instead", pros: ["Big one-off land sale"], cons: ["Jobs lost"], gain: 800, crisis: 1.1, angerAll: 0.4 },
      ],
    },
    end: "The last British troops have left. {result}",
  },
  oil: {
    name: "1973 oil crisis",
    icon: "🛢️",
    year: 1973,
    month: 9,
    months: 18,
    text: "Oil prices have quadrupled overnight. Petrol, electricity and transport costs are soaring.",
    effect: { business: 0.82, upkeep: 1.18, mood: -2 },
    mitigate: { label: "Homes near buses or MRT", fn: (w, A) => coverShare(A, "transport") },
    hint: "Good bus coverage means people can leave the car at home.",
    choices: [
      { id: "subsidise", label: "Subsidise bus fares", pros: ["Residents happier", "Fewer cars"], cons: ["Expensive"], cost: 700, mood: [3, 18], crisis: 0.8, log: "subsidised bus fares during the oil shock" },
      { id: "ration", label: "Car-free Sundays & lights out early", pros: ["Cheap", "Cuts costs fast"], cons: ["People grumble"], mood: [-2, 12], crisis: 0.7, log: "ran car-free Sundays to save fuel" },
      { id: "pass", label: "Pass costs on to residents", pros: ["Protects the budget"], cons: ["Cost of living bites"], gain: 400, angerAll: 0.6, needs: { cost: -12, months: 18 }, tone: "bad", log: "passed fuel costs on to residents" },
    ],
    end: "Oil prices have settled. {result}",
  },
  recession85: {
    name: "1985 recession",
    icon: "📉",
    year: 1985,
    month: 2,
    months: 24,
    text: "Singapore's first recession since independence. Wages rose too fast and orders are drying up.",
    effect: { business: 0.75, jobs: 0.9, comDemand: -0.4, indDemand: -0.3, land: 0.6 },
    mitigate: { label: "Healthy reserves", fn: (w) => reserveShare(w) },
    hint: "Reserves let you keep spending while income falls.",
    choices: [
      { id: "costs", label: "Cut business costs (wage restraint)", pros: ["Firms recover faster"], cons: ["Workers take a pay cut"], crisis: 0.6, mood: [-3, 12], log: "cut business costs to beat the 1985 recession" },
      { id: "build", label: "Spend on public works", pros: ["Keeps people working", "Trust rises"], cons: ["Drains reserves"], cost: 1400, crisis: 0.75, trust: 4, effect: { comDemand: 0.3, months: 24 }, log: "spent on public works to keep people employed" },
      { id: "tax", label: "Raise taxes to stay balanced", pros: ["Budget stays healthy"], cons: ["Everyone is angry"], gain: 900, angerAll: 1, tone: "bad", log: "raised taxes in the middle of a recession" },
    ],
    end: "The economy is growing again. {result}",
  },
  afc: {
    name: "Asian financial crisis",
    icon: "💱",
    year: 1997,
    month: 6,
    months: 24,
    text: "Currencies across Asia are collapsing. Property prices are falling and tourists are staying away.",
    effect: { business: 0.8, tourism: 0.65, trade: 0.8, land: 0.5, jobs: 0.94 },
    mitigate: { label: "Healthy reserves", fn: (w) => reserveShare(w) },
    hint: "Reserves let you ride it out without cutting services.",
    choices: [
      { id: "rebate", label: "S&CC and rent rebates", pros: ["Residents feel looked after"], cons: ["Costly"], cost: 1100, mood: [4, 18], trust: 3, log: "gave rebates during the Asian financial crisis" },
      { id: "defer", label: "Defer new HDB projects", pros: ["Saves money now"], cons: ["Housing queue grows"], gain: 1000, waitlist: 1500, tone: "bad", log: "put new flats on hold during the crisis" },
      { id: "invest", label: "Invest in hi-tech parks", pros: ["Builds future jobs"], cons: ["Payoff is slow"], cost: 900, effect: { indDemand: 0.35, comDemand: 0.2, months: 48 }, crisis: 0.85, rep: 3, log: "invested in hi-tech parks during the downturn" },
    ],
    end: "Asia is recovering. {result}",
  },
  sars: {
    name: "SARS outbreak",
    icon: "😷",
    year: 2003,
    month: 2,
    months: 5,
    text: "A new respiratory virus is spreading through hospitals. Tourists are cancelling and people are afraid to go out.",
    effect: { tourism: 0.35, business: 0.85, health: 0.7, mood: -3, life: 0.3 },
    mitigate: { label: "Homes near clinics & hospitals", fn: (w, A) => coverShare(A, "health") },
    hint: "Polyclinics and hospitals near homes catch cases early.",
    choices: [
      { id: "strict", label: "Strict quarantine & temperature checks", pros: ["Outbreak ends sooner"], cons: ["Costly", "Shops suffer"], cost: 500, crisis: 0.55, effect: { business: 0.95, months: 4 }, rep: 4, log: "ran strict quarantine and screening during SARS" },
      { id: "relief", label: "Relief for hawkers & taxi drivers", pros: ["Small businesses survive"], cons: ["Doesn't stop the virus"], cost: 400, mood: [3, 8], log: "helped hawkers and taxi drivers through SARS" },
      { id: "open", label: "Keep everything open", pros: ["Business keeps going"], cons: ["Virus spreads further"], crisis: 1.4, tone: "bad", log: "kept everything open during SARS" },
    ],
    mid: {
      after: 2,
      title: "Hospital is overwhelmed",
      text: "Doctors are exhausted and wards are full.",
      choices: [
        { id: "wards", label: "Build temporary isolation wards", pros: ["Saves lives"], cons: ["Costly"], cost: 450, crisis: 0.75, rep: 2 },
        { id: "volunteers", label: "Call for volunteers", pros: ["Free", "Community spirit"], cons: ["Risky for volunteers"], needs: { community: 8, months: 24 }, crisis: 0.9 },
      ],
    },
    end: "SARS is over. {result}",
  },
  gfc: {
    name: "Global financial crisis",
    icon: "🏦",
    year: 2008,
    month: 8,
    months: 18,
    text: "Banks are failing worldwide. Exports are plunging and firms are planning layoffs.",
    effect: { business: 0.8, trade: 0.7, land: 0.5, jobs: 0.92, comDemand: -0.3 },
    mitigate: { label: "Reserves and hi-tech jobs", fn: (w) => clamp(reserveShare(w) * 0.6 + hitechShare(w) * 0.8, 0, 1) },
    hint: "Reserves and modern industries soften the blow.",
    choices: [
      { id: "jobs", label: "Jobs Credit for employers", pros: ["Fewer layoffs"], cons: ["Very expensive"], cost: 1600, crisis: 0.6, trust: 4, log: "paid a Jobs Credit to stop layoffs in 2008" },
      { id: "skills", label: "Free skills courses", pros: ["Better workers later"], cons: ["Layoffs still happen"], cost: 600, crisis: 0.85, effect: { business: 1.05, months: 60 }, log: "ran free skills courses through the 2008 crisis" },
      { id: "cut", label: "Cut services to save money", pros: ["Budget protected"], cons: ["Services suffer"], gain: 900, needs: { community: -10, safety: -6, months: 24 }, tone: "bad", log: "cut services during the 2008 crisis" },
    ],
    end: "The global economy is recovering. {result}",
  },
  covid: {
    name: "COVID-19 pandemic",
    icon: "🦠",
    year: 2020,
    month: 1,
    months: 26,
    text: "A new coronavirus is sweeping the world. Borders are closing and cases are rising in the dormitories and estates.",
    effect: { tourism: 0.15, business: 0.75, health: 0.7, jobs: 0.92, mood: -4, life: 0.4, growth: 0.7 },
    mitigate: { label: "Clinics, hospitals and parks near homes", fn: (w, A) => clamp(coverShare(A, "health") * 0.75 + coverShare(A, "green") * 0.35, 0, 1) },
    hint: "Healthcare nearby keeps people safe; parks keep them sane.",
    choices: [
      { id: "test", label: "Mass testing & contact tracing", pros: ["Outbreaks caught early"], cons: ["Expensive"], cost: 1200, crisis: 0.7, rep: 3, log: "rolled out mass testing during COVID-19" },
      { id: "support", label: "Wage support & food vouchers", pros: ["Families get by"], cons: ["Huge cost"], cost: 1800, mood: [5, 18], trust: 5, log: "gave wage support and vouchers during COVID-19" },
      { id: "light", label: "Light touch: masks only", pros: ["Cheap", "Economy stays open"], cons: ["More people fall sick"], crisis: 1.3, tone: "bad", log: "took a light-touch approach to COVID-19" },
    ],
    mid: {
      after: 2,
      title: "Circuit breaker?",
      text: "Cases are doubling every week. Your health advisers want a two-month lockdown.",
      choices: [
        { id: "lockdown", label: "Circuit breaker: close schools & shops", pros: ["Cases fall fast"], cons: ["Business crashes for 2 months", "Cabin fever"], crisis: 0.6, effect: { business: 0.7, mood: -2, months: 2 }, rep: 2 },
        { id: "partial", label: "Safe distancing only", pros: ["Shops stay open"], cons: ["Cases keep rising"], crisis: 1.1 },
      ],
      second: {
        after: 10,
        title: "Vaccines are here",
        text: "Vaccines have arrived. How hard should you push?",
        choices: [
          { id: "drive", label: "Vaccination centres in every town", pros: ["Pandemic ends sooner"], cons: ["Costly"], cost: 700, crisisMonths: -8, rep: 2, log: "set up vaccination centres in every town" },
          { id: "voluntary", label: "Let people go to clinics", pros: ["Cheap"], cons: ["Slower"], crisisMonths: -2 },
        ],
      },
    },
    end: "COVID-19 has become endemic. {result}",
  },
  // ---- imagined futures, scheduled randomly after 2026 ----
  seas: {
    name: "King tides & rising seas",
    icon: "🌊",
    future: true,
    months: 14,
    text: "Record king tides are flooding low-lying estates. Climate scientists warn it will get worse every decade.",
    effect: { business: 0.9, upkeep: 1.25, mood: -2 },
    mitigate: { label: "Parks and green buffers", fn: (w, A) => coverShare(A, "green") },
    hint: "Parks and greenery soak up floodwater.",
    choices: [
      { id: "walls", label: "Build polders and sea walls", pros: ["Protects homes for decades"], cons: ["Very expensive"], cost: 2500, crisis: 0.4, rep: 5, policy: { seawall: 1 }, log: "built sea walls against rising seas" },
      { id: "green", label: "Sponge parks & mangroves", pros: ["Greener towns"], cons: ["Only partial protection"], cost: 1200, crisis: 0.7, needs: { green: 10, months: 120, all: true }, log: "planted mangroves and sponge parks against floods" },
      { id: "patch", label: "Patch and pump", pros: ["Cheap for now"], cons: ["Floods will return"], crisis: 1.2, tone: "bad", log: "patched flood damage without fixing the cause" },
    ],
    end: "The flood season has passed. {result}",
  },
  ageing: {
    name: "Super-aged society",
    icon: "👵",
    future: true,
    months: 36,
    text: "One in four residents is now over 65. Clinics are full and many old folks live alone.",
    effect: { health: 0.8, jobs: 1.03, business: 0.92, life: 0.2 },
    mitigate: { label: "Homes near clinics & community centres", fn: (w, A) => clamp(coverShare(A, "health") * 0.6 + coverShare(A, "community") * 0.5, 0, 1) },
    hint: "Polyclinics and community centres let seniors age in place.",
    choices: [
      { id: "kampong", label: "Build 'kampong admiralty' senior hubs", pros: ["Seniors thrive", "Big reputation boost"], cons: ["Costly"], cost: 1600, crisis: 0.55, rep: 5, needs: { community: 10, months: 120, all: true }, log: "built senior-friendly 'vertical kampong' hubs" },
      { id: "carers", label: "Import foreign caregivers", pros: ["Quick help"], cons: ["Locals worry about jobs"], crisis: 0.8, angerAll: 0.4, waitlist: 600 },
      { id: "family", label: "Leave it to families", pros: ["Costs nothing"], cons: ["Families stretched"], crisis: 1.2, fert: -0.03, tone: "bad", log: "left elderly care to families" },
    ],
    end: "Your towns have adapted to an older population. {result}",
  },
  pandemicX: {
    name: "Pandemic X",
    icon: "🧬",
    future: true,
    months: 15,
    text: "A new virus is spreading fast. Remembering COVID, residents want decisive action.",
    effect: { tourism: 0.3, business: 0.8, health: 0.7, mood: -3, life: 0.3 },
    mitigate: { label: "Homes near clinics & hospitals", fn: (w, A) => coverShare(A, "health") },
    hint: "Healthcare nearby keeps people safe.",
    choices: [
      { id: "early", label: "Close borders early", pros: ["Fewer cases"], cons: ["Tourism and trade crash"], crisis: 0.55, effect: { tourism: 0.5, trade: 0.85, months: 8 }, rep: 3, log: "closed borders early against Pandemic X" },
      { id: "stockpile", label: "Release the PPE stockpile", pros: ["Hospitals cope"], cons: ["Costly to refill"], cost: 900, crisis: 0.75, log: "used the PPE stockpile in Pandemic X" },
      { id: "wait", label: "Wait and see", pros: ["No cost now"], cons: ["Could get much worse"], crisis: 1.35, tone: "bad", log: "waited too long on Pandemic X" },
    ],
    end: "Pandemic X is under control. {result}",
  },
  aiJobs: {
    name: "AI automation shock",
    icon: "🤖",
    future: true,
    months: 30,
    text: "Robots and AI are replacing office and factory jobs faster than anyone predicted.",
    effect: { jobs: 0.86, business: 1.05, mood: -2 },
    mitigate: { label: "Hi-tech jobs and good schools", fn: (w, A) => clamp(hitechShare(w) * 0.8 + coverShare(A, "school") * 0.4, 0, 1) },
    hint: "Hi-tech parks and schools help people move to new jobs.",
    choices: [
      { id: "reskill", label: "Lifelong-learning credits for all", pros: ["People move to new jobs"], cons: ["Costly"], cost: 1500, crisis: 0.55, rep: 4, log: "gave every worker lifelong-learning credits" },
      { id: "robottax", label: "Tax the robots", pros: ["Funds support payments"], cons: ["Firms may leave"], gain: 1200, effect: { indDemand: -0.2, comDemand: -0.2, months: 36 }, crisis: 0.85 },
      { id: "embrace", label: "Go all in on automation", pros: ["Business booms"], cons: ["Inequality rises"], effect: { business: 1.15, months: 48 }, crisis: 1.2, angerAll: 0.6, log: "went all-in on automation" },
    ],
    end: "The economy has adjusted to AI. {result}",
  },
  energy: {
    name: "Regional energy shock",
    icon: "⚡",
    future: true,
    months: 15,
    text: "A conflict abroad has cut gas supplies. Electricity bills are doubling.",
    effect: { business: 0.85, upkeep: 1.2, mood: -2 },
    mitigate: { label: "Homes near buses or MRT", fn: (w, A) => coverShare(A, "transport") },
    hint: "Public transport cuts fuel use.",
    choices: [
      { id: "solar", label: "Solar panels on every HDB roof", pros: ["Lower bills for decades"], cons: ["Up-front cost"], cost: 1400, crisis: 0.6, rep: 4, effect: { upkeep: 0.95, months: 240 }, log: "put solar panels on every HDB roof" },
      { id: "rebate", label: "U-Save rebates on bills", pros: ["Families protected"], cons: ["Costly, temporary"], cost: 800, mood: [3, 12] },
      { id: "nothing", label: "Ride it out", pros: ["Free"], cons: ["Families struggle"], needs: { cost: -12, months: 15 }, tone: "bad" },
    ],
    end: "Energy prices have eased. {result}",
  },
};
export const HISTORIC = ["withdrawal", "oil", "recession85", "afc", "sars", "gfc", "covid"];
export const FUTURE = ["seas", "ageing", "pandemicX", "aiJobs", "energy"];

// ---------------- dilemmas ----------------
// town: how the affected town is chosen: "worst:<need>", "random", "biggest", "kampong" or none
export const DILEMMAS = [
  {
    id: "hawkers", icon: "🍢", title: "Street hawkers", from: 1966, to: 1990, town: "random",
    text: (c) => `Hundreds of street hawkers line the roads of ${c.town}. They're cheap and popular, but block traffic and dirty the drains.`,
    options: [
      { id: "move", label: "Move them into a hawker centre", pros: ["Cleaner streets", "Food stays cheap"], cons: ["Costly", "Some hawkers upset"], cost: 450, anger: 0.4, needs: { food: 12, environment: 6, months: 120 }, log: "moved {town}'s street hawkers into hawker centres" },
      { id: "license", label: "License them where they are", pros: ["Cheap", "Popular"], cons: ["Streets stay messy"], gain: 80, needs: { environment: -6, months: 60 } },
      { id: "ban", label: "Ban street hawking", pros: ["Cleanest streets"], cons: ["Food harder to find", "Very unpopular"], anger: 1.5, needs: { food: -10, months: 36 }, tone: "bad" },
    ],
  },
  {
    id: "stopAtTwo", icon: "👨‍👩‍👧", title: "Stop at Two?", from: 1969, to: 1980,
    text: () => "The national planners want every region to push the 'Stop at Two' campaign so families stay small and housing can catch up.",
    options: [
      { id: "push", label: "Promote it hard", pros: ["Housing queue grows slower"], cons: ["Fewer babies for decades"], growth: true, effect: { growth: 0.85, months: 120 }, fert: -0.08, log: "pushed the Stop at Two campaign" },
      { id: "soft", label: "Mention it gently", pros: ["Balanced"], cons: ["Planners unimpressed"], fert: -0.02, trust: -1 },
    ],
  },
  {
    id: "pigs", icon: "🐖", title: "Pig farms", from: 1975, to: 1990, cond: (w) => w.lots.some((l) => l.b?.type === "farm"),
    text: () => "Pig farms are polluting rivers and reservoirs. Phasing them out would cost farmers their livelihood.",
    options: [
      { id: "phase", label: "Phase out pig farming", pros: ["Cleaner water and air"], cons: ["Farmers need compensation"], cost: 500, closeFarms: true, needs: { environment: 10, months: 240, all: true }, rep: 2, log: "phased out polluting pig farms" },
      { id: "keep", label: "Keep the farms", pros: ["Farmers stay happy", "Local food"], cons: ["Pollution"], needs: { environment: -6, months: 60, all: true } },
    ],
  },
  {
    id: "roadPricing", icon: "🚗", title: "Traffic jams", from: 1975, to: 2100, town: "worst:transport",
    text: (c) => `Rush-hour traffic in ${c.town} is crawling. Planners suggest charging cars to enter the busiest roads.`,
    options: [
      { id: "charge", label: "Introduce road pricing", pros: ["Traffic flows", "New income"], cons: ["Drivers are furious"], gainMonthly: 25, anger: 0.8, needs: { transport: 10, months: 240, all: true }, log: "introduced road pricing" },
      { id: "widen", label: "Widen the roads", pros: ["Drivers happy"], cons: ["Expensive", "Jams return later"], cost: 700, needs: { transport: 8, months: 60 } },
      { id: "buses", label: "More buses instead", pros: ["Cheaper", "Greener"], cons: ["Drivers still stuck"], cost: 300, needs: { transport: 6, months: 120 } },
    ],
  },
  {
    id: "casino", icon: "🎰", title: "Integrated resort", from: 2005, to: 2100,
    text: () => "A gaming company wants to build a casino resort in your region. It would bring huge tourism money, but critics fear gambling problems.",
    options: [
      { id: "yes", label: "Approve it with safeguards", pros: ["Big tourism income", "Jobs"], cons: ["Social problems", "Some voters object"], gainMonthly: 60, mood: [-2, 24], rep: -2, trust: -2, effect: { comDemand: 0.3, months: 60 }, log: "approved a casino resort", later: { months: 60, text: "Five years on, the casino brings steady income but problem gambling is up.", angerAll: 0.3 } },
      { id: "no", label: "Say no", pros: ["Residents relieved"], cons: ["Miss out on money"], trust: 2 },
    ],
  },
  {
    id: "dorm", icon: "🏗️", title: "Workers' dormitory", from: 1990, to: 2100, town: "biggest",
    text: (c) => `Builders need a dormitory for foreign construction workers. The only site is next to homes in ${c.town}.`,
    options: [
      { id: "build", label: "Build it there", pros: ["Construction speeds up"], cons: ["Residents object"], anger: 1, effect: { indDemand: 0.25, months: 36 }, fasterBuild: 24 },
      { id: "far", label: "Build it in the industrial zone", pros: ["No complaints"], cons: ["Costs more", "Cramped for workers"], cost: 450, rep: -1 },
      { id: "decent", label: "Build a decent dorm with clinic", pros: ["Workers well looked after", "Reputation"], cons: ["Most expensive"], cost: 800, rep: 3, fasterBuild: 24, log: "built a decent dormitory for foreign workers" },
    ],
  },
  {
    id: "nimby", icon: "🏥", title: "Nursing home next door", from: 1995, to: 2100, town: "biggest",
    text: (c) => `A nursing home is planned in ${c.town}. Neighbours say it will lower their flat prices and want it moved.`,
    options: [
      { id: "build", label: "Build it anyway", pros: ["Seniors cared for nearby", "Health"], cons: ["Neighbours annoyed"], cost: 400, anger: 0.7, needs: { health: 10, months: 180 }, rep: 2, log: "built a nursing home despite neighbours' objections" },
      { id: "move", label: "Move it somewhere else", pros: ["Neighbours happy"], cons: ["Seniors far from family"], cost: 250, needs: { health: 3, months: 120 } },
      { id: "cancel", label: "Cancel it", pros: ["Free"], cons: ["Seniors lose out"], rep: -2, tone: "bad" },
    ],
  },
  {
    id: "babyBonus", icon: "🍼", title: "Baby bonus", from: 1987, to: 2300, cond: (w) => (w.stats.tfr || 2) < 2,
    text: () => "Births are falling. You could give new parents cash and childcare help.",
    options: [
      { id: "generous", label: "Generous baby bonus & childcare", pros: ["More births"], cons: ["Ongoing cost"], costMonthly: 30, fert: 0.06, log: "introduced a generous baby bonus" },
      { id: "childcare", label: "Build more childcare centres", pros: ["Helps working parents"], cons: ["One-off cost"], cost: 600, fert: 0.03, needs: { school: 6, months: 240, all: true } },
      { id: "none", label: "Not our job", pros: ["Saves money"], cons: ["Births keep falling"], fert: -0.02 },
    ],
  },
  {
    id: "dengue", icon: "🦟", title: "Dengue cluster", from: 1966, to: 2300, town: "random",
    text: (c) => `A dengue cluster has broken out in ${c.town}. Mosquitoes are breeding in flower pots and drains.`,
    options: [
      { id: "fog", label: "Fogging & house-to-house checks", pros: ["Cluster ends fast"], cons: ["Costly", "Annoying"], cost: 200, anger: 0.2, needs: { health: 4, months: 12 } },
      { id: "campaign", label: "Public 'Mozzie wipeout' campaign", pros: ["Cheap", "Community pitches in"], cons: ["Slower"], cost: 60, needs: { health: -4, community: 4, months: 6 } },
      { id: "ignore", label: "Leave it to the residents", pros: ["Free"], cons: ["People fall ill"], needs: { health: -12, months: 8 }, anger: 0.8, tone: "bad" },
    ],
  },
  {
    id: "haze", icon: "🌫️", title: "Haze", from: 1990, to: 2300,
    text: () => "Forest fires across the strait have blanketed your region in smoke. The air quality index is in the unhealthy range.",
    options: [
      { id: "masks", label: "Free masks & air purifiers for seniors", pros: ["Protects the vulnerable"], cons: ["Costly"], cost: 300, trust: 2, needs: { health: 3, months: 3, all: true } },
      { id: "schools", label: "Close schools until it clears", pros: ["Children safe"], cons: ["Parents scramble"], mood: [-1, 2] },
      { id: "nothing", label: "Tell people to stay indoors", pros: ["Free"], cons: ["People feel ignored"], angerAll: 0.3, needs: { health: -5, months: 3, all: true } },
    ],
  },
  {
    id: "floods", icon: "🌧️", title: "Flash floods", from: 1966, to: 2300, town: "random",
    text: (c) => `A freak storm flooded shops and car parks in ${c.town}. The drains can't cope.`,
    options: [
      { id: "drain", label: "Rebuild the drains bigger", pros: ["Fewer floods for decades"], cons: ["Expensive"], cost: 600, needs: { safety: 4, months: 240 }, log: "rebuilt {town}'s drains after floods" },
      { id: "repair", label: "Repair the damage", pros: ["Cheaper"], cons: ["It may happen again"], cost: 200, later: { months: 48, chance: 0.5, text: "{town} flooded again. The old drains still can't cope.", cost: 300, anger: 0.5 } },
    ],
  },
  {
    id: "heritage", icon: "🏛️", title: "Old landmark", from: 1975, to: 2100,
    text: () => "A developer wants to knock down a much-loved old building for a new mall. Heritage groups are protesting.",
    options: [
      { id: "save", label: "Save it", pros: ["Heritage kept", "Tourists like it"], cons: ["Lose the land sale"], effect: { tourism: 1.08, months: 600 }, rep: 3, log: "saved a much-loved old landmark" },
      { id: "sell", label: "Let it be demolished", pros: ["Big land sale", "Jobs"], cons: ["People mourn it"], gain: 900, effect: { comDemand: 0.2, months: 24 }, mood: [-2, 24], tone: "bad", log: "let a beloved landmark be demolished" },
    ],
  },
  {
    id: "pcn", icon: "🚲", title: "Park connectors", from: 1991, to: 2300,
    text: () => "Cyclists and joggers want green corridors linking all the parks in your region.",
    options: [
      { id: "build", label: "Build the park connector network", pros: ["Greener, healthier towns"], cons: ["Costly"], cost: 700, needs: { green: 10, months: 300, all: true }, fert: 0.0, health: 0.3, log: "built a park connector network" },
      { id: "later", label: "Not now", pros: ["Saves money"], cons: ["Cyclists disappointed"] },
    ],
  },
  {
    id: "techHQ", icon: "💾", title: "Tech HQ wants a tax holiday", from: 1988, to: 2300,
    text: () => "A big tech company will put its regional HQ here, bringing thousands of jobs, if you give it 10 years without business tax.",
    options: [
      { id: "yes", label: "Give the tax holiday", pros: ["Thousands of good jobs"], cons: ["Less business tax"], effect: { jobs: 1.06, business: 0.95, comDemand: 0.3, months: 120 }, rep: 2, log: "lured a tech HQ with a tax holiday" },
      { id: "half", label: "Offer half", pros: ["Some tax kept"], cons: ["They might walk"], chance: 0.5, okText: "They accepted!", effect: { jobs: 1.03, comDemand: 0.15, months: 120 } },
      { id: "no", label: "No special deals", pros: ["Fair to everyone"], cons: ["Jobs go elsewhere"] },
    ],
  },
  {
    id: "mrtFault", icon: "🚇", title: "Train breakdowns", from: 1995, to: 2300, cond: (w, A) => A.mrtRunning,
    text: () => "Your MRT line has broken down three times this month. Commuters are fuming.",
    options: [
      { id: "renew", label: "Replace the old signalling", pros: ["Reliable trains for years"], cons: ["Costly, weekend closures"], cost: 900, mood: [-1, 6], needs: { transport: 6, months: 240, all: true }, log: "renewed the MRT signalling system" },
      { id: "patch", label: "Patch it up", pros: ["Cheap"], cons: ["Breakdowns will return"], cost: 150, later: { months: 30, chance: 0.6, text: "The patched MRT line broke down again during rush hour!", angerAll: 0.5 } },
    ],
  },
  {
    id: "integration", icon: "🤝", title: "Ethnic enclaves", from: 1985, to: 2010,
    text: () => "Some blocks are becoming dominated by one community. Planners suggest quotas so every block stays mixed.",
    options: [
      { id: "quota", label: "Introduce housing quotas", pros: ["Mixed, harmonious estates"], cons: ["Some sellers find it harder"], needs: { community: 8, months: 600, all: true }, effect: { land: 0.97, months: 60 }, rep: 2, log: "introduced housing quotas to keep estates mixed" },
      { id: "free", label: "Let the market decide", pros: ["Freedom of choice"], cons: ["Enclaves may grow"], needs: { community: -5, months: 120, all: true } },
    ],
  },
  {
    id: "immigration", icon: "✈️", title: "New residents", from: 1990, to: 2300,
    text: () => "Employers want to bring in more foreign talent. It would fill jobs fast but put pressure on housing and transport.",
    options: [
      { id: "open", label: "Welcome them", pros: ["Business grows", "More taxes"], cons: ["Longer housing queue", "Crowding"], waitlist: 2500, effect: { business: 1.08, months: 60 }, mood: [-2, 24] },
      { id: "measured", label: "A measured intake", pros: ["Balanced"], cons: ["Some jobs unfilled"], waitlist: 800, effect: { business: 1.03, months: 60 } },
      { id: "closed", label: "Tighten the rules", pros: ["Locals relieved"], cons: ["Firms short of workers"], effect: { business: 0.95, indDemand: -0.2, months: 60 }, trust: 2 },
    ],
  },
  {
    id: "liftUpgrade", icon: "🛗", title: "Lifts for seniors", from: 1990, to: 2300, cond: (w) => w.lots.some((l) => l.b && ["slab", "point", "emergency"].includes(l.b.type)),
    text: () => "Old blocks have lifts that only stop every third floor. Seniors are struggling with the stairs.",
    options: [
      { id: "every", label: "Lifts that stop on every floor", pros: ["Seniors can age at home", "Popular"], cons: ["Costly"], cost: 800, needs: { housing: 5, months: 360, all: true }, log: "upgraded lifts to stop on every floor" },
      { id: "some", label: "Only the oldest blocks", pros: ["Cheaper"], cons: ["Some miss out"], cost: 300, needs: { housing: 2, months: 240, all: true } },
    ],
  },
  {
    id: "shipyard", icon: "🔥", title: "Industrial accident", from: 1970, to: 2100, cond: (w) => w.lots.some((l) => l.zone === "ind" && l.b),
    text: () => "An explosion at a shipyard has injured workers. Unions demand tougher safety rules.",
    options: [
      { id: "rules", label: "Tougher safety rules", pros: ["Safer workplaces"], cons: ["Firms pay more"], effect: { indDemand: -0.1, months: 24 }, rep: 2, needs: { safety: 4, months: 240, all: true } },
      { id: "fine", label: "Fine the company and move on", pros: ["One-off income"], cons: ["Workers unhappy"], gain: 200, angerAll: 0.3 },
    ],
  },
  {
    id: "birdFlu", icon: "🐔", title: "Bird flu scare", from: 2004, to: 2300,
    text: () => "Bird flu has been found in poultry across the region. Hawkers worry chicken rice will vanish.",
    options: [
      { id: "cull", label: "Cull & import from safe farms", pros: ["Outbreak stopped"], cons: ["Costly, hawkers pay more"], cost: 250, needs: { cost: -4, months: 6, all: true } },
      { id: "watch", label: "Monitor closely", pros: ["Cheap"], cons: ["Small risk of outbreak"], later: { months: 6, chance: 0.3, text: "Bird flu spread to a farm worker. Panic in the markets!", angerAll: 0.4, mood: [-2, 4] } },
    ],
  },
  {
    id: "busStrike", icon: "🚌", title: "Bus drivers' strike", from: 1980, to: 2300,
    text: () => "Bus drivers have walked off the job over pay and dormitory conditions.",
    options: [
      { id: "pay", label: "Raise their pay", pros: ["Buses back tomorrow"], cons: ["Ongoing cost"], costMonthly: 12, trust: 1 },
      { id: "talk", label: "Mediate between company and drivers", pros: ["Fair deal"], cons: ["Two weeks of chaos"], needs: { transport: -8, months: 1, all: true }, rep: 1 },
      { id: "hard", label: "Take a hard line", pros: ["No new costs"], cons: ["Workers angry", "Bad headlines"], angerAll: 0.5, rep: -2, tone: "bad" },
    ],
  },
  {
    id: "festival", icon: "🏮", title: "Festival in the void deck", from: 1966, to: 2300, town: "random",
    text: (c) => `Residents of ${c.town} want to hold a big getai and festival in the void decks. Some neighbours worry about the noise.`,
    options: [
      { id: "allow", label: "Allow it and help fund it", pros: ["Community spirit"], cons: ["Noise complaints"], cost: 60, needs: { community: 8, months: 12 }, mood: [1, 2] },
      { id: "quiet", label: "Allow it with a 10pm curfew", pros: ["Everyone half happy"], cons: ["Organisers grumble"], needs: { community: 4, months: 12 } },
      { id: "ban", label: "Say no", pros: ["Peace and quiet"], cons: ["Seen as unfriendly"], anger: 0.3 },
    ],
  },
  {
    id: "trees", icon: "🌳", title: "Falling trees", from: 1970, to: 2300, town: "random",
    text: (c) => `A storm brought down old rain trees in ${c.town}, crushing cars. Should all big trees be pruned hard?`,
    options: [
      { id: "arborist", label: "Hire arborists to check every tree", pros: ["Safe and green"], cons: ["Costly"], cost: 250, needs: { safety: 3, months: 120 } },
      { id: "chop", label: "Cut down risky trees", pros: ["Cheap and safe"], cons: ["Less shade and greenery"], needs: { green: -8, months: 120 } },
    ],
  },
  {
    id: "smart", icon: "📡", title: "Smart estate sensors", from: 2014, to: 2300,
    text: () => "A tech firm offers sensors in every block to spot falls, leaks and broken lifts. Privacy groups are worried.",
    options: [
      { id: "yes", label: "Install them", pros: ["Faster repairs, safer seniors"], cons: ["Privacy worries"], cost: 500, effect: { upkeep: 0.93, months: 240 }, trust: -1, rep: 2, log: "installed smart sensors in every block" },
      { id: "optin", label: "Opt-in only", pros: ["Privacy respected"], cons: ["Fewer benefits"], cost: 200, effect: { upkeep: 0.97, months: 240 } },
      { id: "no", label: "No thanks", pros: ["No privacy fears"], cons: ["Miss out"] },
    ],
  },
  {
    id: "water", icon: "💧", title: "Water security", from: 1998, to: 2300,
    text: () => "Imported water agreements are due for renewal. You could invest in recycled 'NEWater' and desalination instead.",
    options: [
      { id: "newater", label: "Build a NEWater plant", pros: ["Secure water forever", "Reputation"], cons: ["Big cost"], cost: 1300, rep: 5, effect: { upkeep: 0.97, months: 600 }, log: "built a NEWater recycling plant" },
      { id: "import", label: "Keep importing", pros: ["Cheap"], cons: ["At the mercy of others"], later: { months: 72, chance: 0.4, text: "Water talks broke down. Prices spiked and taps were rationed.", cost: 500, angerAll: 0.4 } },
    ],
  },
  {
    id: "topup", icon: "🏛️", title: "Central government offer", from: 1966, to: 2300, cond: (w) => w.cash < 6000,
    text: () => "The Ministry offers your region an emergency top-up, but wants you to hand over control of some land in return.",
    options: [
      { id: "take", label: "Take the money", pros: ["Cash now"], cons: ["Less say over your land", "Looks weak"], gain: 2500, rep: -3, trust: -2 },
      { id: "refuse", label: "Manage on our own", pros: ["Independence"], cons: ["Tight budget"], rep: 1 },
    ],
  },
  {
    id: "scandal", icon: "📰", title: "Town council scandal", from: 1970, to: 2300, town: "random",
    text: (c) => `The newspapers report that ${c.town}'s town council paid a contractor linked to an official. People expect you to act.`,
    options: [
      { id: "probe", label: "Independent investigation", pros: ["Clean government", "Trust rises"], cons: ["Embarrassing headlines"], cost: 100, trust: 4, rep: 2, mood: [-1, 3], log: "ordered an independent probe into a town council scandal" },
      { id: "quiet", label: "Handle it quietly", pros: ["No fuss"], cons: ["If it leaks, trust collapses"], later: { months: 18, chance: 0.5, text: "The cover-up leaked! Residents feel betrayed.", trust: -10, rep: -5, angerAll: 0.5 } },
    ],
  },
  {
    id: "cats", icon: "🐈", title: "Community cats", from: 2000, to: 2300, town: "random",
    text: (c) => `Residents in ${c.town} are split over stray cats: some feed them, others complain about the mess.`,
    options: [
      { id: "tnr", label: "Sterilise & manage them", pros: ["Humane", "Fewer complaints over time"], cons: ["Small cost"], cost: 40, needs: { community: 3, months: 60 } },
      { id: "remove", label: "Remove the cats", pros: ["Mess gone"], cons: ["Cat lovers outraged"], anger: 0.4 },
    ],
  },
  {
    id: "carFree", icon: "🚶", title: "Car-lite town centre", from: 2010, to: 2300, town: "biggest",
    text: (c) => `Planners propose closing ${c.town}'s town centre to cars, with wider walkways and cycling paths.`,
    options: [
      { id: "yes", label: "Go car-lite", pros: ["Cleaner air", "Lively streets"], cons: ["Drivers complain", "Costs to redesign"], cost: 400, needs: { environment: 8, green: 6, transport: -3, months: 240 }, rep: 2, log: "made {town}'s centre car-lite" },
      { id: "no", label: "Keep the roads", pros: ["Drivers happy"], cons: ["Miss a chance"] },
    ],
  },
  {
    id: "sentosaCove", icon: "🛥️", title: "Luxury homes on Sentosa", from: 2003, to: 2300, region: "south",
    text: () => "Developers want to build Sentosa Cove: waterfront villas and a marina, the only place foreigners can buy landed homes.",
    options: [
      { id: "yes", label: "Sell the land for Sentosa Cove", pros: ["Huge land sale", "Wealthy residents spend on the island"], cons: ["Beach space shrinks", "Seen as for the rich"], gain: 2500, effect: { tourism: 0.97, months: 120 }, mood: [-1, 12], log: "sold land on Sentosa for luxury villas" },
      { id: "no", label: "Keep the island for everyone", pros: ["Beaches stay public", "Locals approve"], cons: ["No land sale"], trust: 2, rep: 1 },
    ],
  },
  {
    id: "sentosaFee", icon: "🎟️", title: "Free entry to Sentosa?", from: 1990, to: 2300, region: "south",
    text: () => "Residents complain it costs money just to step onto Sentosa. Some say the island should be free for Singaporeans.",
    options: [
      { id: "free", label: "Free entry for residents", pros: ["Very popular", "More local visitors"], cons: ["Less ticket income"], mood: [3, 24], trust: 2, effect: { tourism: 0.95, months: 120 }, log: "made Sentosa entry free for residents" },
      { id: "keep", label: "Keep charging", pros: ["Pays for upkeep"], cons: ["Seen as stingy"], angerAll: 0.2 },
    ],
  },
];
export const DILEMMA = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]));

// ---------------- applying outcomes ----------------
export function pickTown(w, A, how, rng) {
  if (!how) return null;
  const live = w.towns.map((t, i) => i).filter((i) => (A.towns[i].pop + A.towns[i].kpop) > 0);
  const pool = live.length ? live : w.towns.map((_, i) => i);
  if (how === "random") return pool[Math.floor(rng() * pool.length)];
  if (how === "biggest") return pool.reduce((a, b) => (A.towns[b].pop > A.towns[a].pop ? b : a), pool[0]);
  if (how.startsWith("worst:")) {
    const k = how.slice(6);
    return pool.reduce((a, b) => ((A.towns[b].needs[k] ?? 50) < (A.towns[a].needs[k] ?? 50) ? b : a), pool[0]);
  }
  return null;
}

export const fill = (text, w, town) => (text || "").replace(/\{town\}/g, town != null ? w.towns[town].name : "the region");

// cost of an option in $K for this region
export function optionCost(w, o) {
  const S = scaleOf(w);
  return { cost: Math.round((o.cost || 0) * S), gain: Math.round((o.gain || 0) * S), monthly: Math.round(((o.costMonthly || 0) - (o.gainMonthly || 0)) * S) };
}

export function applyOutcome(w, o, town, push, rng = Math.random) {
  if (o.chance != null && rng() > o.chance) {
    if (o.failText) push(fill(o.failText, w, town));
    return false;
  }
  const S = scaleOf(w);
  const all = w.towns.map((_, i) => i);
  const C = optionCost(w, o);
  if (C.cost) charge(w, C.cost, town != null ? w.towns[town].x : null, town != null ? w.towns[town].y : null);
  if (C.gain) w.cash += C.gain;
  if (C.monthly) {
    w.policy.monthly = (w.policy.monthly || 0) + C.monthly;
    w.policy.monthlyItems = (w.policy.monthlyItems || []).concat([{ text: o.label, v: C.monthly }]);
  }
  if (o.trust) w.trust = clamp(w.trust + o.trust, 0, 100);
  if (o.rep) w.rep = clamp((w.rep ?? 50) + o.rep, 0, 100);
  if (o.mood) w.effects.push({ id: "mood", until: w.t + o.mood[1], effect: { mood: o.mood[0] } });
  if (o.effect) {
    const { months, ...eff } = o.effect;
    w.effects.push({ id: "policy", until: w.t + (months || 12), effect: eff });
  }
  if (o.anger) for (const i of town != null ? [town] : all) w.towns[i].anger += o.anger;
  if (o.angerAll) for (const i of all) w.towns[i].anger += o.angerAll;
  if (o.needs) {
    const { months, all: everywhere, ...nd } = o.needs;
    const towns = everywhere || town == null ? all : [town];
    for (const [k, v] of Object.entries(nd)) for (const i of towns) w.boosts.push({ town: i, need: k, v, until: w.t + (months || 12) });
  }
  if (o.fert) w.policy.fert = clamp((w.policy.fert || 0) + o.fert, -0.3, 0.3);
  if (o.health) w.policy.health = (w.policy.health || 0) + o.health;
  if (o.policy) Object.assign(w.policy, o.policy);
  if (o.waitlist) w.waitlist += Math.round(o.waitlist * S);
  if (o.fasterBuild) w.policy.fastUntil = w.t + o.fasterBuild;
  if (o.closeFarms) {
    for (const l of w.lots) if (l.b?.type === "farm") l.b = null;
    w.rev++;
  }
  if (o.crisis && w.crisis) w.crisis.sev = clamp(w.crisis.sev * o.crisis, 0.15, 2.5);
  if (o.crisisMonths && w.crisis) w.crisis.until = Math.max(w.t + 1, w.crisis.until + o.crisisMonths);
  if (o.okText) push(o.okText);
  return true;
}

// Plain-number summary of what an option does, for the decision card.
const NEED_ICON = { food: "🍜", school: "🏫", health: "🩺", safety: "👮", transport: "🚌", green: "🌳", community: "🏓", environment: "🌬️", housing: "🏠", cost: "🧾", jobs: "💼" };
const EFF_NAME = { business: "business tax", tourism: "tourism", trade: "trade", land: "land & flat sales", jobs: "jobs", health: "healthcare", upkeep: "running costs", growth: "new families", comDemand: "shop demand", indDemand: "factory demand" };
const yrs = (m) => (m >= 24 ? `${Math.round(m / 12)} yrs` : `${m} mo`);
const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
export function describeEffects(w, o, town) {
  const out = [];
  const where = town != null ? w.towns[town]?.name : "every town";
  if (o.trust) out.push({ t: `Trust ${sign(o.trust)}`, good: o.trust > 0 });
  if (o.rep) out.push({ t: `Reputation ${sign(o.rep)}`, good: o.rep > 0 });
  if (o.mood) out.push({ t: `Mood ${sign(o.mood[0])} for ${yrs(o.mood[1])}`, good: o.mood[0] > 0 });
  if (o.anger) out.push({ t: `Anger in ${where}`, good: false });
  if (o.angerAll) out.push({ t: "Anger in every town", good: false });
  if (o.needs) {
    const { months, all, ...nd } = o.needs;
    for (const [k, v] of Object.entries(nd)) out.push({ t: `${NEED_ICON[k] || ""} ${k} ${sign(v)} in ${all || town == null ? "every town" : where} for ${yrs(months || 12)}`, good: v > 0 });
  }
  if (o.effect) {
    const { months, ...eff } = o.effect;
    for (const [k, v] of Object.entries(eff)) {
      if (k === "mood") out.push({ t: `Mood ${sign(v)} for ${yrs(months || 12)}`, good: v > 0 });
      else if (EFF_NAME[k]) {
        const pct = k.endsWith("Demand") ? Math.round(v * 100) : Math.round((v - 1) * 100);
        const good = k === "upkeep" ? pct < 0 : pct > 0;
        out.push({ t: `${EFF_NAME[k]} ${pct > 0 ? "+" : ""}${pct}% for ${yrs(months || 12)}`, good });
      }
    }
  }
  if (o.crisis) out.push({ t: `Crisis impact ${o.crisis < 1 ? "−" : "+"}${Math.abs(Math.round((o.crisis - 1) * 100))}%`, good: o.crisis < 1 });
  if (o.crisisMonths) out.push({ t: `Crisis ${o.crisisMonths < 0 ? "ends" : "lasts"} ${Math.abs(o.crisisMonths)} months ${o.crisisMonths < 0 ? "sooner" : "longer"}`, good: o.crisisMonths < 0 });
  if (o.fert) out.push({ t: `Births ${o.fert > 0 ? "+" : "−"}${Math.abs(Math.round(o.fert * 100))}%`, good: o.fert > 0 });
  if (o.health) out.push({ t: `Life expectancy +${o.health} yrs`, good: true });
  if (o.waitlist) out.push({ t: `Housing queue +${Math.round(o.waitlist * scaleOf(w)).toLocaleString("en-SG")}`, good: false });
  if (o.later) out.push({ t: o.later.chance != null ? `🎲 ${Math.round(o.later.chance * 100)}% risk later` : "⏳ Consequences later", good: false });
  return out;
}

// ---------------- decisions ----------------
// The card the player sees for w.decision
export function getDecision(w) {
  const d = w.decision;
  if (!d) return null;
  let def;
  let title;
  let text;
  let icon;
  let tag;
  if (d.kind === "dilemma") {
    def = DILEMMA[d.id];
    if (!def) return null;
    title = def.title;
    text = def.text({ town: d.town != null ? w.towns[d.town].name : "the region" });
    icon = def.icon;
    tag = "Decision";
  } else {
    const C = CRISES[d.id];
    if (!C) return null;
    def = d.kind === "crisis" ? C : d.kind === "crisisMid" ? C.mid : C.mid?.second;
    title = d.kind === "crisis" ? C.name : def.title;
    text = def.text;
    icon = C.icon;
    tag = d.kind === "crisis" ? "Crisis" : C.name;
  }
  const options = def.options || def.choices;
  return {
    kind: d.kind,
    icon,
    title,
    text,
    tag,
    hint: d.kind === "crisis" ? CRISES[d.id].hint : null,
    options: options.map((o) => ({ ...o, ...optionCost(w, o), effects: describeEffects(w, o, d.town) })),
  };
}

export function decide(w, optId, push, rng = Math.random) {
  const d = w.decision;
  if (!d) return;
  const card = getDecision(w);
  const o = card?.options.find((x) => x.id === optId);
  w.decision = null;
  if (!o) return;
  const ok = applyOutcome(w, o, d.town, push, rng);
  if (d.kind === "crisis" && w.crisis) w.crisis.choice = optId;
  if (ok && o.log) w.log.push({ year: w.year, text: fill(o.log, w, d.town), tone: o.tone || "good" });
  if (ok && o.later) w.followups.push({ at: w.t + o.later.months, kind: d.kind, id: d.id, opt: optId, town: d.town });
  if (d.kind === "dilemma") w.dilemmaLog.push({ t: w.t, id: d.id, opt: optId });
  if (ok) trackImpact(w, `your "${o.label}" decision`, d.town, o.needs ? Object.keys(o.needs).find((k) => k !== "months" && k !== "all") : null);
  push(`${card.icon} ${card.title}: you chose "${o.label}".`);
}

function laterOf(f) {
  if (f.kind === "dilemma") return DILEMMA[f.id]?.options.find((o) => o.id === f.opt)?.later;
  const C = CRISES[f.id];
  const def = f.kind === "crisis" ? C : f.kind === "crisisMid" ? C?.mid : C?.mid?.second;
  return def?.choices.find((o) => o.id === f.opt)?.later;
}

// ---------------- did it work? ----------------
// Remember how things stood, then report the change six months later.
export const trackImpact = noteImpact;
const arrow = (a, b, unit = "") => `${a}${unit}→${b}${unit} (${b - a >= 0 ? "+" : ""}${b - a})`;
function reportImpacts(w, push) {
  if (!w.impacts?.length) return;
  const due = w.impacts.filter((x) => x.at <= w.t);
  w.impacts = w.impacts.filter((x) => x.at > w.t);
  for (const x of due) {
    const parts = [];
    const tn = x.town != null ? w.towns[x.town] : null;
    if (x.need && tn && x.base.need != null) parts.push(`${NEED_ICON[x.need] || ""} ${x.need} ${arrow(x.base.need, Math.round(tn.needs?.[x.need] ?? 0))}`);
    parts.push(`${tn ? `${tn.name} ` : ""}happiness ${arrow(x.base.happy, Math.round(tn ? tn.approval : w.approval), "%")}`);
    const fin = (w.fin || []).slice(-3);
    if (x.base.net != null && fin.length) {
      const net = Math.round(fin.reduce((a, f) => a + (f.rr ?? f.r) - (f.re ?? f.e), 0) / fin.length);
      if (Math.abs(net - x.base.net) >= 5) parts.push(`monthly balance ${net - x.base.net >= 0 ? "+" : "−"}$${Math.abs(net - x.base.net)}K`);
    }
    if (Math.round(w.trust) !== x.base.trust) parts.push(`trust ${arrow(x.base.trust, Math.round(w.trust))}`);
    push(`📈 6 months after ${x.label}: ${parts.join(" · ")}`);
  }
}

// ---------------- monthly driver ----------------
export function stepEvents(w, A, rng, push) {
  reportImpacts(w, push);
  // follow-up consequences of earlier choices
  if (w.followups.length) {
    const due = w.followups.filter((f) => f.at <= w.t);
    w.followups = w.followups.filter((f) => f.at > w.t);
    for (const f of due) {
      const L = laterOf(f);
      if (!L) continue;
      if (L.chance != null && rng() > L.chance) continue;
      applyOutcome(w, { ...L, chance: null }, f.town, push, rng);
      push(`⏳ ${fill(L.text, w, f.town)}`);
      w.log.push({ year: w.year, text: fill(L.text, w, f.town), tone: "bad" });
    }
  }

  // crisis in progress
  const cr = w.crisis;
  if (cr) {
    const C = CRISES[cr.id];
    const mit = C.mitigate.fn(w, A);
    cr.mit = cr.mit == null ? mit : cr.mit * 0.8 + mit * 0.2;
    const scale = cr.sev * (1 - 0.6 * cr.mit);
    const eff = {};
    for (const [k, v] of Object.entries(C.effect)) {
      if (v == null) continue;
      if (MULT.includes(k)) eff[k] = clamp(1 - (1 - v) * scale, 0.05, 3);
      else eff[k] = v * scale;
    }
    w.effects = w.effects.filter((e) => e.id !== "crisis");
    w.effects.push({ id: "crisis", until: cr.until, effect: eff });
    cr.scale = scale;
    const age = w.t - cr.start;
    if (!w.decision && C.mid && !cr.midDone && age >= C.mid.after) {
      cr.midDone = true;
      w.decision = { kind: "crisisMid", id: cr.id };
    } else if (!w.decision && C.mid?.second && cr.midDone && !cr.secondDone && age >= C.mid.second.after) {
      cr.secondDone = true;
      w.decision = { kind: "crisisMid2", id: cr.id };
    }
    if (w.t >= cr.until) {
      // how well did the region come through?
      const score = clamp(cr.mit * 0.6 + (1.2 - cr.sev) * 0.5, 0, 1);
      const rep = Math.round((score - 0.45) * 14);
      w.rep = clamp((w.rep ?? 50) + rep, 0, 100);
      const result = score > 0.6 ? "Your region came through better than most." : score > 0.35 ? "Your region came through about as well as others." : "Your region was hit harder than most.";
      push(`${C.icon} ${C.end.replace("{result}", result)}`);
      w.log.push({ year: w.year, text: `came through the ${C.name} ${score > 0.6 ? "better than most" : score > 0.35 ? "about as well as others" : "worse than most"}`, tone: score > 0.5 ? "good" : score > 0.35 ? "neutral" : "bad", crisis: true });
      w.crisesPast.push({ id: cr.id, year: Math.floor(cr.startYear), score: Math.round(score * 100), choice: cr.choice });
      w.effects = w.effects.filter((e) => e.id !== "crisis");
      w.crisis = null;
    }
    return;
  }

  // start a historical crisis on its date, or a future one when scheduled
  for (const id of HISTORIC) {
    const C = CRISES[id];
    if (w.year === C.year && w.month === C.month && !w.crisesPast.some((p) => p.id === id)) return startCrisis(w, id, rng, push);
  }
  if (w.year >= 2027 && w.nextFuture != null && w.t >= w.nextFuture) {
    const pool = FUTURE.filter((id) => !w.crisesPast.slice(-2).some((p) => p.id === id));
    const id = pool[Math.floor(rng() * pool.length)];
    w.nextFuture = w.t + Math.round((10 + rng() * 14) * 12);
    return startCrisis(w, id, rng, push);
  }

  // random dilemmas
  if (!w.decision && w.t >= w.nextDilemma) {
    const recent = new Set(w.dilemmaLog.slice(-14).map((x) => x.id));
    const pool = DILEMMAS.filter((d) => w.year >= d.from && w.year <= d.to && !recent.has(d.id) && (!d.region || d.region === w.region) && (!d.cond || d.cond(w, A)));
    if (pool.length) {
      const d = pool[Math.floor(rng() * pool.length)];
      w.decision = { kind: "dilemma", id: d.id, town: pickTown(w, A, d.town, rng) };
    }
    w.nextDilemma = w.t + 9 + Math.floor(rng() * 12);
  }
}

function startCrisis(w, id, rng, push) {
  const C = CRISES[id];
  const sev = 0.8 + rng() * 0.45;
  w.crisis = { id, start: w.t, startYear: w.year, until: w.t + C.months, sev, mit: null };
  w.decision = { kind: "crisis", id };
  push(`${C.icon} CRISIS: ${C.name}! ${C.text}`);
}

// AI choice for bots and tests
export function autoDecide(w, push, rng = Math.random) {
  const card = getDecision(w);
  if (!card) return;
  const affordable = card.options.filter((o) => o.cost <= Math.max(0, w.cash) * 0.4);
  const pick = (affordable.length ? affordable : card.options)[0];
  decide(w, pick.id, push, rng);
}
