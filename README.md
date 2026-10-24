# Singapore P3 Math Quest

An endless-practice quiz app covering the Singapore Primary 3 Mathematics syllabus (place value, addition/subtraction, multiplication/division, fractions, money, measurement, time, geometry, and bar-model word problems, and P3 exam-style fraction word problems), with multiple-choice and key-in answer modes, streak targets, a mistake review book, and a drawing scratchpad.

## Colour Castle (colour vision game)

A second app at `colorvision.html` (`/mathquizSGPrimary/colorvision.html` on Pages) that teaches students about colour blindness. Pick whose eyes to look through (Everyday Eyes, Weak Green, No Green, Weak Red, No Red, No Blue, Grey World — each also shows its medical name), then find the right door out of three. Correct picks move you on; a wrong pick ends the run and shows what you saw next to the real colours. The "Dot Test" tab has app-generated Ishihara-style dot plates (not the copyrighted originals) whose numbers vanish for specific eyes, with eye-swapping and a "who can see it?" comparison. The "Story" tab covers the history of colour blindness (a timeline from 1777 to today, past stigma, famous colour-blind people, famous mix-ups, and a myth-or-fact quiz). The "See the World" tab has a swipe-to-compare picture, "colour twins", and a full colour table for grown-ups. Source: `src/colorvision/`.

## AI Explorer

A closable intro header lists each world's "I can…" learning outcomes and a suggested path (Brain → Factory → Zoo → History → Quiz); worlds can be linked directly with `ai.html#history`, `#brain`, `#factory`, `#zoo` or `#quiz`. Every world shows when its information was last checked. "History of AI" covers 1950 to today (including AI winters and Singapore's milestones) with a playable ELIZA, and "Quiz Time" draws 8 random questions from a bank covering every world, with explanations and links back.

A third app at `ai.html` (`/mathquizSGPrimary/ai.html` on Pages) that teaches P4–P6 students how AI and LLMs work. "Inside the Brain" follows a sentence as token "bugs" through tokenizing, embeddings, attention and layers to next-word prediction (a real in-browser trigram model with a temperature slider), plus demos of diffusion pictures, video frames, note-by-note music, a vibe-coding agent loop, and hallucination. "The AI Factory" walks through how a model is made (data, pre-training, compute, human feedback, testing), visits an animated data centre with a per-question energy and water meter, and covers training costs, environmental trade-offs and Singapore's data centres, with sourced figures. It ends with a balanced look at AI slop, deepfakes and how to spot fakes. "The Model Zoo" explains why there are so many AIs (size, specialists, open vs closed, languages), tours model families from the US, Europe, China, Singapore and beyond, and charts the US–China race using Stanford AI Index data. Source: `src/ai/`.

## Lion City Planner (city-building game)

A fourth app at `city.html` (`/mathquizSGPrimary/city.html` on Pages): a cartoon isometric city builder set in Singapore, made for phones (landscape or portrait) and computers. You are the chief planner from 1965, starting with a small ready-made town: draw roads and MRT lines, zone HDB flats, private housing, commercial and industrial land, and place hawker centres, schools, polyclinics, police posts, fire stations, parks, power stations and water plants. Tools unlock by era (MRT 1987, NEWater 2003, Gardens by the Bay 2012…), and imported water ends in 2061, so you need the Four National Taps. A budget (summary, taxes and housing grants, department funding, full sheet) covers property tax, corporate tax, GST, land sales, subsidised HDB flats, tourism and reserves returns; drawing on past reserves needs the President's approval. Approval comes from housing, jobs, cost of living, services, transport, utilities and clean air, with 5-yearly reviews (no game over on Easy).

Phone-friendly controls: one finger moves the map, two fingers pinch to zoom, and building is tap-based (tap to place, or tap a start and an end) with a ✓ Build / Cancel step and Undo. A "next goal" card explains what to do. Settings include bigger text and buttons, building without confirmation, and turning off animation (cars, MRT trains, boats and clouds). Saves automatically to the device. Source: `src/city/` (`sim.js` simulation, `art.js` building art, `render.js` renderer, `agents.js` moving traffic).

## Lion City Mayor (regional city builder)

A fifth app at `mayor.html` (`/mathquizSGPrimary/mayor.html` on Pages), and the follow-on to Lion City Planner (which stays playable). You are mayor of one region of Singapore from 1965: Tampines / Changi, Jurong / Tuas, Central / CBD / Orchard, Telok Blangah / Sentosa, or Woodlands / Causeway, each with its own coastline, rivers, towns, kampongs, old roads and history.

