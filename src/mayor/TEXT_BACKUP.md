# Text backup: tone pass (October 2026)

Every line of game text changed in the secondary-level tone pass, old first, new second.
To undo everything, restore the files from the commit before the pass:

    git checkout b488e10ed96b12a8b5ff068d4eaad229e5f5c049 -- src/mayor/<file>

(Only text changed in this pass; check the diff before restoring a file that later commits also touched.)


## 1 Title & framing

- `MayorApp.jsx`
  - old: Run one region of Singapore from 1965. Draw curving roads, grow kampongs into modern towns, and win an election every 6 years.
  - new: 1965. A new nation, short of homes, jobs and land. Plan one region of Singapore through a century of growth, crises and elections.
- `panels.jsx`
  - old: It's 1965 and you're the mayor of one region of a brand-new nation. Families are crowded into kampongs and waiting for homes. Build them a city, and keep them happy enough to re-elect you.
  - new: It's 1965 and you're the mayor of one region of a brand-new nation. Families are crowded into kampongs and waiting for homes. Build them a city, and keep their support at the ballot box. (The mayor in this game is a fictional role combining planning, housing and town-council powers. Singapore's real mayors lead Community Development Councils.)
- `defs.js`
  - old: 🇸🇬 9 Aug 1965: Singapore is independent! You are mayor of your region. Kampong families are waiting for modern homes.
  - new: 🇸🇬 9 Aug 1965: Singapore is independent. You are mayor of your region, and kampong families are waiting for modern homes.
- `MayorApp.jsx`
  - old: 👋 Welcome, Mayor! New here? Open 📰 News any time and tap 📖 How to play.
  - new: 👋 Welcome, Mayor. New here? Open 📰 Bulletins at any time and tap 📖 How to play.

- `MayorApp.jsx` (added)
  - old: (none)
  - new: The mayor here is a fictional role combining planning, housing and town-council powers. Singapore's real mayors lead Community Development Councils.

## 2 Regions & difficulty

- `regions.js`
  - old: tip: "Good for beginners: lots of open land."
  - new: tip: "Open land, few constraints. Recommended first region."
- `regions.js`
  - old: tip: "Industry-focused: balance jobs against pollution."
  - new: tip: "An industrial region: balance jobs against pollution."
- `regions.js`
  - old: tip: "Hardest start: little free land, lots of old buildings."
  - new: tip: "The hardest start: little free land and many old buildings."
- `regions.js`
  - old: tip: "Gateway region: trade income from the Causeway."
  - new: tip: "A gateway region: trade income from the Causeway."
- `regions.js`
  - old: tip: "Tourism region: Sentosa has its own visitor economy."
  - new: tip: "A tourism region: Sentosa runs its own visitor economy."
- `regions.js`
  - old: tip: "Land-limited: a protected hill, big campuses and nature to weigh against homes."
  - new: tip: "Land is tight: a protected hill, large campuses and nature to weigh against homes."
- `defs.js`
  - old: desc: "Generous budget, can't be voted out"
  - new: desc: "Larger budget; you can't lose an election"
- `defs.js`
  - old: desc: "Win each election to stay mayor"
  - new: desc: "Win each election to stay in office"
- `defs.js`
  - old: desc: "Tight money, demanding voters"
  - new: desc: "Tight budget, critical voters"
- `sim.js`
  - old: desc: "Win elections to stay mayor. Play as long as you like."
  - new: desc: "Win elections to stay in office, for as long as you can."
- `sim.js`
  - old: desc: "Relaxed: you can't be voted out or go bust. Keep building forever."
  - new: desc: "No elections to lose and no bankruptcy. Build without limits."
- `sim.js`
  - old: desc: "1965–2065. Be the best mayor you can, judged every decade against AI mayors."
  - new: desc: "1965–2065. Judged every decade against the mayors of the other regions."
- `sim.js`
  - old: desc: "1965–2165. The long game: two centuries of crises, booms and elections."
  - new: desc: "1965–2165. Two centuries of crises, booms and elections."

## 3 Goals & hints

- `sim.js`
  - old: text: "Draw a new road"
  - new: text: "Build your first road"
- `sim.js`
  - old: Pick 🛣️ Roads → Road. Tap where it starts, tap where it ends, drag the round handle to curve it, then ✓ Build.
  - new: 🛣️ Roads → Road. Tap the start, then the end; drag the round handle to curve it, then ✓ Build.
- `sim.js`
  - old: Pick 🏘️ Zones → HDB and paint along the road with one finger. Lots turn green.
  - new: 🏘️ Zones → HDB, then paint along the road with one finger. Zoned lots turn green.
- `sim.js`
  - old: text: "Finish your first flats", hint: "Press ▶ and wait. Cranes appear, then families move in."
  - new: text: "Complete your first flats", hint: "Resume time (▶). Construction takes several months before families move in."
- `sim.js`
  - old: Keep zoning HDB beside roads and add a school and clinic so blocks keep coming.
  - new: Keep zoning HDB beside roads, and add schools and clinics so that demand for flats stays high.
- `sim.js`
  - old: hint: "Bigger, modern estates and good transport."
  - new: hint: "Requires higher-density estates and strong transport links."
- `objectives.js`
  - old: Tap an old HDB block and use 🏗️ Renew. Check where residents will go first!
  - new: Tap an old HDB block and use 🏗️ Renew. Check where residents will be rehoused first.
- `panels.jsx`
  - old: ["🛣️ Curvy roads",
  - new: ["🛣️ Roads",
- `panels.jsx`
  - old: "New blocks are built over months. Watch the cranes, then families move in."
  - new: "Construction takes several months. Residents move in once blocks are finished."
- `panels.jsx`
  - old: "(all done!)"
  - new: "(all complete)"

## 4 News & toasts

- `sim.js`
  - old: `🎉 ${name} opens in ${w.towns[ti].name}!${note}`
  - new: `🎉 ${name} opens in ${w.towns[ti].name}.${note}`
- `sim.js`
  - old: " The first of its kind in Singapore: your reputation soars!"
  - new: " The first of its kind in Singapore: your reputation rises sharply."
- `sim.js`
  - old: "Everyone's fairly happy for now. Nothing urgent here!"
  - new: "No pressing concerns at the moment."
- `sim.js`
  - old: you won ${rec.share}% of the vote! Next election
  - new: you won ${rec.share}% of the vote. Next election
- `sim.js`
  - old: you stay on, but residents want change!`
  - new: you stay on, but residents want change.`
- `sim.js`
  - old: "🏝️ Sentosa is packed! Queues
  - new: "🏝️ Sentosa is overcrowded. Queues
- `sim.js`
  - old: `🗳️ Election season! Polling day is
  - new: `🗳️ Election season has begun. Polling day is
- `sim.js`
  - old: "Done!"
  - new: "Done."
- `objectives.js`
  - old: `🎯 Objective complete: ${o.text}! Bonus
  - new: `🎯 Objective complete: ${o.text}. Bonus
- `MayorApp.jsx`
  - old: toast(`🚫 Not enough money: this costs ${fmtMoney(cost)}.`
  - new: toast(`🚫 Insufficient funds: ${fmtMoney(cost)} required.`
- `MayorApp.jsx`
  - old: toast(`🏦 Even the bank won't lend that much. Save up first (you can borrow up to about ${fmtMoney(debtLimit(world) * 0.8)}).`
  - new: toast(`🏦 That exceeds your borrowing limit (about ${fmtMoney(debtLimit(world) * 0.8)}). Build up reserves first.`
- `MayorApp.jsx`
  - old: `You're mayor for another 6 years!`
  - new: `You remain mayor for another 6 years.`
- `MayorApp.jsx`
  - old: "You lost, but on Easy you stay on. Residents want change!"
  - new: "You lost, but on Easy you stay on. Residents want change."
- `MayorApp.jsx`
  - old: `Election season! Vote ${tToDate(w, w.election.next)}`
  - new: `Election season · polls ${tToDate(w, w.election.next)}`
- `panels.jsx`
  - old: "Election season!"
  - new: "Election season"
- `panels.jsx`
  - old: "Saved!"
  - new: "Saved"
- `panels2.jsx`
  - old: "Overcrowded! Add hotels or attractions"
  - new: "Overcrowded: add hotels or attractions"
- `world.js`
  - old: "That's Johor, across the border!"
  - new: "That's Johor, across the border."
- `world.js`
  - old: "That's Johor!"
  - new: "That's Johor."
- `rivals.js`
  - old: "You were the best mayor in Singapore this decade!"
  - new: "You were the best mayor in Singapore this decade."
- `defs.js`
  - old: "🚇 MRT technology arrives! Lay track, then build stations beside it."
  - new: "🚇 MRT technology arrives. Lay track, then build stations beside it."
- `defs.js`
  - old: "🔥 A fire swept through {kampong}! Families need new homes urgently."
  - new: "🔥 A fire swept through {kampong}. Families need new homes urgently."
- `defs.js`
  - old: "📉 Global recession! Business income falls for a year."
  - new: "📉 Global recession: business income falls for a year."
- `defs.js`
  - old: "📈 Investment boom! Firms want offices and factories."
  - new: "📈 Investment boom: firms want offices and factories."
- `defs.js`
  - old: "🌧️ Flash floods! Drain repairs cost money."
  - new: "🌧️ Flash floods: drain repairs are needed."
- `defs.js`
  - old: "🎉 Festive season! Residents are in a good mood."
  - new: "🎉 Festive season: residents are in a good mood."
- `defs.js`
  - old: "🦟 Dengue cluster! Towns without clinics get unhappy."
  - new: "🦟 Dengue cluster: towns without clinics grow unhappy."
- `defs.js`
  - old: "Stops fires. Kampongs burn easily!"
  - new: "Stops fires, which spread fast through kampongs."
- `events.js`
  - old: "The patched MRT line broke down again during rush hour!"
  - new: "The patched MRT line broke down again during rush hour."
- `events.js`
  - old: "Bird flu spread to a farm worker. Panic in the markets!"
  - new: "Bird flu spread to a farm worker, causing panic in the markets."
- `events.js`
  - old: "The cover-up leaked! Residents feel betrayed."
  - new: "The cover-up leaked. Residents feel betrayed."
- `events.js`
  - old: "They accepted!"
  - new: "They accepted."
- `events.js`
  - old: `${C.icon} CRISIS: ${C.name}! ${C.text}`
  - new: `${C.icon} CRISIS: ${C.name}. ${C.text}`

## 5 Decision cards

- `events.js`
  - old: "Oil prices have quadrupled overnight. Petrol, electricity and transport costs are soaring."
  - new: "Oil prices have roughly quadrupled within months. Petrol, electricity and transport costs are soaring."
- `events.js`
  - old: label: "Let the market sort it out"
  - new: label: "Leave it to the market"
- `events.js`
  - old: label: "Not our job"
  - new: label: "No new spending"
- `events.js`
  - old: end: "SARS is over. {result}"
  - new: end: "The SARS outbreak has ended. {result}"
- `events.js`
  - old: end: "Asia is recovering. {result}"
  - new: end: "The regional economy is recovering. {result}"
- `events.js`
  - old: end: "COVID-19 has become endemic. {result}"
  - new: end: "COVID-19 is now treated as endemic. {result}"

## 6 Menus & titles

- `panels.jsx`
  - old: ["📊", "Mayors' league", onRivals]
  - new: ["📊", "Regional rankings", onRivals]
- `panels.jsx`
  - old: ["🎁", "Programmes", onProgrammes]
  - new: ["🎁", "Policies & programmes", onProgrammes]
- `panels.jsx`
  - old: ["📊 Mayors' league", "AI mayors run the other regions.
  - new: ["📊 Regional rankings", "AI mayors run the other regions.
- `panels.jsx`
  - old: ["🎁 Programmes", "☰ Menu → Programmes (or 💰 Finances)
  - new: ["🎁 Policies & programmes", "☰ Menu → Policies & programmes (or 💰 Finances)
- `panels.jsx`
  - old: <Panel title="📰 Town news"
  - new: <Panel title="📰 Bulletins"
- `panels2.jsx`
  - old: <Panel title="📊 Mayors' league"
  - new: <Panel title="📊 Regional rankings"
- `panels2.jsx`
  - old: <Panel title="🎁 Programmes"
  - new: <Panel title="🎁 Policies & programmes"
- `MayorApp.jsx`
  - old: aria-label="Mayors' league"
  - new: aria-label="Regional rankings"
- `MayorApp.jsx`
  - old: : "League"}
  - new: : "Rankings"}

## 7 Resident comments

- `defs.js`
  - old: "Everything so expensive now!"
  - new: "Everything so expensive now."
- `defs.js`
  - old: "Nearest hawker centre is so far away!"
  - new: "Nearest hawker centre is so far away."
- `defs.js`
  - old: "Our little ones walk so far to school!"
  - new: "Our little ones walk so far to school."
- `defs.js`
  - old: "Bus so slow and crowded!"
  - new: "Bus so slow and crowded."
- `defs.js`
  - old: "The factory smoke is everywhere!"
  - new: "The factory smoke is everywhere."
- `defs.js`
  - old: "No canteen near the factories. Workers eat from tins!"
  - new: "No canteen near the factories. Workers eat from tins."
- `defs.js`
  - old: "Factory buses are always packed!"
  - new: "Factory buses are always packed."
- `defs.js`
  - old: "Office workers can't get to work on time!"
  - new: "Office workers can't get to work on time."
- `defs.js`
  - old: "Office workers can't find lunch nearby!"
  - new: "Office workers can't find lunch nearby."
- `defs.js`
  - old: "Rents are sky-high!"
  - new: "Rents are sky-high."
- `defs.js`
  - old: "Our town is getting better and better!"
  - new: "Our town is getting better and better."
- `defs.js`
  - old: "The new flats are so nice!"
  - new: "The new flats are very nice."
- `defs.js`
  - old: "Taxes going up again ah?"]
  - new: "Taxes going up again ah?", "Rent at the coffee shop went up again; the uncle says he might close."]
- `defs.js`
  - old: "Love the new hawker centre!"
  - new: "Love the new hawker centre."
- `sim.js`
  - old: "We're still waiting for a flat! Build more homes."
  - new: "We're still waiting for a flat. Build more homes."
- `sim.js`
  - old: `Thank you! ${NEEDS[x.need]?.name || x.need} is much better now
  - new: `Thank you. ${NEEDS[x.need]?.name || x.need} is much better now
