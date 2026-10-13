# Singapore P3 Math Quest

An endless-practice quiz app covering the Singapore Primary 3 Mathematics syllabus (place value, addition/subtraction, multiplication/division, fractions, money, measurement, time, geometry, and bar-model word problems), with multiple-choice and key-in answer modes, streak targets, a mistake review book, and a drawing scratchpad.

## Colour Castle (colour vision game)

A second app at `colorvision.html` (`/mathquizSGPrimary/colorvision.html` on Pages) that teaches students about colour blindness. Pick whose eyes to look through (Everyday Eyes, Weak Green, No Green, Weak Red, No Red, No Blue, Grey World — each also shows its medical name), then find the right door out of three. Correct picks move you on; a wrong pick ends the run and shows what you saw next to the real colours. The "Dot Test" tab has app-generated Ishihara-style dot plates (not the copyrighted originals) whose numbers vanish for specific eyes, with eye-swapping and a "who can see it?" comparison. The "Story" tab covers the history of colour blindness (a timeline from 1777 to today, past stigma, famous colour-blind people, famous mix-ups, and a myth-or-fact quiz). The "See the World" tab has a swipe-to-compare picture, "colour twins", and a full colour table for grown-ups. Source: `src/colorvision/`.

## AI Explorer

A closable intro header lists each world's "I can…" learning outcomes and a suggested path (Brain → Factory → Zoo → History → Quiz); worlds can be linked directly with `ai.html#history`, `#brain`, `#factory`, `#zoo` or `#quiz`. Every world shows when its information was last checked. "History of AI" covers 1950 to today (including AI winters and Singapore's milestones) with a playable ELIZA, and "Quiz Time" draws 8 random questions from a bank covering every world, with explanations and links back.

A third app at `ai.html` (`/mathquizSGPrimary/ai.html` on Pages) that teaches P4–P6 students how AI and LLMs work. "Inside the Brain" follows a sentence as token "bugs" through tokenizing, embeddings, attention and layers to next-word prediction (a real in-browser trigram model with a temperature slider), plus demos of diffusion pictures, video frames, note-by-note music, a vibe-coding agent loop, and hallucination. "The AI Factory" walks through how a model is made (data, pre-training, compute, human feedback, testing), visits an animated data centre with a per-question energy and water meter, and covers training costs, environmental trade-offs and Singapore's data centres, with sourced figures. It ends with a balanced look at AI slop, deepfakes and how to spot fakes. "The Model Zoo" explains why there are so many AIs (size, specialists, open vs closed, languages), tours model families from the US, Europe, China, Singapore and beyond, and charts the US–China race using Stanford AI Index data. Source: `src/ai/`.

## Lion City Planner (city-building game)

A fourth app at `city.html` (`/mathquizSGPrimary/city.html` on Pages): a cartoon isometric city builder set in Singapore, made for phones (landscape or portrait) and computers. You are the chief planner from 1965, starting with a small ready-made town: draw roads and MRT lines, zone HDB flats, private housing, commercial and industrial land, and place hawker centres, schools, polyclinics, police posts, fire stations, parks, power stations and water plants. Tools unlock by era (MRT 1987, NEWater 2003, Gardens by the Bay 2012…), and imported water ends in 2061, so you need the Four National Taps. A budget (summary, taxes and housing grants, department funding, full sheet) covers property tax, corporate tax, GST, land sales, subsidised HDB flats, tourism and reserves returns; drawing on past reserves needs the President's approval. Approval comes from housing, jobs, cost of living, services, transport, utilities and clean air, with 5-yearly reviews (no game over on Easy).

Phone-friendly controls: one finger moves the map, two fingers pinch to zoom, and building is tap-based (tap to place, or tap a start and an end) with a ✓ Build / Cancel step and Undo. A "next goal" card explains what to do. Settings include bigger text and buttons, building without confirmation, and turning off animation (cars, MRT trains, boats and clouds). Saves automatically to the device. Source: `src/city/` (`sim.js` simulation, `art.js` building art, `render.js` renderer, `agents.js` moving traffic).

## Lion City Mayor (regional city builder)

A fifth app at `mayor.html` (`/mathquizSGPrimary/mayor.html` on Pages), and the follow-on to Lion City Planner (which stays playable). You are mayor of one region of Singapore from 1965: Tampines / Changi, Jurong / Tuas, Central / CBD / Orchard, or Woodlands / Causeway, each with its own coastline, rivers, towns, kampongs, old roads and history.

- Free-flowing building: draw curved roads (tap a start and an end, then drag the bend handle); building lots appear along both sides and follow the curve. Paint zones over lots with one finger.
- Housing that evolves by decade: emergency flats, HDB slab blocks, point blocks, New Generation flats, modern estates and BTO towers, alongside terraces, condos, shophouses, malls, offices, farms, factories, JTC flats and business parks. Construction takes months (with cranes).
- Renewal decisions: improve or resettle kampongs, upgrade ageing blocks (from 1989) or redevelop them (en bloc / SERS from 1995), and conserve shophouses in the Central region. Each choice costs money and time, and demolition or resettlement upsets residents for a while.
- Towns: every region has four towns, each with its own happiness, resident feedback and vote.
- Elections every 6 years from 1968, with an election season in which you can make up to 3 pledges. Kept promises build trust; broken ones cost votes. Lose the region-wide vote (on Normal or Hard) and you're out.
- Region landmarks unlock by year (Changi Airport, Jurong Bird Park, Marina Bay Sands, Woodlands Checkpoint and more), plus traffic, MRT trains, boats and clouds.

Source: `src/mayor/` (`world.js` terrain, roads and lots; `sim.js` simulation; `art.js` and `render.js` drawing; `MapView.jsx` touch input).

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
