// Crises (real ones on their real dates, imagined ones in the future) and
// random dilemmas that ask the mayor to choose between trade-offs.
// Everything stored in the save is plain data (ids); behaviour lives here.
import { clamp } from "./geom.js";
import { LOT_TYPES, STRUCTS } from "./defs.js";
import { charge, noteImpact, genLots, refillLots, townOf } from "./world.js";
import { REGIONS } from "./regions.js";
import { settlePetition } from "./character.js";
import { recordHistory, HISTORY } from "./history.js";
import { fantasyCard, decideFantasy, stepFantasy, fantasyOn, fantasySevere } from "./fantasy.js";

const MULT = ["business", "tourism", "trade", "land", "jobs", "health", "upkeep", "growth"];
export const EFFECT_ADD = ["mood", "comDemand", "indDemand", "life", "fert"];

// how big the region is, to scale costs and gains
export const scaleOf = (w) => clamp((w.stats?.pop || 0) / 25000, 0.6, 10);

const popAvg = (A, k) => {
  let s = 0;
  let n = 0;
  for (const t of A.towns) {
    const p = t.pop;
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
      { id: "wait", label: "Leave it to the market", pros: ["Costs nothing"], cons: ["Workers feel abandoned"], angerAll: 0.8, crisis: 1.15, log: "left base workers to fend for themselves", tone: "bad" },
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
    text: "Oil prices have roughly quadrupled within months. Petrol, electricity and transport costs are soaring.",
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
    end: "The regional economy is recovering. {result}",
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
    end: "The SARS outbreak has ended. {result}",
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
    end: "COVID-19 is now treated as endemic. {result}",
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
      { id: "kampong", label: "Build senior hubs with care, clinics and homes together", pros: ["Seniors thrive", "Big reputation boost"], cons: ["Costly"], cost: 1600, crisis: 0.55, rep: 5, needs: { community: 10, months: 120, all: true }, log: "built senior-friendly 'vertical kampong' hubs" },
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
    id: "offerNjc", scheduled: true, region: "bukit", icon: "🎓", title: "A site for National Junior College",
    text: () => "The Ministry of Education is opening Singapore's first junior college and wants a site in your region: about 4 lots of land. If you agree, you have 3 years to place it from 🌟 Landmarks; homes on the site are demolished.",
    options: [
      { id: "yes", label: "Offer a site", pros: ["Top students from across the island", "Nearby homes become more sought-after"], cons: [`Needs room for ${STRUCTS.njc.w > 6 ? "a whole hillside" : "a big campus"}`, `About $${(STRUCTS.njc.cost / 1000).toFixed(1)}M to place`], offer: "njc", log: "offered land to " + STRUCTS.njc.name },
      { id: "no", label: "No room here", pros: ["Keeps the land for homes"], cons: ["It goes to another region"], rep: -1, tone: "neutral", log: "turned away " + STRUCTS.njc.name },
    ],
  },
  {
    id: "offerPoly", scheduled: true, region: "bukit", icon: "🛠️", title: "Singapore Polytechnic wants to move to Dover",
    text: () => "Singapore Polytechnic is outgrowing Prince Edward Road and wants a big new campus here: about 10 lots, with workshops and halls. If you agree, you have 3 years to place it from 🌟 Landmarks; homes on the site are demolished.",
    options: [
      { id: "yes", label: "Offer a site", pros: ["Hundreds of jobs and young residents", "Nearby homes become more sought-after"], cons: [`Needs room for ${STRUCTS.sPoly.w > 6 ? "a whole hillside" : "a big campus"}`, `About $${(STRUCTS.sPoly.cost / 1000).toFixed(1)}M to place`], offer: "sPoly", log: "offered land to " + STRUCTS.sPoly.name },
      { id: "no", label: "No room here", pros: ["Keeps the land for homes"], cons: ["It goes to another region"], rep: -1, tone: "neutral", log: "turned away " + STRUCTS.sPoly.name },
    ],
  },
  {
    id: "offerNus", scheduled: true, region: "bukit", icon: "🏛️", title: "A home for the national university",
    text: () => "The university wants to build its new campus on the Kent Ridge hills: about 22 lots of land, a whole hillside. It is the biggest campus Singapore will ever build. If you agree, you have 3 years to place it from 🌟 Landmarks; homes on the site are demolished.",
    options: [
      { id: "yes", label: "Offer a site", pros: ["Thousands of jobs, and the most prestigious address in the country", "Nearby homes become more sought-after"], cons: [`Needs room for ${STRUCTS.nus.w > 6 ? "a whole hillside" : "a big campus"}`, `About $${(STRUCTS.nus.cost / 1000).toFixed(1)}M to place`], offer: "nus", log: "offered land to " + STRUCTS.nus.name },
      { id: "no", label: "No room here", pros: ["Keeps the land for homes"], cons: ["It goes to another region"], rep: -1, tone: "neutral", log: "turned away " + STRUCTS.nus.name },
    ],
  },
  {
    id: "offerSji", scheduled: true, region: "bukit", icon: "⛪", title: "St Joseph's Institution is moving",
    text: () => "The old mission school at Bras Basah has run out of space and wants about 5 lots for a new campus with a field and chapel. If you agree, you have 3 years to place it from 🌟 Landmarks; homes on the site are demolished.",
    options: [
      { id: "yes", label: "Offer a site", pros: ["A famous school with loyal old boys", "Nearby homes become more sought-after"], cons: [`Needs room for ${STRUCTS.sji.w > 6 ? "a whole hillside" : "a big campus"}`, `About $${(STRUCTS.sji.cost / 1000).toFixed(1)}M to place`], offer: "sji", log: "offered land to " + STRUCTS.sji.name },
      { id: "no", label: "No room here", pros: ["Keeps the land for homes"], cons: ["It goes to another region"], rep: -1, tone: "neutral", log: "turned away " + STRUCTS.sji.name },
    ],
  },
  {
    id: "offerMgs", scheduled: true, region: "bukit", icon: "⛪", title: "Methodist Girls' School is moving",
    text: () => "Methodist Girls' School is leaving Mount Sophia after 67 years and wants about 5 lots for a new campus. If you agree, you have 3 years to place it from 🌟 Landmarks; homes on the site are demolished.",
    options: [
      { id: "yes", label: "Offer a site", pros: ["A sought-after school for daughters", "Nearby homes become more sought-after"], cons: [`Needs room for ${STRUCTS.mgs.w > 6 ? "a whole hillside" : "a big campus"}`, `About $${(STRUCTS.mgs.cost / 1000).toFixed(1)}M to place`], offer: "mgs", log: "offered land to " + STRUCTS.mgs.name },
      { id: "no", label: "No room here", pros: ["Keeps the land for homes"], cons: ["It goes to another region"], rep: -1, tone: "neutral", log: "turned away " + STRUCTS.mgs.name },
    ],
  },
  {
    id: "petition", scheduled: true, region: "bukit", icon: "🏡", title: "A residents' petition",
    text: (c) => `Residents of ${c.town}'s landed estates have signed a petition: "Our neighbourhood is being changed beyond recognition." They want new towers kept away from their streets, and the newspapers have noticed.`,
    options: [
      { id: "lowrise", label: "Keep new HDB near them low-rise", pros: ["Pushback eases", "The estate keeps its character"], cons: ["New blocks next to their streets hold ~40% fewer flats"], petition: "lowrise", log: "agreed to keep HDB low-rise near {town}'s landed estates" },
      { id: "consult", label: "Hold a public consultation", pros: ["Residents feel heard", "Pushback eases for now"], cons: ["Costs money", "New building in the town slows for a year", "More towers will stir it up again"], cost: 250, petition: "consult", log: "held a public consultation in {town}" },
      { id: "ignore", label: "Push ahead anyway", pros: ["Homes keep coming"], cons: ["Bad press", "Anger in the estate", "Doubt spreads to other towns"], rep: -3, trust: -1, anger: 0.5, tone: "bad", log: "pushed ahead despite a petition in {town}" },
    ],
  },
  {
    id: "quarryEnd", scheduled: true, region: "bukit", icon: "⛏️", title: "The quarries are worked out",
    text: () => "The granite in the Bukit Batok quarries is running out and quarrying will stop. What should happen to the deep pits left behind?",
    options: [
      { id: "park", label: "Turn them into lake parks", pros: ["Greenery and visitors", "Like Little Guilin"], cons: ["Costs money", "Quarry jobs end"], cost: 700, rep: 2, quarry: "quarryPark", log: "turned the old quarries into lake parks" },
      { id: "fill", label: "Fill them in for housing", pros: ["Flat land for new homes"], cons: ["Costly earthworks", "Quarry jobs end"], cost: 900, quarry: "fill", log: "filled in the old quarries for housing" },
      { id: "leave", label: "Leave them as they are", pros: ["Costs nothing"], cons: ["Quarry jobs end", "Fenced-off pits"], quarry: "quarryOld", tone: "neutral" },
    ],
  },
  {
    id: "ktmClose", scheduled: true, region: "bukit", icon: "🚂", title: "The railway closes",
    text: () => "From July 2011, Malaysia's trains stop at Woodlands. The old KTM line through your region, and Bukit Timah station, come back to you.",
    options: [
      { id: "trail", label: "Make it the Rail Corridor", pros: ["A green trail the whole way", "Residents and nature groups love it"], cons: ["Costs to build", "No new homes on it"], cost: 800, rep: 3, ktm: "corridor", log: "turned the old railway into the Rail Corridor" },
      { id: "homes", label: "Sell the land for homes", pros: ["A big land sale", "New lots along the old line"], cons: ["Nature groups object"], gain: 1500, rep: -2, ktm: "road", tone: "neutral", log: "sold the old railway land for housing" },
    ],
  },
  {
    id: "hawkers", icon: "🍢", title: "Street hawkers", from: 1971, to: 1990, town: "random",
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
    id: "roadPricing", repeat: 30, icon: "🚗", title: "Traffic jams", from: 1975, to: 2100, town: "worst:transport",
    text: (c) => `Rush-hour traffic in ${c.town} is crawling. Planners suggest charging cars to enter the busiest roads.`,
    variants: [
      { id: "parking", text: (c) => `Cars parked along the roads of ${c.town} are choking traffic and blocking buses at every stop.`, opts: { charge: { label: "Charge for street parking", pros: ["Roads clear up", "New income"], cons: ["Drivers are furious"] }, widen: { label: "Build multi-storey car parks", pros: ["Drivers happy", "Roads clear"], cons: ["Expensive", "Encourages more cars"] } } },
      { id: "cbd", town: "biggest", cond: (w) => w.year >= 1990, text: (c) => `Office workers driving into ${c.town} are gridlocking the roads. Shop owners say their customers can't get in.`, opts: { charge: { label: "Charge cars entering the town centre", pros: ["Traffic flows", "New income"], cons: ["Drivers are furious", "Some shoppers stay away"] } } },
    ],
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
    // replaced by the 🍼 New-family gift and 🧸 Childcare programmes
    id: "babyBonus", icon: "🍼", title: "Baby bonus", from: 1998, to: 2100, cond: (w) => (w.stats.tfr || 2) < 2,
    text: () => "Births are falling. You could give new parents cash and childcare help.",
    options: [
      { id: "generous", label: "Generous baby bonus & childcare", pros: ["More births"], cons: ["Ongoing cost"], costMonthly: 30, fert: 0.06, log: "introduced a generous baby bonus" },
      { id: "childcare", label: "Build more childcare centres", pros: ["Helps working parents"], cons: ["One-off cost"], cost: 600, fert: 0.03, needs: { school: 6, months: 240, all: true } },
      { id: "none", label: "No new spending", pros: ["Saves money"], cons: ["Births keep falling"], fert: -0.02 },
    ],
  },
  {
    id: "dengue", repeat: 15, icon: "🦟", title: "Dengue cluster", from: 1966, to: 2300, town: "random",
    text: (c) => `A dengue cluster has broken out in ${c.town}. Mosquitoes are breeding in flower pots and drains.`,
    variants: [
      { id: "site", town: "building", text: (c) => `Rainwater pooling on a construction site in ${c.town} has become a mosquito breeding ground. Dozens of neighbours have dengue.`, opts: { campaign: { label: "Order the builder to clear the site", pros: ["Cheap", "The builder pays the fine"], cons: ["Work is delayed"] }, ignore: { label: "Leave it to the builder" } } },
      { id: "school", town: "school", text: (c) => `Several pupils at a school in ${c.town} have come down with dengue. Parents are alarmed and want the school checked.` },
      { id: "gutters", cond: (w) => w.year >= 1980 && w.lots.some((l) => l.b?.type === "slab"), text: (c) => `Blocked roof gutters on old blocks in ${c.town} are full of stagnant water. Mosquitoes are spreading dengue floor by floor.` },
    ],
    options: [
      { id: "fog", label: "Fogging & house-to-house checks", pros: ["Cluster ends fast"], cons: ["Costly", "Annoying"], cost: 200, anger: 0.2, needs: { health: 4, months: 12 } },
      { id: "campaign", label: "Public 'Mozzie wipeout' campaign", pros: ["Cheap", "Community pitches in"], cons: ["Slower"], cost: 60, needs: { health: -4, community: 4, months: 6 } },
      { id: "ignore", label: "Leave it to the residents", pros: ["Free"], cons: ["People fall ill"], needs: { health: -12, months: 8 }, anger: 0.8, tone: "bad" },
    ],
  },
  {
    id: "haze", repeat: 15, icon: "🌫️", title: "Haze", from: 1990, to: 2300,
    text: () => "Forest fires across the strait have blanketed your region in smoke. The air quality index is in the unhealthy range.",
    variants: [
      { id: "exams", text: () => "The haze has arrived in the middle of the PSLE and O-level exams. Parents want to know if pupils will sit their papers in the smoke.", opts: { schools: { label: "Postpone exams and close schools", pros: ["Children safe"], cons: ["Exam timetable thrown into chaos"] } } },
      { id: "record", history: true, cond: (w) => w.year >= 1997, text: () => "The worst haze on record: the air quality index has passed 400, the hazardous level. Clinics are full of children with asthma.", opts: { masks: { needs: { health: 5, months: 3, all: true } }, nothing: { needs: { health: -9, months: 4, all: true } } } },
      { id: "event", cond: (w) => w.year >= 2000, text: () => "Thick haze has rolled in days before a big marathon and the National Day rehearsals. Organisers ask whether to call them off.", opts: { schools: { label: "Cancel the outdoor events", pros: ["Nobody falls ill"], cons: ["Thousands disappointed"] } } },
    ],
    options: [
      { id: "masks", label: "Free masks & air purifiers for seniors", pros: ["Protects the vulnerable"], cons: ["Costly"], cost: 300, trust: 2, needs: { health: 3, months: 3, all: true } },
      { id: "schools", label: "Close schools until it clears", pros: ["Children safe"], cons: ["Parents scramble"], mood: [-1, 2] },
      { id: "nothing", label: "Tell people to stay indoors", pros: ["Free"], cons: ["People feel ignored"], angerAll: 0.3, needs: { health: -5, months: 3, all: true } },
    ],
  },
  {
    id: "floods", repeat: 15, icon: "🌧️", title: "Flash floods", from: 1966, to: 2300, town: "random",
    text: (c) => `A freak storm flooded shops and car parks in ${c.town}. The drains can't cope.`,
    variants: [
      { id: "underpass", text: (c) => `A flash flood trapped cars in an underpass in ${c.town}. Firefighters had to pull drivers out through their windows.` },
      { id: "market", town: "market", text: (c) => `Heavy rain flooded the market in ${c.town} overnight. Stallholders lost their stock and want help.` },
      { id: "tide", cond: (w) => w.year >= 2000, text: (c) => `A king tide and a storm arrived together. Low-lying streets near the sea in ${c.town} are under water.`, opts: { drain: { label: "Build tidal gates and bigger drains", pros: ["Ready for higher seas"] } } },
    ],
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
      { id: "half", label: "Offer half", pros: ["Some tax kept"], cons: ["They might walk"], chance: 0.5, okText: "They accepted.", effect: { jobs: 1.03, comDemand: 0.15, months: 120 } },
      { id: "no", label: "No special deals", pros: ["Fair to everyone"], cons: ["Jobs go elsewhere"] },
    ],
  },
  {
    id: "mrtFault", repeat: 15, icon: "🚇", title: "Train breakdowns", from: 1995, to: 2300, town: "mrt", cond: (w, A) => A.mrtRunning,
    text: (c) => `The MRT line through ${c.town} has broken down three times this month. Commuters are fuming.`,
    variants: [
      { id: "power", history: true, text: (c) => `A power fault stopped trains between stations near ${c.town} at rush hour. Hundreds of passengers were stuck in hot carriages for over an hour.`, opts: { renew: { label: "Replace the old power rails", pros: ["Reliable trains for years"] } } },
      { id: "flood", history: true, cond: (w) => w.structs.some((st) => st.type === "mrtUg"), text: (c) => `Rainwater flooded an MRT tunnel near ${c.town} and stopped trains for a whole morning. The pumps had not been maintained.`, opts: { renew: { label: "Flood-proof the tunnels and pumps", pros: ["Tunnels stay dry"], cons: ["Costly, night closures"] }, patch: { label: "Clean the pumps", cons: ["It could happen again"] } } },
      { id: "crowd", text: (c) => `Trains through ${c.town} are so packed at rush hour that people wait for three trains before they can squeeze on.`, opts: { renew: { label: "Buy more trains and run them more often", pros: ["Shorter waits for years"], cons: ["Costly"] }, patch: { label: "Ask people to travel off-peak", pros: ["Cheap"], cons: ["Few people change", "Crowds return"] } } },
    ],
    options: [
      { id: "renew", label: "Replace the old signalling", pros: ["Reliable trains for years"], cons: ["Costly, weekend closures"], cost: 900, mood: [-1, 6], needs: { transport: 6, months: 240, all: true }, log: "renewed the MRT signalling system" },
      { id: "patch", label: "Patch it up", pros: ["Cheap"], cons: ["Breakdowns will return"], cost: 150, later: { months: 30, chance: 0.6, text: "The patched MRT line broke down again during rush hour.", angerAll: 0.5 } },
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
    id: "shipyard", repeat: 20, icon: "🔥", title: "Industrial accident", from: 1970, to: 2100, cond: (w) => w.lots.some((l) => l.zone === "ind" && l.b),
    text: () => "An explosion at a shipyard has injured workers. Unions demand tougher safety rules.",
    baseCond: (w) => ["west", "south", "north"].includes(w.region),
    variants: [
      { id: "factory", town: "ind", text: (c) => `A fire at a factory in ${c.town} has injured workers. Unions say safety checks were skipped to save money.` },
      { id: "crane", town: "building", text: (c) => `A crane collapsed on a building site in ${c.town}. Workers were hurt and the road below was closed for days.` },
      { id: "leak", town: "ind", cond: (w) => w.year >= 1980, text: (c) => `A chemical leak at a plant in ${c.town} sent nearby residents to hospital with breathing problems.`, opts: { rules: { pros: ["Safer workplaces", "Residents feel safer"] }, fine: { cons: ["Residents angry", "Workers unhappy"] } } },
    ],
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
      { id: "watch", label: "Monitor closely", pros: ["Cheap"], cons: ["Small risk of outbreak"], later: { months: 6, chance: 0.3, text: "Bird flu spread to a farm worker, causing panic in the markets.", angerAll: 0.4, mood: [-2, 4] } },
    ],
  },
  {
    id: "busStrike", repeat: 25, icon: "🚌", title: "Bus drivers' strike", from: 1980, to: 2300,
    text: () => "Bus drivers have walked off the job over pay and dormitory conditions.",
    variants: [
      { id: "old", town: "worst:transport", title: "Breaking-down buses", text: (c) => `Old buses keep breaking down in ${c.town}. Commuters wait 40 minutes in the sun for the next one.`, opts: { pay: { label: "Help pay for newer buses", pros: ["Reliable service"], cons: ["Ongoing cost"] }, talk: { label: "Make the bus company fix it", pros: ["No cost to you"], cons: ["Weeks of bad service"] }, hard: { label: "Tell commuters to be patient", pros: ["No new costs"], cons: ["Commuters fume", "Bad headlines"] } } },
      { id: "fares", title: "Bus fares going up", text: () => "The bus company wants to raise fares. Commuter groups say families on low incomes can't afford it.", opts: { pay: { label: "Subsidise fares for low-income families", pros: ["Fares stay affordable"], cons: ["Ongoing cost"] }, talk: { label: "Let an independent fare council decide", pros: ["Seen as fair"], cons: ["Weeks of argument"] }, hard: { label: "Let the fares rise", pros: ["No new costs"], cons: ["Everyone pays more", "Bad headlines"] } } },
      { id: "route", town: "worst:transport", title: "No bus to town", text: (c) => `Residents of ${c.town} are petitioning for a direct bus to the city. Today the trip needs three changes.`, opts: { pay: { label: "Fund a new express route", pros: ["Faster trips"], cons: ["Ongoing cost"] }, talk: { label: "Ask the operator to study it", pros: ["Cheap"], cons: ["Residents wait months"] }, hard: { label: "Say the network is fine", pros: ["No new costs"], cons: ["Residents feel ignored"] } } },
    ],
    options: [
      { id: "pay", label: "Raise their pay", pros: ["Buses back tomorrow"], cons: ["Ongoing cost"], costMonthly: 12, trust: 1 },
      { id: "talk", label: "Mediate between company and drivers", pros: ["Fair deal"], cons: ["Two weeks of chaos"], needs: { transport: -8, months: 1, all: true }, rep: 1 },
      { id: "hard", label: "Take a hard line", pros: ["No new costs"], cons: ["Workers angry", "Bad headlines"], angerAll: 0.5, rep: -2, tone: "bad" },
    ],
  },
  {
    id: "festival", repeat: 20, icon: "🏮", title: "Festival in the void deck", from: 1966, to: 2300, town: "random",
    text: (c) => `Residents of ${c.town} want to hold a big getai and festival in the void decks. Some neighbours worry about the noise.`,
    variants: [
      { id: "raya", title: "Hari Raya bazaar", text: (c) => `Families in ${c.town} want to hold a Hari Raya bazaar in the car park for a month. Drivers will lose their spaces.` },
      { id: "deepavali", title: "Deepavali lights", text: (c) => `Residents in ${c.town} want Deepavali lights along the main road and a street bazaar on weekend nights.` },
      { id: "lantern", title: "Mid-Autumn lantern walk", text: (c) => `A residents' committee in ${c.town} wants a lantern walk for the Mid-Autumn Festival, with stalls in the void decks until late.` },
    ],
    options: [
      { id: "allow", label: "Allow it and help fund it", pros: ["Community spirit"], cons: ["Noise complaints"], cost: 60, needs: { community: 8, months: 12 }, mood: [1, 2] },
      { id: "quiet", label: "Allow it with a 10pm curfew", pros: ["Everyone half happy"], cons: ["Organisers grumble"], needs: { community: 4, months: 12 } },
      { id: "ban", label: "Say no", pros: ["Peace and quiet"], cons: ["Seen as unfriendly"], anger: 0.3 },
    ],
  },
  {
    id: "trees", repeat: 20, icon: "🌳", title: "Falling trees", from: 1970, to: 2300, town: "random",
    text: (c) => `A storm brought down old rain trees in ${c.town}, crushing cars. Should all big trees be pruned hard?`,
    variants: [
      { id: "playground", title: "A falling branch", text: (c) => `A falling branch narrowly missed children at a playground in ${c.town}. Parents want every big tree checked.` },
      { id: "roots", title: "Cracked footpaths", text: (c) => `Roots of old trees in ${c.town} are cracking footpaths and lifting drain covers. Seniors are tripping at night.`, opts: { arborist: { label: "Fix the paths and keep the trees", pros: ["Shade stays", "Paths safe"] }, chop: { label: "Remove the trees" } } },
      { id: "tembusu", title: "A heritage tree", cond: (w) => w.year >= 2001, text: (c) => `Residents in ${c.town} want a 100-year-old tembusu tree protected, but it stands in the way of a new road.`, opts: { arborist: { label: "Protect it and bend the road", pros: ["Residents proud", "A landmark kept"], cons: ["The road costs more"] }, chop: { label: "Cut it down for the road", pros: ["Road built on time"], cons: ["Residents upset", "Less greenery"] } } },
    ],
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
    id: "topup", repeat: 12, icon: "🏛️", title: "Central government offer", from: 1966, to: 2300, cond: (w) => w.cash < 6000,
    text: () => "The Ministry offers your region an emergency top-up, but wants you to hand over control of some land in return.",
    variants: [
      { id: "loan", title: "A loan offer", text: () => "A government fund offers your region a low-interest loan, to be repaid from future land sales.", opts: { take: { label: "Take the loan", pros: ["Cash now"], cons: ["Less from land sales for 10 years"], rep: -1, trust: -1, effect: { land: 0.94, months: 120 } }, refuse: { label: "Manage without it" } } },
      { id: "developer", title: "A developer's deal", cond: (w) => w.year >= 1975, text: () => "A big developer offers cash up front in exchange for first pick of your best land for 10 years.", opts: { take: { label: "Take the deal", pros: ["Cash now"], cons: ["The developer gets the best sites", "Looks like a sell-out"], rep: -4, effect: { land: 0.92, months: 120 } }, refuse: { label: "Keep the land for residents" } } },
    ],
    options: [
      { id: "take", label: "Take the money", pros: ["Cash now"], cons: ["Less say over your land", "Looks weak"], gain: 2500, rep: -3, trust: -2 },
      { id: "refuse", label: "Manage on our own", pros: ["Independence"], cons: ["Tight budget"], rep: 1 },
    ],
  },
  {
    id: "scandal", repeat: 20, icon: "📰", title: "Town council scandal", from: 1970, to: 2300, town: "random",
    text: (c) => `The newspapers report that ${c.town}'s town council paid a contractor linked to an official. People expect you to act.`,
    variants: [
      { id: "lifts", text: (c) => `Residents in ${c.town} say the town council billed for lift repairs that were never done. Seniors have climbed stairs for weeks.` },
      { id: "tender", text: (c) => `An officer at ${c.town}'s town council is accused of leaking tender prices to a friend's company.` },
      { id: "fund", text: (c) => `Money from a ${c.town} fund meant for needy families was spent on staff dinners and trips.` },
    ],
    options: [
      { id: "probe", label: "Independent investigation", pros: ["Clean government", "Trust rises"], cons: ["Embarrassing headlines"], cost: 100, trust: 4, rep: 2, mood: [-1, 3], log: "ordered an independent probe into a town council scandal" },
      { id: "quiet", label: "Handle it quietly", pros: ["No fuss"], cons: ["If it leaks, trust collapses"], later: { months: 18, chance: 0.5, text: "The cover-up leaked. Residents feel betrayed.", trust: -10, rep: -5, angerAll: 0.5 } },
    ],
  },
  {
    id: "cats", repeat: 25, icon: "🐈", title: "Community cats", from: 2000, to: 2300, town: "random",
    text: (c) => `Residents in ${c.town} are split over stray cats: some feed them, others complain about the mess.`,
    variants: [
      { id: "dogs", title: "Stray dogs", text: (c) => `A pack of stray dogs is roaming near a school in ${c.town}. Some parents are scared; animal groups want them rehomed.`, opts: { tnr: { label: "Catch, sterilise and rehome them", pros: ["Humane", "Children safe"] }, remove: { label: "Have them removed", cons: ["Animal lovers outraged"] } } },
      { id: "birds", title: "Birds at the food centre", town: "market", text: (c) => `Crows and mynahs are swarming the food centre in ${c.town}, and diners complain about droppings on the tables.`, opts: { tnr: { label: "Bird-proof the food centre", pros: ["Cleaner tables"], cons: ["Some cost"], cost: 80 }, remove: { label: "Cull the birds", cons: ["Animal groups object"] } } },
      { id: "monkeys", title: "Monkeys in the kitchen", cond: (w) => ["bukit", "central", "north"].includes(w.region), text: (c) => `Long-tailed macaques from the nature reserve are raiding kitchens and bins in ${c.town}.`, opts: { tnr: { label: "Monkey-proof bins and teach residents", pros: ["Humane", "Fewer raids over time"] }, remove: { label: "Trap and relocate them", cons: ["Nature groups object"] } } },
    ],
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
// Towns a card could be about: "random", "biggest", "worst:<need>", or towns
// that have the thing the card is about ("mrt", "ind", "building", "market").
export function townsFor(w, A, how) {
  const live = w.towns.map((t, i) => i).filter((i) => A.towns[i].pop > 0);
  const pool = live.length ? live : w.towns.map((_, i) => i);
  const has = (test) => pool.filter((i) => w.lots.some((l) => l.town === i && test(l)));
  const near = (types) => pool.filter((i) => w.structs.some((st) => types.includes(st.type) && st.state !== "build" && townOf(w, st.x, st.y) === i));
  if (how === "mrt") return pool.filter((i) => (A.liveStations || []).some((st) => townOf(w, st.x, st.y) === i));
  if (how === "ind") return has((l) => l.b && l.b.state !== "build" && LOT_TYPES[l.b.type]?.zone === "ind" && l.b.type !== "farm");
  if (how === "building") return has((l) => l.b?.state === "build");
  if (how === "market") return near(["market", "hawker"]);
  if (how === "school") return near(["school", "secondary"]);
  return pool;
}
export function pickTown(w, A, how, rng) {
  if (!how) return null;
  const pool = townsFor(w, A, how);
  if (!pool.length) return null;
  if (how === "biggest") return pool.reduce((a, b) => (A.towns[b].pop > A.towns[a].pop ? b : a), pool[0]);
  if (how.startsWith("worst:")) {
    const k = how.slice(6);
    return pool.reduce((a, b) => ((A.towns[b].needs[k] ?? 50) < (A.towns[a].needs[k] ?? 50) ? b : a), pool[0]);
  }
  return pool[Math.floor(rng() * pool.length)];
}

// ---------------- variants ----------------
// The same dilemma told different ways, so a card that comes back feels new.
// Each variant can have its own text, town rule and condition (an MRT fault
// only where trains run), and can change an option's wording or numbers.
// Only variants marked history: true carry the card's history note.
export const variantsOf = (d) => [{ id: "base", cond: d.baseCond, town: d.town, history: true }, ...(d.variants || []).map((v) => ({ town: d.town, ...v }))];
const variantOk = (w, A, d, v) => (!v.cond || v.cond(w, A)) && (!v.town || townsFor(w, A, v.town).length > 0);
function pickVariant(w, A, d, rng) {
  const ok = variantsOf(d).filter((v) => variantOk(w, A, d, v));
  if (!ok.length) return null;
  const seen = w.varSeen?.[d.id] || [];
  // ones not yet seen; for a card with a history note, the original comes first
  const fresh = ok.filter((v) => !seen.includes(v.id));
  const first = HISTORY[`dilemma:${d.id}`] && fresh[0]?.id === "base";
  const pool = fresh.length ? (first ? [fresh[0]] : fresh) : ok.filter((v) => v.id !== seen[seen.length - 1]);
  const v = (pool.length ? pool : ok)[Math.floor(rng() * (pool.length || ok.length))];
  w.varSeen = { ...(w.varSeen || {}), [d.id]: fresh.length ? [...seen, v.id] : [v.id] };
  return v;
}
export const variantOf = (d, vid) => (vid && vid !== "base" ? (d.variants || []).find((v) => v.id === vid) : null);

export const fill = (text, w, town) => (text || "").replace(/\{town\}/g, town != null ? w.towns[town].name : "the region");

// ---------------- ranges ----------------
// Effects are shown as a range (a 5% effect reads 2–8%) and the real value is
// rolled when the choice is made, so no two playthroughs go quite the same.
// Small numbers swing more (a 2-point effect reads 1–3) than big ones
// (a 20-point effect reads 14–26). Money always varies by ±30%.
export const spreadOf = (mag) => {
  const m = Math.abs(mag);
  return m <= 3 ? 0.5 : m >= 10 ? 0.3 : 0.5 - ((m - 3) / 7) * 0.2;
};
export const MONEY_SPREAD = 0.3;
const MONEY = 1e9; // "magnitude" that always picks the money spread
export const rollIn = (v, rng = Math.random, mag = v) => {
  const sp = spreadOf(mag);
  return v * (1 - sp + rng() * 2 * sp);
};
// multipliers like 0.9 vary by the size of the change in %, not of the 0.9
const rollDev = (v, rng) => 1 + rollIn(v - 1, rng, (v - 1) * 100);
const ROLL_KEYS = ["trust", "rep", "fert", "health", "waitlist", "gain", "anger", "angerAll", "kill"];
export function rollOutcome(o, rng = Math.random) {
  if (!o || o.rolled) return o;
  const out = { ...o, rolled: true };
  const magOf = { fert: 100, kill: 100, gain: MONEY, waitlist: MONEY };
  for (const k of ROLL_KEYS) if (typeof o[k] === "number" && o[k]) out[k] = rollIn(o[k], rng, magOf[k] === MONEY ? MONEY : o[k] * (magOf[k] || 1));
  if (o.mood) out.mood = [rollIn(o.mood[0], rng), o.mood[1]];
  if (o.effect) {
    out.effect = {};
    for (const [k, v] of Object.entries(o.effect)) out.effect[k] = k === "months" ? v : MULT.includes(k) ? rollDev(v, rng) : rollIn(v, rng, k.endsWith("Demand") ? v * 100 : v);
  }
  if (o.needs) {
    out.needs = {};
    for (const [k, v] of Object.entries(o.needs)) out.needs[k] = k === "months" || k === "all" ? v : rollIn(v, rng);
  }
  if (o.crisis) out.crisis = rollDev(o.crisis, rng);
  return out;
}
// "+2–8%" for a range around v, or "+5%" once rolled
export function fmtRange(v, { exact = false, unit = "", dp = 0, spread = null } = {}) {
  const SPREAD = spread ?? spreadOf(v);
  const r = (x) => (dp ? Math.round(x * 10 ** dp) / 10 ** dp : Math.round(x));
  const sg = v > 0 ? "+" : "−";
  const a = Math.abs(v);
  if (exact) return `${sg}${r(a).toLocaleString("en-SG")}${unit}`;
  const lo = Math.max(dp ? 0.1 : 1, r(a * (1 - SPREAD)));
  const hi = Math.max(lo, r(a * (1 + SPREAD)));
  return lo === hi ? `${sg}${lo.toLocaleString("en-SG")}${unit}` : `${sg}${lo.toLocaleString("en-SG")}–${hi.toLocaleString("en-SG")}${unit}`;
}

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
  o = rollOutcome(o, rng);
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
  if (o.petition && town != null) settlePetition(w, town, o.petition);
  if (o.offer) w.offers = { ...(w.offers || {}), [o.offer]: w.t + 36 };
  if (o.quarry) {
    for (const st of w.structs.filter((x) => x.type === "quarry")) {
      if (o.quarry === "fill") {
        w.structs = w.structs.filter((x) => x !== st);
        refillLots(w, st.x, st.y, 4);
      } else st.type = o.quarry;
    }
    w.rev++;
  }
  if (o.ktm) {
    for (const s of w.segs) if (s.type === "ktm") {
      s.type = o.ktm;
      if (o.ktm === "road") genLots(w, s);
    }
    w._occ = null;
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
export function describeEffects(w, o, town, opts = {}) {
  const ex = !!(opts.exact || o.rolled);
  const R = (v, unit = "", dp = 0) => fmtRange(v, { exact: ex, unit, dp });
  const out = [];
  const where = town != null ? w.towns[town]?.name : "every town";
  if (o.trust) out.push({ t: `Trust ${R(o.trust)}`, good: o.trust > 0 });
  if (o.rep) out.push({ t: `Reputation ${R(o.rep)}`, good: o.rep > 0 });
  if (o.mood) out.push({ t: `Mood ${R(o.mood[0])} for ${yrs(o.mood[1])}`, good: o.mood[0] > 0 });
  if (o.anger) out.push({ t: `Anger in ${where}`, good: false });
  if (o.angerAll) out.push({ t: "Anger in every town", good: false });
  if (o.needs) {
    const { months, all, ...nd } = o.needs;
    for (const [k, v] of Object.entries(nd)) out.push({ t: `${NEED_ICON[k] || ""} ${k} ${R(v)} in ${all || town == null ? "every town" : where} for ${yrs(months || 12)}`, good: v > 0 });
  }
  if (o.effect) {
    const { months, ...eff } = o.effect;
    for (const [k, v] of Object.entries(eff)) {
      if (k === "mood") out.push({ t: `Mood ${R(v)} for ${yrs(months || 12)}`, good: v > 0 });
      else if (EFF_NAME[k]) {
        const pct = k.endsWith("Demand") ? v * 100 : (v - 1) * 100;
        const good = k === "upkeep" ? pct < 0 : pct > 0;
        out.push({ t: `${EFF_NAME[k]} ${R(pct, "%")} for ${yrs(months || 12)}`, good });
      }
    }
  }
  if (o.crisis) out.push({ t: `Crisis impact ${R((o.crisis - 1) * 100, "%")}`, good: o.crisis < 1 });
  if (o.crisisMonths) out.push({ t: `Crisis ${o.crisisMonths < 0 ? "ends" : "lasts"} ${Math.abs(o.crisisMonths)} months ${o.crisisMonths < 0 ? "sooner" : "longer"}`, good: o.crisisMonths < 0 });
  if (o.fert) out.push({ t: `Births ${R(o.fert * 100, "%")}`, good: o.fert > 0 });
  if (o.health) out.push({ t: `Life expectancy ${R(o.health, " yrs", 1)}`, good: o.health > 0 });
  if (o.waitlist) out.push({ t: `Housing queue ${R(o.waitlist * scaleOf(w))}`, good: false });
  if (o.later) out.push({ t: o.later.chance != null ? `🎲 ${Math.round(o.later.chance * 100)}% risk later` : "⏳ Consequences later", good: false });
  return out;
}

// ---------------- decisions ----------------
// The card the player sees for w.decision
export function getDecision(w) {
  const d = w.decision;
  if (!d) return null;
  if (d.kind.startsWith("fantasy")) return fantasyCard(w);
  let def;
  let title;
  let text;
  let icon;
  let tag;
  let options;
  if (d.kind === "dilemma") {
    def = DILEMMA[d.id];
    if (!def) return null;
    const v = variantOf(def, d.v);
    title = v?.title || def.title;
    text = (v?.text || def.text)({ town: d.town != null ? w.towns[d.town].name : "the region" });
    icon = v?.icon || def.icon;
    tag = "Decision";
    options = def.options.map((o) => (v?.opts?.[o.id] ? { ...o, ...v.opts[o.id] } : o));
  } else {
    const C = CRISES[d.id];
    if (!C) return null;
    def = d.kind === "crisis" ? C : d.kind === "crisisMid" ? C.mid : C.mid?.second;
    title = d.kind === "crisis" ? C.name : def.title;
    text = def.text;
    icon = C.icon;
    tag = d.kind === "crisis" ? "Crisis" : C.name;
  }
  options = brokeOptions(w, options || def.options || def.choices, d, title);
  return {
    kind: d.kind,
    icon,
    title,
    text,
    tag,
    hint: d.kind === "crisis" ? CRISES[d.id].hint : null,
    // raw: the option as written, before costs are scaled to the region
    options: options.map((o) => ({ ...o, ...optionCost(w, o), raw: o, effects: describeEffects(w, o, d.town) })),
  };
}

// With no money for any option that costs something, the cheapest can be paid
// by borrowing (at a premium). If every option costs money, there is one more
// choice: do nothing, at a heavy price.
// The lesson: keep reserves for the day something goes wrong.
const BORROW = 1.25;
function brokeOptions(w, options, d, title) {
  if (w.sandbox) return options;
  const cost = (o) => optionCost(w, o).cost;
  const paid = options.filter((o) => cost(o) > 0);
  if (!paid.length || paid.some((o) => cost(o) <= w.cash)) return options;
  const cheapest = paid.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  // a free option is already there: borrowing is the only thing to add
  const free = paid.length < options.length;
  const need = options.map((o) => o.needs && Object.keys(o.needs).find((k) => k !== "months" && k !== "all")).find(Boolean);
  const crisis = d.kind !== "dilemma";
  const ignore = {
    id: "ignoreBroke",
    label: "Do nothing: there's no money",
    pros: ["Costs nothing today"],
    cons: ["The problem is left to grow", "Residents feel abandoned", "Trust and reputation take a big hit"],
    trust: -8,
    rep: -5,
    angerAll: 0.8,
    mood: [-3, 18],
    ...(need ? { needs: { [need]: -14, months: 36, all: true } } : {}),
    ...(crisis ? { crisis: 1.35, crisisMonths: 6 } : {}),
    tone: "bad",
    log: `did nothing about "${title}" because the treasury was empty`,
    okText: "💸 With an empty treasury there was nothing to fix it with. Mayors keep reserves for moments like this: aim to keep a few months of spending in the bank.",
  };
  return [
    ...options.map((o) =>
      o === cheapest
        ? { ...o, cost: o.cost * BORROW, debt: true, cons: [...(o.cons || []), `Paid with borrowed money: costs ${Math.round((BORROW - 1) * 100)}% more`] }
        : o,
    ),
    ...(free ? [] : [ignore]),
  ];
}

export function decide(w, optId, push, rng = Math.random) {
  const d = w.decision;
  if (!d) return;
  if (d.kind.startsWith("fantasy")) return decideFantasy(w, optId, push, rng);
  const card = getDecision(w);
  const o = card?.options.find((x) => x.id === optId);
  w.decision = null;
  if (!o) return;
  recordHistory(w, d, optId, o.label);
  let ok = true;
  if (o.chance != null && rng() > o.chance) {
    ok = false;
    if (o.failText) push(fill(o.failText, w, d.town));
  }
  const rolled = ok ? rollOutcome({ ...(o.raw || o), chance: null }, rng) : null;
  if (ok) applyOutcome(w, rolled, d.town, push, rng);
  if (d.kind === "crisis" && w.crisis) w.crisis.choice = optId;
  if (ok && o.log) w.log.push({ year: w.year, text: fill(o.log, w, d.town), tone: o.tone || "good" });
  if (ok && o.later) w.followups.push({ at: w.t + o.later.months, kind: d.kind, id: d.id, opt: optId, town: d.town });
  if (d.kind === "dilemma") w.dilemmaLog.push({ t: w.t, id: d.id, opt: optId });
  if (ok) trackImpact(w, `your "${o.label}" decision`, d.town, o.needs ? Object.keys(o.needs).find((k) => k !== "months" && k !== "all") : null);
  const res = ok ? describeEffects(w, rolled, d.town).filter((e) => !e.t.startsWith("🎲") && !e.t.startsWith("⏳")) : [];
  const money = ok && rolled.gain ? ` +${optionCost(w, rolled).gain >= 1000 ? `$${(optionCost(w, rolled).gain / 1000).toFixed(1)}M` : `$${optionCost(w, rolled).gain}K`}.` : "";
  push(`${card.icon} ${card.title}: you chose "${o.label}".${res.length ? ` 🎲 How it turned out: ${res.map((e) => e.t).join(", ")}.` : ""}${money}`);
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

  // fantasy mode: lasting states, spreading zones, random stories
  stepFantasy(w, A, rng, push);

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
      w.crisisEndT = w.t;
    }
    return;
  }

  // start a historical crisis on its date, or a future one when scheduled
  for (const id of HISTORIC) {
    const C = CRISES[id];
    if (w.year === C.year && w.month === C.month && !w.crisesPast.some((p) => p.id === id)) return startCrisis(w, id, rng, push);
  }
  if (w.year >= 2027 && w.nextFuture != null && w.t >= w.nextFuture && !fantasyOn(w) && w.fantasy && !w.decision) {
    const pool = FUTURE.filter((id) => !w.crisesPast.slice(-2).some((p) => p.id === id));
    const id = pool[Math.floor(rng() * pool.length)];
    w.nextFuture = w.t + Math.round((10 + rng() * 14) * 12);
    return startCrisis(w, id, rng, push);
  }

  // random dilemmas: irregular gaps, never during a crisis or election season,
  // most happen only once a game and recurring ones need years between them
  // decision cards due on their real dates in this region (not mid-campaign)
  const inCampaign = w.election && w.t >= w.election.next - 6 && w.t < w.election.next;
  for (const sc of REGIONS[w.region]?.scheduled || []) {
    if (w.decision || inCampaign || w.year < sc.year || w.schedDone?.[sc.id] != null) continue;
    w.schedDone = { ...(w.schedDone || {}), [sc.id]: w.t };
    w.decision = { kind: "dilemma", id: sc.id, town: null };
  }
  // campuses that were promised land but never got it go elsewhere
  for (const [k, until] of Object.entries(w.offers || {})) {
    if (w.t < until) continue;
    delete w.offers[k];
    w.rep = clamp((w.rep ?? 50) - 2, 0, 100);
    push(`🎓 ${STRUCTS[k].name} gave up waiting for a site and went to another region. Reputation −2.`);
  }
  if (!w.decision && w.t >= w.nextDilemma) {
    const quiet = w.crisis || fantasySevere(w) || (w.election && w.t >= w.election.next - 6 && w.t < w.election.next) || (w.crisesPast.length && w.t - (w.crisisEndT ?? -99) < 6);
    if (quiet) {
      w.nextDilemma = w.t + 6 + Math.floor(rng() * 6);
      return;
    }
    const last = {};
    for (const x of w.dilemmaLog) last[x.id] = x.t;
    const fits = DILEMMAS.filter((d) => {
      if (w.year < d.from || w.year > d.to) return false;
      if (d.scheduled || (d.region && d.region !== w.region)) return false;
      if (d.cond && !d.cond(w, A)) return false;
      return variantsOf(d).some((v) => variantOk(w, A, d, v));
    });
    // no repeats while there are cards you haven't seen; then the ones seen longest ago
    const unseen = fits.filter((d) => last[d.id] == null);
    const again = fits.filter((d) => last[d.id] != null && d.repeat && w.t - last[d.id] >= d.repeat * 12);
    const pool = unseen.length ? unseen : again;
    if (pool.length) {
      // newer issues are a little more likely than ones that have been waiting since the 1960s
      const weights = pool.map((d) => (unseen.length ? 1 + (w.year - d.from < 10 ? 1 : 0) : (w.t - last[d.id]) / 120) + rng());
      let r = rng() * weights.reduce((a, b) => a + b, 0);
      let d = pool[0];
      for (let k = 0; k < pool.length; k++) {
        r -= weights[k];
        if (r <= 0) {
          d = pool[k];
          break;
        }
      }
      const v = pickVariant(w, A, d, rng);
      if (v) w.decision = { kind: "dilemma", id: d.id, v: v.id, ...(v.id !== "base" && v.history ? { hist: true } : {}), town: pickTown(w, A, v.town, rng) };
    }
    // the next one comes 2½ to 5½ years later, sometimes with a longer lull
    w.nextDilemma = w.t + 30 + Math.floor(rng() * 36) + (rng() < 0.25 ? 18 : 0) + (fantasyOn(w) ? 24 : 0);
  }
}

function startCrisis(w, id, rng, push) {
  const C = CRISES[id];
  const sev = 0.8 + rng() * 0.45;
  w.crisis = { id, start: w.t, startYear: w.year, until: w.t + C.months, sev, mit: null };
  w.decision = { kind: "crisis", id };
  push(`${C.icon} CRISIS: ${C.name}. ${C.text}`);
}

// AI choice for bots and tests
export function autoDecide(w, push, rng = Math.random) {
  const card = getDecision(w);
  if (!card) return;
  const affordable = card.options.filter((o) => o.cost <= Math.max(0, w.cash) * 0.4);
  const pick = (affordable.length ? affordable : card.options)[0];
  decide(w, pick.id, push, rng);
}