- Free-flowing building: draw curved roads (tap a start and an end, then drag the bend handle); building lots appear along both sides and follow the curve. Paint zones over lots with one finger.
- Housing that evolves by decade: emergency flats, HDB slab blocks, point blocks, New Generation flats, modern estates and BTO towers, alongside terraces, condos, shophouses, malls, offices, farms, factories, JTC flats and business parks. Construction takes months (with cranes).
- Renewal decisions: improve or resettle kampongs, upgrade ageing blocks (from 1989) or redevelop them (en bloc / SERS from 1995), and conserve shophouses in the Central region. Each choice costs money and time, and demolition or resettlement upsets residents for a while.
- Towns: every region has four towns, each with its own happiness, resident feedback and vote.
- Elections every 6 years from 1968, with an election season in which you can make up to 3 pledges. Kept promises build trust; broken ones cost votes. Lose the region-wide vote (on Normal or Hard) and you're out.
- Region landmarks unlock by year (Changi Airport, Jurong Bird Park, Marina Bay Sands, Woodlands Checkpoint and more), plus traffic, MRT trains, boats and clouds.
- Where people live: new flats fill gradually from the housing queue and from elsewhere in Singapore. Clearing homes (resettlement, redevelopment, roads, bulldozing) moves residents into empty flats in the same town first, then other towns, then the queue, and some leave the region. Renew options and demolition buttons show this estimate before you commit. Unhappy towns slowly lose residents.
- Finances: each term the central government sets a fixed block grant (plus a per-resident grant). The 💰 Finances panel has charts of regular income vs running costs for the region and each town (history solid, 6-year projection dashed, tap for values, a table view) and a treasury chart. Property tax, services funding and HDB grants are region-wide; estate maintenance (how fast blocks wear out) and S&CC charges are set per town, and the projection updates as you move the sliders.
- Society: fertility (births per woman) and life expectancy follow Singapore's national trends, nudged by housing, the queue, schools, clinics, clean air, mood and policies.
- Crises and decisions: real crises arrive on their real dates (British withdrawal 1968, oil shock 1973, 1985 recession, Asian financial crisis 1997, SARS 2003, global financial crisis 2008, COVID-19 2020), with an opening choice, follow-up decisions, and damage reduced by what you've built (jobs, reserves, clinics, transport, parks). After 2026, imagined crises (rising seas, a super-aged society, Pandemic X, AI automation, an energy shock) arrive at random. About 30 random dilemmas with trade-offs (street hawkers, road pricing, a casino resort, nursing homes, baby bonus, haze, MRT breakdowns, water security…) pop up in a different order each game, and some choices have consequences years later.
- Town purposes: plan each town as mixed, residential, commercial / CBD, industrial or heritage. The purpose sets what grows there (and what can't be zoned) and which needs residents expect, so a CBD isn't asked for wet markets and an industrial town cares more about jobs than parks.
- Sentosa (South region): a resort island run for visitors rather than residents. Build links (cable car 1974, road bridge 1992, Sentosa Express 2007) and attractions (Siloso Beach, Underwater World, Resorts World), set the entry fee and marketing, and manage crowding and visitor happiness.
- The Tuas Second Link to Johor (1998) can be built from the West region's western shore.
- Seeing results: decision cards list each option's effects in numbers, the top bar shows monthly cash flow and the 6-month happiness trend, and six months after a build or decision the news reports what changed.
- Map help: purple dashed town borders, coverage circles when placing or inspecting a service (with existing ones of the same kind), narrower roads so more lots fit between them, and services that fit along curved roads.
- Schools come in three levels (primary, secondary, polytechnic / university); residents say which level is missing. Feedback thanks you when a need is fixed and says when a town is happy, and pledges show their progress town by town.
- Landmarks & malls: a shopping-mall project lets you name the mall (regional suggestions or your own) and choose an open-air neighbourhood mall, a shopping centre or a high-end mall, each with its own cost, build time, upkeep and effects. Almost every landmark can be built in any region and renamed; projects take months or years to build. AI mayors build landmarks too: being first earns prestige, copying someone else's costs reputation and tourists. You can borrow for a landmark you can't afford, but while in debt you pay interest and other spending is frozen.
- Adaptive objectives: after the starter goals, new objectives are generated from the region's current state (weakest needs, housing queue, ageing blocks, deficits, births, unemployment, MRT coverage, rivals), each with a deadline and a bonus grant.
- Modes: Campaign, Sandbox (can't be voted out or go bust), and 100- or 200-year Legacy games. AI mayors with different styles run the other three regions; every 10 years a report card ranks you against them on happiness, housing, health, births, finances and reputation and summarises what each mayor did well, badly or innovatively. Legacy games end with a final verdict.

Source: `src/mayor/` (`world.js` terrain, roads and lots; `sim.js` simulation and budget; `housing.js` occupancy and relocation; `events.js` crises and dilemmas; `objectives.js`; `rivals.js` AI mayors and reports; `society.js` births and health; `charts.jsx`; `art.js` and `render.js` drawing; `MapView.jsx` touch input).

## Dice Grid (prototype)

A prototype game at `dicegrid.html` (`/mathquizSGPrimary/dicegrid.html` on Pages) for working out the rules of a new game. It is played on a chess board with chess moves, but every piece is a die: pawns are D4, knights D6, bishops D8, rooks D12, the queen D20 and the king D10. Every die starts at 1 and changes each time the piece moves: pawns, bishops and queens +1, rooks double, and knights reset to 1. The King doesn't grow by moving but gains +1 every turn. A capture doesn't count as a move for growth, so the attacker fights with its current number. Rooks are walls that any enemy can capture. Instead of moving, a pawn can zap a stronger enemy next to it (lowering its number by the pawn's) or boost a friend next to it until that friend moves (even past its die's limit); the pawn's die halves, and its side can't use a pawn action on its next turn. A knight adds the power of friendly pieces it jumps over until its next move, and loses it after capturing. Otherwise a piece can only capture an enemy with a lower number. Capture the enemy King, or trap him (under attack with no King move that escapes), to win. If only the two Kings are left, the side that captured more power (the numbers of the pieces it took) wins.

- Play against the computer (Easy, Medium, Hard, Expert), with 2 players on one device, or watch computer vs computer. Undo, a move log, a captured-pieces tray, and a "piece info" card that explains each die. The board shows which captures are allowed and marks enemies too strong to capture with ✕.
- Rules tab: change each piece's die and how much it grows per move, and try variations (King growth, rook walls, knight borrowing, surrounding a target for +1 per friend, swapping places on equal numbers, power deciding draws, helping Black with a weaker first move, starting number, whether this move's growth counts in the fight, what happens on equal numbers, capping or wrapping at the top face, capture bonuses, pawn first moves, promotion, draw length). The current rules are always summarised in plain English.
- Balance test tab: the computer plays itself 10–100 times with the current rules and reports win rates, game length, captures and how games ended.
- Notes tab: rule ideas saved on the device, with a button to copy the rules and notes together.

Source: `src/dicegrid/` (`engine.js` rules, `ai.js` computer player).

## Dice Grid Tactics (prototype)

A follow-on prototype at `dicetactics.html` (`/mathquizSGPrimary/dicetactics.html` on Pages) that takes Dice Grid's dice mechanics to a tabletop-wargame board. The board is 8 wide × 10 long; each side has a back row, an empty moat row and a row of Militia. Units are original pixel-art medieval sprites in team colours and move like chess pieces: Militia = pawn (D4), Cavalry = knight (D6), Archer = bishop (D8), Siege Tower = rook (D12), Champion = queen (D20), King = king (D10).

- Each turn both players secretly give up to 2 orders (to 2 different units) and choose which goes 1st and 2nd. Both 1st orders happen together, then both 2nd orders on the new board (a 2nd order is cancelled if its unit fell, its path got blocked or its target moved). The turn plays back with animation: units slide, fights flash and fallen units fade.
- Units ending on the same square as an enemy fight (as do two enemies swapping squares); higher power wins and a tie means both fall. A Siege Tower that stays put loses any fight.
- Cavalry start at 2 on a D4 and can pick up a Militia, Archer or Champion on their L route as a rider (their powers add, up to 12; if the Cavalry falls the rider falls too; a rider can dismount for 1 order). Only one Cavalry can be ordered per turn.
- On turns 3, 6, 9… a side that has lost Militia can use 1 order to place a new Militia on its starting Militia row.
- Archers shoot a square 2 away after movement, so targets can dodge; Militia never step onto enemies: they zap an enemy diagonally in front of them from where they stand (lowering its power, never below 1) or boost a friend next to them.
- Tapping a unit opens a card with its sprite, numbers, a movement diagram and its special effects (plus the order buttons for your own units).
- Win by defeating the enemy King. Modes: vs Computer (Easy / Normal), 2 players on one device with hidden orders and a pass-the-device screen, and Computer vs Computer. Battle log, balance test and notes tabs.

Source: `src/dicetactics/` (`engine.js` rules, `ai.js` computer player, `sprites.js` pixel art, `TacticsApp.jsx`).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Pushing to `main` (or running the workflow manually) builds the app with Vite and publishes `dist/` to GitHub Pages via `.github/workflows/deploy.yml`.

To enable Pages for this repository: **Settings → Pages → Source: GitHub Actions**.
